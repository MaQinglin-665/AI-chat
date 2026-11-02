const assert=require("node:assert/strict");
const fs=require("node:fs/promises"),os=require("node:os"),path=require("node:path");
const {createHash}=require("node:crypto");
const {Readable}=require("node:stream");
const {allowedRedirect,install}=require("../electron/roomComponent");
const hash=s=>createHash("sha256").update(s).digest("hex");
(async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"room-install-"));
  try {
    const pin={size:3,sha256:hash("zip"),files:{"Room.exe":{size:3,sha256:hash("exe")},"Room.pck":{size:3,sha256:hash("pck")}}};
    let extracted=0;
    async function unpack(_archive,dir){extracted++;await fs.mkdir(dir);await fs.writeFile(path.join(dir,"Room.exe"),"exe");await fs.writeFile(path.join(dir,"Room.pck"),"pck");}
    assert.equal(await install(root,async()=>false,()=>assert.fail(),unpack,pin),null);
    await assert.rejects(install(root,async()=>true,()=>Readable.from(["bad"]),unpack,pin),/SHA256/);
    assert.equal(extracted,0);
    assert.deepEqual(await fs.readdir(path.join(root,"room-components")),[]);
    const exe=await install(root,async size=>size===3,()=>Readable.from(["zip"]),unpack,pin);
    assert.equal(await install(root,()=>assert.fail(),()=>assert.fail(),unpack,pin),exe);
    const dir=path.dirname(exe);
    for(const corrupt of [
      d=>fs.writeFile(path.join(d,"Room.exe"),"bad"),
      d=>fs.unlink(path.join(d,"Room.pck")),
      d=>fs.writeFile(path.join(d,"extra.dll"),"bad"),
      d=>fs.mkdir(path.join(d,"extra")),
      d=>fs.symlink(root,path.join(d,"linked"),"junction")
    ]) {
      await corrupt(dir);
      await assert.rejects(install(root,()=>assert.fail(),()=>assert.fail(),unpack,pin),/重新下载/);
      await assert.rejects(install(root,async()=>true,()=>Readable.from(["zip"]),async(a,d)=>{
        await unpack(a,d); await corrupt(d);
      },pin),/校验失败/);
      assert.deepEqual(await fs.readdir(path.dirname(dir)),[]);
      await install(root,async()=>true,()=>Readable.from(["zip"]),unpack,pin);
    }
    assert.equal(allowedRedirect("https://objects.githubusercontent.com/github-production-release-asset/1217591333/a"),true);
    assert.equal(allowedRedirect("https://objects.githubusercontent.com/github-production-release-asset/1/a"),false);
    for(const url of ["http://release-assets.githubusercontent.com/github-production-release-asset/1217591333/a",
      "https://evil.com/test","https://release-assets.githubusercontent.com/github-production-release-asset/2/a"])assert.equal(allowedRedirect(url),false);
    assert.equal(allowedRedirect("https://release-assets.githubusercontent.com/github-production-release-asset/1217591333/a"),true);
    console.log("[OK] component consent, digest rejection, clean staging, cache verification and CDN scope");
  } finally {await fs.rm(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
