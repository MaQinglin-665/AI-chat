const assert=require("node:assert/strict");
const fs=require("node:fs");
const storage=require("../web/storageController");
const data=[
 {role:"user",content:"我们在房间里玩吧"},
 {role:"assistant",content:"【房间离场记录】没有你入座的记录。我的已完成动作：走到书架。"},
 {role:"assistant",content:"刚才在房间里，我走到书架，看向书架。"},
 {role:"assistant",content:"刚才在房间里，我走到书架的时候想起一件事。"}
];
let persisted=false,rendered=[];
const state={};
storage.loadChatHistory(state,{
 windowObject:{localStorage:{getItem:()=>JSON.stringify(data)}},
 saveChatHistory:()=>{persisted=true;},
 renderChatHistoryFromState:()=>{rendered=state.chatRecords},
 syncConversationHistoryFromChatRecords:()=>{state.history=state.chatRecords}
});
assert.equal(persisted,true);
assert.deepEqual(rendered.map(x=>x.content),[data[0].content,data[3].content]);
const main=fs.readFileSync("electron/main.js","utf8");
assert.match(main,/const roomEnabled = \(\) => fs\.existsSync/);
assert.ok(!main.includes('const roomEnabled = roomDev'));
assert.ok(main.includes('webContents.send("room-context",facts)'));
assert.ok(!main.includes('onReceipt:reply'));
const chat=fs.readFileSync("web/chat.js","utf8");
assert.ok(chat.includes('state.roomRecap=facts'));
assert.ok(!chat.includes('appendMessage("assistant",facts'));
console.log("[OK] legacy internal records removed before rendering; hidden facts use a separate IPC channel; default-off switch");
