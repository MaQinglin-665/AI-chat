"use strict";
const assert = require('assert');
const { splitSentences, emotionFor, emotionForPerformance, performanceForSentence, createPlayer } = require('../web/galgamePlayer');
async function main() {
  assert.deepStrictEqual(splitSentences('你好！为什么？再见。'), ['你好！', '为什么？', '再见。']);
  assert.strictEqual(splitSentences('字'.repeat(200)).length, 3);
  assert.strictEqual(splitSentences('😀'.repeat(100)).join(''), '😀'.repeat(100));
  assert.strictEqual(emotionFor('我不开心。'), 'sad');
  assert.strictEqual(emotionFor('别生气。'), 'neutral');
  assert.strictEqual(emotionFor('为什么呢？'), 'confused');
  assert.strictEqual(emotionFor('嗯。', 'angry'), 'annoyed');
  assert.strictEqual(emotionForPerformance({emotion: 'happy'}, '他说他很生气。'), 'happy');
  assert.strictEqual(performanceForSentence([{text:'第一句。', performance:{emotion:'happy'}}], 0, '另一句。'), null);
  const frames = [], voices = []; let stops = 0;
  const player = createPlayer({ render: x => frames.push(x), stop: () => stops++,
    reducedMotion: () => true, speak: (text, opts) => { voices.push({text, ...opts}); return new Promise(() => {}); } });
  const abort = new AbortController();
  let settled = false;
  const first = player.play('太好了！为什么？难过。', {signal: abort.signal}).then(v => { settled = true; return v; });
  await Promise.resolve();
  assert.strictEqual(voices[0].text, '太好了！');
  assert.strictEqual(settled, false, 'must wait for manual advancement, not audio completion');
  player.next(); await Promise.resolve();
  assert(voices[0].signal.aborted, 'old synthesis must abort even when its promise never resolves');
  assert.strictEqual(voices[1].text, '为什么？');
  assert.strictEqual(frames.at(-1).emotion, 'confused');
  abort.abort();
  assert.strictEqual(await first, false);
  assert(voices[1].signal.aborted);
  assert.strictEqual(player.next(), false);
  const planned = player.play('他说他很生气。其实我很开心。', {performanceSegments:[
    {text:'他说他很生气。', performance:{emotion:'neutral'}},
    {text:'其实我很开心。', performance:{emotion:'happy'}}
  ]});
  await Promise.resolve();
  assert.strictEqual(frames.at(-1).emotion, 'neutral', 'an exact per-sentence plan must beat quoted-keyword fallback');
  player.next(); await Promise.resolve();
  assert.strictEqual(frames.at(-1).emotion, 'happy');
  player.cancel(); assert.strictEqual(await planned, false);
  const end = player.play('最后一句。'); await Promise.resolve(); player.next();
  assert.strictEqual(await end, true);
  assert.strictEqual(frames.at(-1).active, false);
  const replaced = player.play('旧回复。');
  const replacement = player.play('新回复。');
  assert.strictEqual(await replaced, false);
  player.cancel(); assert.strictEqual(await replacement, false);
  assert(stops >= 5);
  let rejectVoice = null, voiceUnavailable = 0, muteStops = 0, mutedSignal = null;
  const mutePlayer = createPlayer({
    render: () => {},
    stop: () => { muteStops++; },
    reducedMotion: () => true,
    voiceUnavailable: () => { voiceUnavailable++; },
    speak: (_text, opts) => {
      mutedSignal = opts.signal;
      return new Promise((_resolve, reject) => { rejectVoice = reject; });
    }
  });
  const mutedTurn = mutePlayer.play('静音后仍可继续阅读。');
  await Promise.resolve();
  mutePlayer.stopVoice();
  assert(mutedSignal.aborted, 'muting must cancel the in-flight sentence request');
  assert(mutePlayer.isPlaying(), 'muting must not discard the visible sentence');
  rejectVoice(new Error('late TTS failure'));
  await Promise.resolve();
  assert.strictEqual(voiceUnavailable, 0, 'a cancelled voice request must not overwrite the dialogue status');
  mutePlayer.next();
  assert.strictEqual(await mutedTurn, true);
  assert(muteStops >= 1, 'muting must stop already-started playback');
  console.log('Galgame sentence, emotion, cancellation, replacement and completion tests passed');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
