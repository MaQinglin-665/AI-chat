#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const indexSource = read("web", "index.html");
const motionCss = read("web", "stageMotion.css");

assert.ok(indexSource.includes('href="./stageMotion.css"'), "the state-motion layer should load on the desktop stage");
assert.ok(indexSource.indexOf('href="./stageMotion.css"') > indexSource.indexOf('href="./controlCenterPolish.css"'), "stage motion should remain the final stage visual layer");
assert.ok(indexSource.includes('class="stage-state-pulse"'), "the header should expose state-linked voice bars");
assert.ok(!indexSource.includes('class="stage-state-aurora"'), "the retired header sweep should be absent from markup");
assert.ok(!indexSource.includes('class="composer-state-flow"'), "the retired composer sweep should be absent from markup");
assert.ok(indexSource.includes('src="./assets/icons/phosphor/cat.svg"'), "the header mascot should use the rounder Phosphor cat asset");
assert.ok(indexSource.includes('class="xinyu-stage-brand-spark"'), "the header mascot should include one restrained sparkle badge");
assert.ok(indexSource.includes('class="kawaii-doodle kawaii-doodle-cat"'), "the lower mascot should remain available as a decorative stage anchor");
assert.ok(!motionCss.includes('.hero-card > :not('), "the motion layer must not rewrite positioning for every direct header child");
assert.ok(motionCss.includes('.hero-card > .hero-svg-ears'), "the titlebar-overlapping decorative ears should be explicitly controlled");
assert.ok(motionCss.includes('display: none !important'), "the duplicate header ears should not protrude above the clean brand rail");

for (const state of ["listening", "thinking", "speaking", "error"]) {
  assert.ok(motionCss.includes(`data-presence="${state}"`), `${state} should have a deliberate stage treatment`);
}

assert.ok(motionCss.includes('.stage-composer:has(#chat-input:not(:placeholder-shown)) #send-btn'), "typed input should visibly prepare the send action");
assert.ok(!motionCss.includes('xinyu-state-sweep'), "continuous header light sweeps should be retired");
assert.ok(!motionCss.includes('xinyu-composer-flow'), "continuous composer light sweeps should be retired");
assert.ok(!motionCss.includes('xinyu-idle-rim'), "continuous rim breathing should be retired");
assert.ok(motionCss.includes('url("./assets/icons/phosphor/cat.svg")'), "the lower mascot should compose the existing Phosphor cat through a mask");
assert.ok(motionCss.includes('url("./assets/icons/phosphor/heart.svg")'), "the lower mascot should include a small existing-library heart accent");
assert.ok(motionCss.includes('.stage-composer-mic:active'), "the microphone should give immediate pressed feedback");
assert.ok(motionCss.includes('#send-btn:active'), "the send action should give immediate pressed feedback");
assert.ok(motionCss.includes('Light utility selection'), "the lower utility rail should define one explicit light-selection treatment");
assert.ok(motionCss.includes('#scene-btn[aria-expanded="true"]'), "the expanded scene launcher should retain the light selected capsule");
assert.ok(motionCss.includes('#more-btn[aria-expanded="true"]'), "the expanded more launcher should retain the light selected capsule");
assert.ok(motionCss.includes(':is(#pet-mode-btn, #scene-btn, #more-btn):hover:not(:disabled)'), "all three utility launchers should share the same hover treatment");
assert.ok(motionCss.includes('background: #ffd3e5 !important'), "selected utility launchers should use the approved light pink surface");
assert.ok(motionCss.includes('color: #71334f !important'), "selected utility launchers should use readable dark berry content");
assert.ok(motionCss.includes('transform: translateY(0) scale(.97) !important'), "utility launchers should retain pressed feedback while hovered");
assert.ok(motionCss.includes('@media (hover: hover) and (pointer: fine)'), "hover motion should only run on precise hover-capable pointers");
assert.ok(motionCss.includes('@media (prefers-reduced-motion: reduce)'), "motion should respect the operating-system reduced-motion preference");
assert.ok(!motionCss.includes('transition: all'), "the state-motion layer should only transition deliberate properties");

console.log("stage motion frontend checks passed");
