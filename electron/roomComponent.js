"use strict";

const {createHash} = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {execFile} = require("node:child_process");
const {promisify} = require("node:util");
const {Transform} = require("node:stream");
const {pipeline} = require("node:stream/promises");
const {setTimeout:delay} = require("node:timers/promises");

const PIN = Object.freeze({
  url: "https://github.com/MaQinglin-665/AI-chat/releases/download/room-component-v1.0.0-rc1/xinyu-room-windows-x64.zip",
  size: 74047690,
  sha256: "90884a8ce3793c53f84c9baf8828c038c1ce6b1fb947e404e558461bc4778fdd",
  files: {"Room.exe":"91724f15024a3a545e28ccd83134403d31ce2323a38e51c95e4dfa282f732ab6", "Room.pck":"8b45df980e36dce28a05e5879a4990071fea68eafdc16dc0ce0734880e17232e"}
});

function allowedRedirect(location) {
  const url = new URL(location);
  return url.protocol==="https:" && !url.username && !url.password && !url.port &&
    url.hostname==="release-assets.githubusercontent.com" &&
    url.pathname.startsWith("/github-production-release-asset/1217591333/");
}

function releaseLocation(net) {
  return new Promise((resolve,reject)=>{
    const req=net.request({url:PIN.url,method:"HEAD",redirect:"manual",useSessionCookies:false});
    const timer=setTimeout(()=>{reject(Error("房间组件连接超时"));req.abort();},45000);
    req.once("redirect",(_status,_method,location)=>{
      if(allowedRedirect(location)) resolve(location);
      else reject(Error("房间组件下载地址校验失败"));
      clearTimeout(timer);req.abort();
    });
    req.once("response",()=>{clearTimeout(timer);reject(Error("房间组件未返回 Release 附件地址"));req.abort();});
    req.once("error",err=>{clearTimeout(timer);reject(err);});
    req.end();
  });
}

function readRange(net,url,start,end,signal) {
  return new Promise((resolve,reject)=>{
    const req=net.request({url,method:"GET",redirect:"error",useSessionCookies:false});
    const chunks=[];let size=0,timer;
    function cleanup(){clearTimeout(timer);signal.removeEventListener("abort",cancel);}
    function cancel(){cleanup();reject(Error("房间组件分段下载中断："+start));req.abort();}
    function deadline(){clearTimeout(timer);timer=setTimeout(cancel,60000);}
    if(signal.aborted)return cancel();
    signal.addEventListener("abort",cancel,{once:true});
    req.setHeader("Cache-Control","no-cache");
    req.setHeader("Range","bytes="+start+"-"+end);
    deadline();
    req.on("error",err=>{cleanup();reject(err);});
    req.once("response",res=>{
      const range=res.headers["content-range"];
      if(res.statusCode!==206 || (Array.isArray(range)?range[0]:range)!=="bytes "+start+"-"+end+"/"+PIN.size)return cancel();
      res.on("data",chunk=>{
        size+=chunk.length;
        if(size>end-start+1)return cancel();
        chunks.push(chunk);deadline();
      });
      res.on("aborted",cancel);
      res.on("error",err=>{cleanup();reject(err);});
      res.on("end",()=>{
        cleanup();
        if(size===end-start+1)resolve(Buffer.concat(chunks));
        else reject(Error("房间组件下载不完整"));
      });
    });
    req.end();
  });
}

async function* openAsset(net) {
  // Only the fixed project Release may select the initial signed CDN URL.
  // Four bounded ranges avoid restarting a large download on a slow link.
  const url=await releaseLocation(net);
  const block=1024*1024;
  const controller=new AbortController();
  try {
    for(let offset=0;offset<PIN.size;offset+=4*block) {
      const group=[];
      for(let start=offset;start<Math.min(PIN.size,offset+4*block);start+=block) {
        const end=Math.min(PIN.size,start+block)-1;
        group.push((async()=>{
          for(let attempt=1; ;attempt++) {
            try { return await readRange(net,url,start,end,controller.signal); }
            catch(error) {
              if(attempt>=5 || controller.signal.aborted) throw error;
              await delay(10000,undefined,{signal:controller.signal});
            }
          }
        })());
      }
      for(const chunk of await Promise.all(group))yield chunk;
    }
  } finally {controller.abort();}
}

async function verifiedFile(file, expected) {
  try {
    const st=await fs.promises.lstat(file);
    if (!st.isFile()) return false;
    const hash=createHash("sha256");
    for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
    return hash.digest("hex")===expected;
  } catch(error) {
    if(error.code==="ENOENT")return false;
    throw error;
  }
}

async function unpack(archive, dest) {
  // Static command; paths travel in the child environment, never as shell source.
  await promisify(execFile)("powershell.exe",["-NoProfile","-NonInteractive","-Command",
    "$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath $env:XINYU_ROOM_ARCHIVE -DestinationPath $env:XINYU_ROOM_STAGE"],
    {windowsHide:true,timeout:120000,env:{SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,TMP:process.env.TMP,
      XINYU_ROOM_ARCHIVE:archive,XINYU_ROOM_STAGE:dest}});
}

async function install(root, confirm, download, extract, pin) {
  const parent=path.join(root,"room-components");
  const destination=path.join(parent,pin.sha256);
  async function valid(dir) {
    for(const [name,digest] of Object.entries(pin.files)) {
      if (!await verifiedFile(path.join(dir,name),digest)) return false;
    }
    return true;
  }
  if(await valid(destination)) return path.join(destination,"Room.exe");
  if (!await confirm(pin.size)) return null;
  await fs.promises.mkdir(parent,{recursive:true});
  const scratch=await fs.promises.mkdtemp(path.join(parent,".install-"));
  try {
    const archive=path.join(scratch,"room.zip"), stage=path.join(scratch,"files");
    const hash=createHash("sha256"); let size=0;
    await pipeline(await download(),new Transform({transform(chunk,_encoding,done){
      size+=chunk.length;
      if(size>pin.size) return done(Error("房间组件大小超出预期"));
      hash.update(chunk); done(null,chunk);
    }}),fs.createWriteStream(archive,{flags:"wx"}));
    if(size!==pin.size || hash.digest("hex")!==pin.sha256) throw Error("房间组件 SHA256 校验失败");
    await extract(archive,stage);
    if(!await valid(stage)) throw Error("房间程序或资源校验失败");
    await fs.promises.rm(destination,{recursive:true,force:true});
    await fs.promises.rename(stage,destination);
    return path.join(destination,"Room.exe");
  } finally {await fs.promises.rm(scratch,{recursive:true,force:true});}
}
function ensureInstalled(userData,confirm,net) {
  return install(userData,confirm,()=>openAsset(net),unpack,PIN);
}
module.exports={ensureInstalled,allowedRedirect,install};
