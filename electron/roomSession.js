const http = require("node:http");
const crypto = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const fresh = () => crypto.randomBytes(32).toString("hex");
function killTree(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode) return;
  if (process.platform === "win32") spawnSync("taskkill.exe", ["/pid", String(child.pid), "/t", "/f"], {windowsHide:true, stdio:"ignore"});
  else child.kill();
}
// One synthesizer per room. Requests are bounded and answered in input order.
function warmVoice() {
  const readline=require("node:readline");
  const env=Object.fromEntries(["SystemRoot","WINDIR","PATH","TEMP","TMP","USERPROFILE","APPDATA","LOCALAPPDATA"].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
  const encoded=Buffer.from(fs.readFileSync(path.join(__dirname,"roomSpeech.ps1"),"utf8"),"utf16le").toString("base64");
  const proc=spawn("powershell.exe",["-NoProfile","-NonInteractive","-EncodedCommand",encoded],{windowsHide:true,env,stdio:["pipe","pipe","ignore"]});
  const waiting=[];
  let closed=false;
  function close() {
    if(closed)return;
    closed=true;
    for(const item of waiting.splice(0)){clearTimeout(item.timer);item.reject(Error("voice_unavailable"));}
    killTree(proc);
  }
  readline.createInterface({input:proc.stdout}).on("line",line=>{
    const item=waiting.shift();
    if(!item)return;
    clearTimeout(item.timer);
    try {
      const v=JSON.parse(line);
      item.resolve({audio:Buffer.from(v.audio,"base64"),voice:v.voice,matched:v.matched,visemes:(v.visemes||[]).slice(0,350).map(s=>{const [t,vowel]=s.split(":");return [Number(t),vowel];})});
    } catch {item.reject(Error("voice_unavailable"));}
  });
  proc.on("error",close);proc.on("exit",close);proc.stdin.on("error",close);
  return {close,synthesize(text,voice) {
    return new Promise((resolve,reject)=>{
      if(closed || waiting.length>=4)return reject(Error("voice_unavailable"));
      waiting.push({resolve,reject,timer:setTimeout(close,20000)});
      proc.stdin.write(JSON.stringify({text,voice})+"\n");
    });
  }};
}
async function openRoom({backend, apiToken, command, args, env, provider, voice, history, onTurn, onReceipt, onClosed, launch=spawn}) {
  if (!apiToken || new URL(backend).hostname!=="127.0.0.1") throw Error("房间需要已鉴权的本机后端");
  const ticket=fresh(), session=fresh(), expires=Date.now()+30000;
  let redeemed=false, closed=false, child, timer, nativeVoice;
  let turns=0, observedUser=false, userSat=false;
  const experiences=new Set(["read", "nap", "tidy", "window_idle", "shared_window", "stretch", "yawn", "called", "gave", "offered", "head_pat", "high_five", "woke"]);
  const completed=[];
  function observePosture(state) {
    if(["sit","stand","walk","typing"].includes(state)) {
      observedUser=true;
      if(state==="sit")userSat=true;
    }
  }
  const abort=new AbortController();
  const allowed=new Set(["/api/room/intent","/api/room/turn","/api/room/receipt","/api/room/alive","/api/tts"]);
  const server=http.createServer(async (req,res) => {
    function respond(code,value) { res.writeHead(code,{"Content-Type":"application/json"}); res.end(JSON.stringify(value)); }
    try {
      const origin="http://127.0.0.1:"+server.address().port;
      if(req.method!=="POST" || req.headers.origin!==origin || req.headers.host!==new URL(origin).host) return respond(403,{});
      const boot=req.url==="/api/room/session";
      const valid=boot ? !redeemed && Date.now()<expires : redeemed && allowed.has(req.url);
      if(!valid || req.headers.authorization!=="Bearer "+(boot?ticket:session)) return respond(403,{});
      if(boot) { redeemed=true; clearTimeout(timer); req.resume(); return respond(200,{token:session,history}); }
      if(req.url==="/api/room/alive"){req.resume();return respond(200,{ok:true});}
      const limit=req.url==="/api/room/turn"?32768:16384;
      const parts=[];let size=0;
      for await(const part of req) { size+=part.length; if(size>limit)return respond(413,{});parts.push(part); }
      const body=JSON.parse(Buffer.concat(parts).toString("utf8"));
      if(req.url==="/api/room/turn") observePosture(body.world?.user_state);
      if(req.url==="/api/room/intent") observePosture(body.changes?.user_state);
      if(req.url==="/api/room/receipt") {
        observePosture(body.user_state);
        const places={window:"窗边",sofa:"沙发",chair:"椅子",desk:"书桌",shelf:"书架",user:"你身边",bed_edge_seat:"床沿"};
        const actions={go_to:"走到",look_at:"看向",sit_on:"坐到"};
        const parts=(Array.isArray(body.steps)?body.steps:[]).slice(0,5).filter(s=>Object.hasOwn(places,s?.target)&&Object.hasOwn(actions,s?.action)).map(s=>actions[s.action]+places[s.target]);
        if(experiences.has(body.experience)) parts.push(body.experience);
        if(parts.length) {
          for (const fact of parts) {
            const prior=completed.indexOf(fact);
            if (prior>=0) completed.splice(prior,1);
            completed.push(fact);
          }
          if(completed.length>32)completed.splice(0,completed.length-32);

        }
        return respond(200,{ok:true});
      }
      if(req.url==="/api/tts" && provider==="browser") {
        const result=await nativeVoice.synthesize(String(body.text||"").slice(0,400),voice);
        res.writeHead(200,{"Content-Type":"audio/wav","X-Room-Voice":encodeURIComponent(result.voice),"X-Room-Match":String(result.matched),"X-Room-Visemes":JSON.stringify(result.visemes)});
        return res.end(result.audio);
      }
      const upstream=await fetch(backend+req.url,{method:"POST",redirect:"error",signal:AbortSignal.any([abort.signal,AbortSignal.timeout(40000)]),
        headers:{Origin:backend,Authorization:"Bearer "+apiToken,"Content-Type":"application/json"},body:JSON.stringify(body)});
      if (req.url==="/api/room/turn" && upstream.ok && body.stream===true &&
          upstream.headers.get("content-type")?.startsWith("application/x-ndjson")) {
        res.writeHead(200,{"Content-Type":"application/x-ndjson"});
        const decoder=new TextDecoder();
        let pending="";
        for await (const chunk of upstream.body) {
          pending+=decoder.decode(chunk,{stream:true});
          let index;
          while ((index=pending.indexOf("\n"))>=0) {
            const line=pending.slice(0,index);
            pending=pending.slice(index+1);
            const event=JSON.parse(line);
            if (event.turn?.reply && !closed) { turns++; onTurn(body.message,event.turn.reply); }
            res.write(line+"\n");
          }
          if (pending.length>8192) throw Error("invalid room stream");
        }
        return res.end();
      }
      const data=Buffer.from(await upstream.arrayBuffer());
      if(upstream.ok && req.url==="/api/room/turn") {
        const {reply}=JSON.parse(data.toString("utf8"));
        if(reply && !closed) { turns++; onTurn(body.message,reply); }
      }
      res.writeHead(upstream.status,{"Content-Type":upstream.headers.get("content-type")||"application/octet-stream"});
      res.end(data);
    } catch { if(!res.headersSent)respond(503,{error:"room_unavailable"});else res.end(); }
  });
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
  function close() {
    if(closed)return;
    closed=true;clearTimeout(timer);abort.abort();server.close();server.closeAllConnections();
    killTree(child);
    nativeVoice?.close();
    if((turns || completed.length) && observedUser) {
      onReceipt?.({user_sat:userSat,steps:completed.slice()});
    }
    onClosed();
  }
  try {
    if(provider==="browser")nativeVoice=warmVoice();
    child=launch(command,args,{windowsHide:false,env:{...env,XINYU_ROOM_PORT:String(server.address().port),XINYU_ROOM_TICKET:ticket},stdio:"ignore"});
    child.once("exit",close);child.once("error",close);
    await new Promise((resolve,reject)=>{child.once("spawn",resolve);child.once("error",reject);});
    timer=setTimeout(()=>{if(!redeemed)close();},30000);
    return {close,pid:child.pid};
  } catch(e){close();throw e;}
}
module.exports={openRoom,warmVoice};
