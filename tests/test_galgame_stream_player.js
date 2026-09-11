"use strict";
const assert = require("assert");
const {createPlayer} = require("../web/galgamePlayer");
async function main() {
  const frames=[], voices=[], scenes=[];
  const player=createPlayer({render:f=>frames.push(f),scene:s=>scenes.push(s),reducedMotion:()=>true,
    speak:(text,options)=>{voices.push({text,...options});return new Promise(()=>{});}});
  const abort=new AbortController();
  const stream=player.beginStream({signal:abort.signal});
  assert(stream.append({index:0,text:"到公园了。",scene:"park-spring",performance:{emotion:"happy",sprite:"happy"}}));
  await Promise.resolve();
  assert.strictEqual(voices.length,1,"first sentence speaks before stream finishes");
  assert.deepStrictEqual(scenes,["park-spring"]);
  player.next(); assert(voices[0].signal.aborted); assert(frames.at(-1).waiting);
  assert.strictEqual(player.next(),false,"repeated next cannot skip a sentence still loading");
  assert(stream.append({index:1,text:"坐一会儿吧。",performance:{emotion:"neutral",sprite:"listening"}}));
  await Promise.resolve(); assert.strictEqual(voices.length,2);
  assert.strictEqual(frames.at(-1).sprite,"listening");
  assert(stream.finish("到公园了。坐一会儿吧。"));
  player.next(); assert.strictEqual(await stream.done,true);
  const stale=player.beginStream();
  stale.append({index:0,text:"旧句。"});
  const replacement=player.beginStream();
  assert.strictEqual(await stale.done,false);
  assert.strictEqual(stale.append({index:1,text:"迟到。"}),false);
  assert.strictEqual(stale.finish("旧句。"),false);
  replacement.append({index:0,text:"新句。"});
  assert.strictEqual(replacement.finish("不匹配的最终回复"),false);
  assert.strictEqual(await replacement.done,false);
  const waiting=player.beginStream();waiting.append({index:0,text:"一句。"});player.next();
  assert(waiting.finish("一句。"));assert.strictEqual(await waiting.done,true);
  const cancelled=player.beginStream({signal:abort.signal});abort.abort();
  assert.strictEqual(await cancelled.done,false);
  console.log("Galgame incremental playback passed");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
