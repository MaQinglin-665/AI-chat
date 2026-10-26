"use strict";
// npm install --prefix <outside-repo> --save-exact --ignore-scripts
//   three@0.180.0 @pixiv/three-vrm@3.4.4 esbuild@0.25.11
const fs = require("node:fs");
const path = require("node:path");
const dependencyRoot = path.resolve(process.argv[2] || "node_modules");
const versions = { three: "0.180.0", "@pixiv/three-vrm": "3.4.4", esbuild: "0.25.11" };
for (const [name, version] of Object.entries(versions)) {
  const pkg = JSON.parse(fs.readFileSync(path.join(dependencyRoot, name, "package.json"), "utf8"));
  if (pkg.version !== version) throw new Error(`Expected ${name}@${version}`);
}
const destination = path.resolve(__dirname, "../web/vendor/vrm");
fs.mkdirSync(destination, { recursive: true });
require(path.join(dependencyRoot, "esbuild")).buildSync({
  stdin: { contents: "export * as THREE from 'three'; export { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; export { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';", resolveDir: path.dirname(dependencyRoot) },
  bundle: true, format: "iife", globalName: "XinyuVRMVendor", minify: true,
  legalComments: "eof", outfile: path.join(destination, "vrm-vendor.js")
});
// Normalize trailing whitespace in bundled GLSL template literals for repository checks.
const bundlePath = path.join(destination, "vrm-vendor.js");
fs.writeFileSync(bundlePath, fs.readFileSync(bundlePath, "utf8").replace(/[ \t]+$/gm, ""));
fs.copyFileSync(path.join(dependencyRoot, "three/LICENSE"), path.join(destination, "THREE-LICENSE.txt"));
fs.copyFileSync(path.join(dependencyRoot, "@pixiv/three-vrm/LICENSE"), path.join(destination, "THREE-VRM-LICENSE.txt"));
