"use strict";
const assert = require("assert");
const {normalizeCompanionTurn} = require("../web/chatApi");
const {createPlayer, emotionForPerformance} = require("../web/galgamePlayer");

async function main() {
  const reply = "😀Hello. 我想一想。最后一句。";
  const plan = [
    {start:0,end:7,text:"😀Hello.",performance:{emotion:"surprised",action:"none"}},
    {start:8,end:13,text:"我想一想。",performance:{emotion:"thinking",action:"think"}}
  ];
  const raw = {version:1,id:"test",reply_text:reply,spoken_text:reply,performance_segments:plan};
  const turn = normalizeCompanionTurn(raw, reply);
  assert.strictEqual(turn.performance_segments.length, 2, "Unicode offsets survive normalization");
  assert.deepStrictEqual(normalizeCompanionTurn({...raw,performance_segments:[{...plan[0],text:"错句"}]},reply).performance_segments, []);
  assert.deepStrictEqual(normalizeCompanionTurn({...raw,performance_segments:[plan[1],plan[0]]},reply).performance_segments, []);
  const frames = [];
  const player = createPlayer({render:frame=>frames.push(frame),speak:()=>true,reducedMotion:()=>true});
  const done = player.play(reply, {performanceSegments:turn.performance_segments});
  assert.strictEqual(frames.at(-1).text,"😀Hello.");
  assert.strictEqual(frames.at(-1).emotion,"surprised");
  player.next();
  assert.strictEqual(frames.at(-1).text,"我想一想。");
  assert.strictEqual(frames.at(-1).emotion,"thinking");
  player.next();
  assert.strictEqual(frames.at(-1).text,"最后一句。", "bounded plans must not discard unplanned text");
  player.next(); assert.strictEqual(await done,true);
  assert.strictEqual(emotionForPerformance({emotion:"neutral",action:"wave"},"你好"),"greeting");
  assert.strictEqual(emotionForPerformance({emotion:"sad",action:"wave"},"再见"),"sad");
  console.log("Galgame performance transport passed");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
