"use strict";
const fs = require("fs");
const { Writable } = require("stream");
const LIMIT = 2 * 1024 * 1024;
function appendRotating(file, chunk, limit = LIMIT) {
  const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
  for (let offset = 0; offset < bytes.length;) {
    let size = fs.existsSync(file) ? fs.statSync(file).size : 0;
    if (size >= limit) {
      const backup = `${file}.1`;
      if (fs.existsSync(backup)) fs.unlinkSync(backup);
      fs.renameSync(file, backup);
      size = 0;
    }
    const end = Math.min(bytes.length, offset + limit - size);
    fs.appendFileSync(file, bytes.subarray(offset, end));
    offset = end;
  }
}
function createRotatingLog(file) {
  const stream = new Writable({
    write(chunk, encoding, done) {
      try { appendRotating(file, chunk); done(); } catch (error) { done(error); }
    }
  });
  stream.on("error", () => {}); // A log disk failure must not kill Electron.
  return stream;
}
module.exports = { appendRotating, createRotatingLog };
