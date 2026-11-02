const assert = require("node:assert/strict");
const {once} = require("node:events");
const {spawn} = require("node:child_process");
const http = require("node:http");
const {openRoom} = require("../electron/roomSession");

(async()=>{
  const upstream=http.createServer((req,res)=>{
    assert.equal(req.headers.authorization,"Bearer backend-only");
    assert.equal(req.url,"/api/room/turn");
    req.resume();res.end(JSON.stringify({reply:"你好"}));
  });
  upstream.listen(0,"127.0.0.1");await once(upstream,"listening");
  let endpoint,boot,child,closed=0,turns=[],receipts=[];
  const session=await openRoom({backend:"http://127.0.0.1:"+upstream.address().port,apiToken:"backend-only",
    command:process.execPath,args:["-e","setInterval(()=>{},999)"],env:{},history:[],onClosed:()=>closed++,
    onTurn:(...pair)=>turns.push(pair),onReceipt:line=>receipts.push(line),launch:(cmd,args,opts)=>{
      assert.ok(!JSON.stringify(args).includes("backend-only"));
      assert.ok(!Object.values(opts.env).includes("backend-only"));
      endpoint="http://127.0.0.1:"+opts.env.XINYU_ROOM_PORT;boot=opts.env.XINYU_ROOM_TICKET;
      child=spawn(cmd,args,opts);return child;
    }});
  async function post(route,bearer,origin=endpoint,body={message:"你好",world:{user_state:"stand"}}) {
    return fetch(endpoint+route,{method:"POST",headers:{Authorization:"Bearer "+bearer,Origin:origin},body:JSON.stringify(body)});
  }
  try {
    assert.equal((await post("/api/room/session",boot,"http://example.invalid")).status,403);
    const exchanged=await post("/api/room/session",boot);assert.equal(exchanged.status,200);
    const {token}=await exchanged.json();
    assert.notEqual(token,boot);
    assert.equal((await post("/api/room/alive",token)).status,200);
    assert.equal((await post("/api/room/session",boot)).status,403);
    assert.equal((await post("/api/room/turn",boot)).status,403);
    assert.equal((await post("/api/config",token)).status,403);
    assert.equal((await post("/api/room/turn",token)).status,200);
    assert.equal((await post("/api/room/receipt",token,endpoint,{steps:[{action:"sit_on",target:"bed_edge_seat"}]})).status,200);
    for(const experience of ["read","high_five","irrelevant free text"]) {
      assert.equal((await post("/api/room/receipt",token,endpoint,{experience})).status,200);
    }
    assert.deepEqual(receipts,[]);
    assert.deepEqual(turns,[["你好","你好"]]);
    const done=once(child,"exit");session.close();await done;
    assert.equal(closed,1);
    assert.deepEqual(receipts.at(-1),{user_sat:false,steps:["坐到床沿","read","high_five"]});
    await assert.rejects(post("/api/room/turn",token));
    assert.throws(()=>process.kill(child.pid,0));
  } finally {session.close();upstream.close();upstream.closeAllConnections();}
  console.log("[OK] one-use room ticket, route scope, history and child shutdown");
})().catch(e=>{console.error(e);process.exitCode=1;});
