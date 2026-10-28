"use strict";
// Offline build only. Input: unpacked official pinyin-pro 3.29.5 npm package.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const source = path.resolve(process.argv[2] || "");
const meta = JSON.parse(fs.readFileSync(path.join(source, "package.json"), "utf8"));
if (meta.name !== "pinyin-pro" || meta.version !== "3.29.5" || meta.license !== "MIT") throw Error("Expected official pinyin-pro 3.29.5 / MIT");
const { pinyin } = require(path.join(source, "dist/index.js"));
const finals = {}, decoder = new TextDecoder("gb18030", { fatal: true });
// GB2312 level 1: B0A1..D7F9, 3755 common simplified characters.
for (let row = 0xb0; row <= 0xd7; row++) for (let col = 0xa1; col <= (row === 0xd7 ? 0xf9 : 0xfe); col++) {
  const char = decoder.decode(Uint8Array.of(row, col));
  const final = pinyin(char, { pattern: "final", toneType: "none", type: "array" })[0];
  (finals[final] ??= []).push(char);
}
const output = path.resolve(__dirname, "../web/avatar/data"); fs.mkdirSync(output, { recursive: true });
const data = { source: "https://registry.npmjs.org/pinyin-pro/-/pinyin-pro-3.29.5.tgz", version: meta.version,
  license: "MIT", range: "GB2312 level 1 (3755 characters), common single-character reading",
  finals: Object.fromEntries(Object.entries(finals).sort(([a], [b]) => a.localeCompare(b, "en")).map(([final, chars]) => [final, chars.join("")])) };
const file = path.join(output, "pinyinCommon.json"); fs.writeFileSync(file, JSON.stringify(data) + "\n");
fs.copyFileSync(path.join(source, "LICENSE"), path.join(output, "pinyin-pro.LICENSE.txt"));
console.log(JSON.stringify({ count: Object.values(finals).flat().length, bytes: fs.statSync(file).size,
  sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex") }));
