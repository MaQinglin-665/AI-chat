"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const avatars = require("../electron/roomAvatars");
const root = fs.mkdtempSync(path.join(os.tmpdir(),"room-avatar-"));
const model = path.join(root,"测试.VRM");
try {
  fs.writeFileSync(model,Buffer.alloc(20));
  assert.deepEqual(avatars.labels(root),{companion:"千驮谷筱",player:"Vita"});
  assert.equal(avatars.save(root,"player",model),"测试.VRM");
  assert.equal(avatars.environment(root).XINYU_ROOM_PLAYER_VRM,model);
  assert.equal(fs.readFileSync(path.join(root,"room-player-vrm.path"),"utf8"),model);
  for (const bad of ["../bad.vrm","//server/share/a.vrm",model+".txt"]) {
    assert.throws(()=>avatars.save(root,"companion",bad));
  }
  fs.truncateSync(model,201*1024*1024);
  assert.throws(()=>avatars.save(root,"companion",model));
  assert.throws(()=>avatars.save(root,"../escape",model));
  assert.equal(avatars.save(root,"player",""),"Vita");
} finally {
  for (const name of fs.readdirSync(root)) fs.unlinkSync(path.join(root,name));
  fs.rmdirSync(root);
}
