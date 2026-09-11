"use strict";
const assert = require("assert");
const {createInitialState} = require("../web/chatState");
const {createController} = require("../web/chatReplyController");
const {createPlayer} = require("../web/galgamePlayer");

async function main() {
  const state=createInitialState(); state.history=[];
  let speechCount=0, replayCount=0;
  const player=createPlayer({render:()=>{},reducedMotion:()=>true,
    speak:()=>{speechCount++;return true;}});
  let activeStream;
  const windowObject={setTimeout,clearTimeout,AbortController,
    TaffyGalgame:{isActive:()=>true,getContext:()=>({enabled:true,character:"gpt"}),
      beginStream:options=>{
        activeStream=player.beginStream(options);
        const finish=activeStream.finish;
        activeStream.finish=text=>{const ok=finish(text);player.next();return ok;};
        return activeStream;
      },
      playReply:()=>{replayCount++;return true;}},
    TaffyModules:{chatApi:{streamAssistantReply:async (payload,onDelta,options)=>{
      assert.strictEqual(payload.galgame.character,"gpt");
      assert.strictEqual(options.firstDeltaTimeoutMs,45000,"validated JSONL sentences need time beyond the legacy 12-second first-token window");
      onDelta("第一句。",{index:0,text:"第一句。",performance:{emotion:"serious",sprite:"neutral"}});
      await Promise.resolve();
      assert.strictEqual(speechCount,1,"request controller plays before API completes");
      player.next();
      onDelta("第二句。",{index:1,text:"第二句。",performance:{emotion:"thinking",sprite:"thinking"}});
      await Promise.resolve();
      return "第一句。第二句。";
    }}}};
  const controller=createController({state,ui:{},windowObject,
    appendMessage:()=>({dataset:{},classList:{add(){},remove(){}},querySelector(){return null;},remove(){}})});
  assert.strictEqual(await controller.requestAssistantReply("你好",{interruptActive:false}),true);
  assert.strictEqual(speechCount,2);
  assert.strictEqual(replayCount,0,"done must not replay already streamed sentences");
  console.log("Galgame request-to-player streaming passed");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
