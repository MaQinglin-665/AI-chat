const assert=require("node:assert/strict");
const fs=require("node:fs/promises"),os=require("node:os"),path=require("node:path");
const {createHash}=require("node:crypto");
const {Readable}=require("node:stream");
const {allowedRedirect,install}=require("../electron/roomComponent");
const hash=s=>createHash("sha256").update(s).digest("hex");
(async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"room-install-"));
  try {
    const pin={size:3,sha256:hash("zip"),files:{"Room.exe":hash("exe"),"Room.pck":hash("pck")}};
    let extracted=0;
    async function unpack(_archive,dir){extracted++;await fs.mkdir(dir);await fs.writeFile(path.join(dir,"Room.exe"),"exe");await fs.writeFile(path.join(dir,"Room.pck"),"pck");}
    assert.equal(await install(root,async()=>false,()=>assert.fail(),unpack,pin),null);
    await assert.rejects(install(root,async()=>true,()=>Readable.from(["bad"]),unpack,pin),/SHA256/);
    assert.equal(extracted,0);
    assert.deepEqual(await fs.readdir(path.join(root,"room-components")),[]);
    const exe=await install(root,async size=>size===3,()=>Readable.from(["zip"]),unpack,pin);
    assert.equal(await install(root,()=>assert.fail(),()=>assert.fail(),unpack,pin),exe);
    await fs.writeFile(exe,"bad");
    assert.equal(await install(root,async()=>false,()=>assert.fail(),unpack,pin),null);
    for(const url of ["http://release-assets.githubusercontent.com/github-production-release-asset/1217591333/a",
      "https://evil.com/test","https://release-assets.githubusercontent.com/github-production-release-asset/2/a"])assert.equal(allowedRedirect(url),false);
    assert.equal(allowedRedirect("https://release-assets.githubusercontent.com/github-production-release-asset/1217591333/a"),true);
    console.log("[OK] component consent, digest rejection, clean staging, cache verification and CDN scope");
  } finally {await fs.rm(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
