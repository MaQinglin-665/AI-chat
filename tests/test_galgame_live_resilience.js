"use strict";
const assert = require("assert");
const {streamAssistantReply} = require("../web/chatApi");
async function main() {
  let requests = 0, cancelled = 0;
  await assert.rejects(streamAssistantReply({message:"测试",galgame:{enabled:true,character:"claude"}},()=>{}, {
    authFetch:async()=>{requests++; return {ok:true,status:200,body:{getReader:()=>({
      read:async()=>{throw new Error("upstream stopped before first complete sentence");},
      cancel:async()=>{cancelled++;}
    })}};}
  }),/逐句对话/);
  assert.strictEqual(requests,1,"a slow Galgame response must not silently cause a second model request");
  assert.strictEqual(cancelled,1);
  console.log("Galgame live latency resilience passed");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
