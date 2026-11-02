const fs = require("node:fs");
const path = require("node:path");
const roles = {companion:"千驮谷筱",player:"Vita"};
function preference(root,role) {
  if (!Object.hasOwn(roles,role)) throw Error("未知房间角色");
  return path.join(root,"room-"+role+"-vrm.path");
}
function read(root,role) {
  try { return fs.readFileSync(preference(root,role),"utf8"); }
  catch (error) { if (error.code==="ENOENT") return ""; throw error; }
}
function save(root,role,file) {
  const dest=preference(root,role);
  if (!file) { fs.rmSync(dest,{force:true}); return roles[role]; }
  if (!path.isAbsolute(file)||/^[/\\]{2}/.test(file)||path.extname(file).toLowerCase()!==".vrm")
    throw Error("请选择本机 .vrm 文件");
  const stat=fs.statSync(file);
  if (!stat.isFile()||stat.size<20||stat.size>200*1024*1024) throw Error("模型大小必须在 200 MiB 以内");
  fs.writeFileSync(dest,file,{mode:0o600});
  return path.basename(file);
}
function labels(root) {
  return Object.fromEntries(Object.keys(roles).map(role=>[role,path.basename(read(root,role))||roles[role]]));
}
function environment(root) {
  return {XINYU_ROOM_COMPANION_VRM:read(root,"companion"),XINYU_ROOM_PLAYER_VRM:read(root,"player")};
}
module.exports={save,labels,environment};
