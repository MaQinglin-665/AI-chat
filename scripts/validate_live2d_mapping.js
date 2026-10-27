#!/usr/bin/env node
"use strict";
// Offline validation: never downloads a model or reads application config.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { validateSpec } = require("../web/avatar/live2dGestures.js");
const procedural = require("../web/hiyoriPerformanceDirector.js").ACTION_SPECS;
const repo = path.resolve(__dirname, "..");
const object = value => !!value && typeof value === "object" && !Array.isArray(value);
const id = value => typeof value === "string" && value.length > 0 && value.length <= 256 && !value.includes("\0");
const own = (value, key) => Object.hasOwn(value || {}, key);
function validateMapping(mapping, catalog = null) {
  const errors = [], warnings = [], fail = message => errors.push(message);
  if (!object(mapping) || mapping.version !== 1 || !object(mapping.params)) return { errors: ["version must be 1 and params must be an object"], warnings, modelChecked: !!catalog };
  if (!id(mapping.id) || (mapping.kind && mapping.kind !== "live2d") || (mapping.driver && mapping.driver !== "mapped")) fail("invalid id/kind/driver");
  if (mapping.model !== undefined && (!id(mapping.model) || /[\\:%?#\0]/.test(mapping.model) || mapping.model.startsWith("/") || mapping.model.split("/").some(part => !part || part === "." || part === "..") || !mapping.model.endsWith(".model3.json"))) fail("model: expected a relative manifest under models_local");
  const parameters = [];
  for (const [alias, value] of Object.entries(mapping.params)) {
    if (alias === "vowels") {
      if (!object(value) || Object.keys(value).some(v => !["a","i","u","e","o"].includes(v)) || Object.values(value).some(v => !id(v))) fail("params.vowels must map a/i/u/e/o to parameter IDs");
      else parameters.push(...Object.values(value));
    } else if (!id(value)) fail(`params.${alias}: expected a parameter ID`);
    else parameters.push(value);
  }
  const reference = (alias, where) => { if (typeof mapping.params[alias] !== "string" || !own(mapping.params, alias)) fail(`${where}: unknown parameter alias ${alias}`); };
  for (const family of ["modePoses","deliveryPoses","speechGesturePoses"]) {
    if (mapping[family] !== undefined && !object(mapping[family])) { fail(`${family}: expected object`); continue; }
    for (const [name, pose] of Object.entries(mapping[family] || {})) {
      if (!object(pose)) { fail(`${family}.${name}: expected pose object`); continue; }
      for (const [alias, value] of Object.entries(pose)) { reference(alias, `${family}.${name}`); if (!Number.isFinite(value)) fail(`${family}.${name}.${alias}: expected finite value`); }
    }
  }
  if (mapping.parts !== undefined && !object(mapping.parts)) fail("parts: expected object");
  for (const [alias, value] of Object.entries(mapping.parts || {})) if (!id(value)) fail(`parts.${alias}: expected part ID`);
  if (mapping.channelGroups !== undefined && !object(mapping.channelGroups)) fail("channelGroups: expected object");
  for (const [group, aliases] of Object.entries(mapping.channelGroups || {})) {
    if (!Array.isArray(aliases)) { fail(`channelGroups.${group}: expected alias list`); continue; }
    aliases.forEach(alias => reference(alias, `channelGroups.${group}`));
  }
  if (mapping.faces !== undefined && !object(mapping.faces)) fail("faces: expected object");
  for (const [face, value] of Object.entries(mapping.faces || {})) {
    if (typeof value === "string") { if (!id(value)) fail(`faces.${face}: empty expression`); else if (catalog && !catalog.expressions.has(value)) fail(`faces.${face}: expression ${value} absent from model`); }
    else if (!object(value) || (value.delivery !== "neutral" && !own(mapping.deliveryPoses, value.delivery))) fail(`faces.${face}: unknown delivery pose`);
  }
  if (mapping.actions !== undefined && !object(mapping.actions)) fail("actions: expected object");
  for (const [name, action] of Object.entries(mapping.actions || {})) {
    if (!object(action)) { fail(`actions.${name}: expected object`); continue; }
    if (Array.isArray(action.motion)) {
      const [group, index] = action.motion;
      if (action.motion.length !== 2 || !id(group) || !Number.isInteger(index) || index < 0) fail(`actions.${name}: invalid motion group/index`);
      else if (catalog && (!own(catalog.motions, group) || index >= catalog.motions[group])) fail(`actions.${name}: motion ${group}[${index}] absent from model`);
    } else if (action.type === "procedural" && mapping.driver !== "mapped") {
      if (!own(procedural, action.name)) fail(`actions.${name}: unknown procedural action ${action.name}`);
    } else if (action.gesture) {
      if (!own(mapping.speechGesturePoses, action.gesture) || !Number.isFinite(action.durationMs) || action.durationMs < 1 || action.durationMs > 10000) fail(`actions.${name}: unknown gesture or invalid duration`);
    } else fail(`actions.${name}: expected motion, procedural action or gesture`);
  }
  if (mapping.speechGestureEffects !== undefined && !object(mapping.speechGestureEffects)) fail("speechGestureEffects: expected object");
  for (const [name, effect] of Object.entries(mapping.speechGestureEffects || {})) {
    if (!own(mapping.speechGesturePoses, name) || !object(effect)) { fail(`speechGestureEffects.${name}: missing gesture or invalid effect`); continue; }
    if (effect.parts !== undefined && !object(effect.parts)) fail(`speechGestureEffects.${name}.parts: expected object`);
    for (const [alias, value] of Object.entries(effect.parts || {})) if (!own(mapping.parts, alias) || !Number.isFinite(value) || value < 0 || value > 1) fail(`speechGestureEffects.${name}: invalid part ${alias}`);
    if (effect.partParameters !== undefined && typeof effect.partParameters !== "boolean") fail(`speechGestureEffects.${name}: partParameters must be boolean`);
    if (effect.oscillations !== undefined && !Array.isArray(effect.oscillations)) fail(`speechGestureEffects.${name}: oscillations must be a list`);
    else for (const item of effect.oscillations || []) {
      if (!object(item)) { fail(`speechGestureEffects.${name}: invalid oscillation`); continue; }
      reference(item.param, `speechGestureEffects.${name}`);
      if (!Number.isFinite(item.amplitude) || !Number.isFinite(item.cycles) || item.cycles <= 0 || item.cycles > 32) fail(`speechGestureEffects.${name}: invalid amplitude/cycles`);
    }
  }
  if (mapping.gestureVocabulary !== undefined && !object(mapping.gestureVocabulary)) fail("gestureVocabulary: expected object");
  for (const [name, spec] of Object.entries(mapping.gestureVocabulary || {})) {
    let valid = false; try { valid = validateSpec(mapping, name, spec); } catch (_) { /* Other malformed sections are already reported. */ }
    if (!valid) fail(`gestureVocabulary.${name}: invalid duration/frame/alias or mouth ownership`);
  }
  if (mapping.metadata !== undefined && !object(mapping.metadata)) fail("metadata: expected object");
  if (object(mapping.metadata)) {
    for (const field of ["name","source","readme"]) if (mapping.metadata[field] !== undefined && typeof mapping.metadata[field] !== "string") fail(`metadata.${field}: expected string`);
    if (mapping.metadata.authors !== undefined && (!Array.isArray(mapping.metadata.authors) || mapping.metadata.authors.some(author => !id(author)))) fail("metadata.authors: expected author list");
    if (mapping.metadata.conditions !== undefined && !object(mapping.metadata.conditions)) fail("metadata.conditions: expected object");
  }
  const caps = mapping.capabilities;
  if (caps !== undefined && !object(caps)) fail("capabilities: expected object");
  if (object(caps)) {
    for (const field of ["vowels","fullBody","locomotion"]) if (caps[field] !== undefined && typeof caps[field] !== "boolean") fail(`capabilities.${field}: expected boolean`);
    if (caps.vowels && !["a","i","u","e","o"].every(v => id(mapping.params.vowels?.[v]))) fail("capabilities.vowels requires all five parameter IDs");
    if (caps.armGestures !== undefined && (!Array.isArray(caps.armGestures) || caps.armGestures.some(name => !own(mapping.speechGesturePoses, name)))) fail("capabilities.armGestures references missing gesture");
  }
  if (catalog) {
    for (const value of new Set(parameters)) if (!catalog.parameters.has(value)) fail(`parameter ${value} absent from actual model`);
    for (const value of Object.values(mapping.parts || {})) if (!catalog.parts.has(value)) fail(`part ${value} absent from actual model`);
  } else warnings.push("STRUCTURE_ONLY: model parameter/part/expression/motion existence NOT checked; supply --model");
  return { errors, warnings, modelChecked: !!catalog };
}
function readJson(file) {
  if (fs.statSync(file).size > 1024 * 1024) throw Error("JSON exceeds 1 MiB");
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}
function resource(root, name, suffix) {
  if (!id(name) || /[\\:%?#\0]/.test(name) || name.startsWith("/") || name.split("/").some(part => !part || part === "." || part === "..") || !name.toLowerCase().endsWith(suffix)) throw Error("Invalid model resource reference: " + name);
  const file = path.resolve(root, name), base = fs.realpathSync(root), real = fs.realpathSync(file);
  if (!real.startsWith(base + path.sep) || fs.lstatSync(file).isSymbolicLink() || !fs.statSync(file).isFile() || fs.statSync(file).size > 64 * 1024 * 1024) throw Error("Model resource outside directory/link/too large: " + name);
  // Check intermediate directory links as well as the final file.
  for (let part = file; part !== path.dirname(part) && part !== root; part = path.dirname(part)) if (fs.lstatSync(part).isSymbolicLink()) throw Error("Model resource contains a link");
  return file;
}
let corePromise;
function getCore() {
  return corePromise ||= (async () => {
    const file = path.join(repo, "web/vendor/live2dcubismcore.min.js"), context = { console, require, process, Buffer, TextDecoder, TextEncoder, WebAssembly, setTimeout, clearTimeout, __dirname: path.dirname(file) };
    vm.createContext(context); vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: "LocalCubismCore.js" });
    const core = context.Live2DCubismCore;
    for (let i = 0; ; i++) { try { core.Version.csmGetVersion(); return core; } catch (error) { if (i === 500) throw error; await new Promise(resolve => setTimeout(resolve, 10)); } }
  })();
}
async function loadModelCatalog(manifestPath) {
  const manifest = path.resolve(manifestPath), root = path.dirname(manifest), settings = readJson(manifest), refs = settings.FileReferences;
  if (!object(refs) || !Array.isArray(refs.Textures) || !refs.Textures.length) throw Error("Manifest needs FileReferences.Moc and Textures");
  const entries = [[refs.Moc,".moc3"], ...refs.Textures.map(file => [file,".png"])];
  for (const [key,suffix] of [["Physics",".physics3.json"],["Pose",".pose3.json"],["DisplayInfo",".cdi3.json"]]) if (refs[key]) entries.push([refs[key],suffix]);
  const expressions = new Set(), motions = Object.create(null);
  for (const item of refs.Expressions || []) { if (!id(item.Name)) throw Error("Expression needs a name"); expressions.add(item.Name); entries.push([item.File,".exp3.json"]); }
  for (const [group, items] of Object.entries(refs.Motions || {})) { if (!Array.isArray(items)) throw Error("Invalid motion group"); motions[group] = items.length; for (const item of items) entries.push([item.File,".motion3.json"]); }
  if (entries.length > 256) throw Error("Too many model resources");
  const files = entries.map(([file,suffix]) => resource(root,file,suffix)), bytes = fs.readFileSync(files[0]), core = await getCore();
  let moc, model;
  try {
    moc = core.Moc.fromArrayBuffer(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)); if (!moc) throw Error("Cannot read moc3");
    model = core.Model.fromMoc(moc); if (!model) throw Error("Cannot instantiate model");
    return { parameters: new Set(model.parameters.ids), parts: new Set(model.parts.ids), expressions, motions };
  } finally { model?.release(); moc?._release(); }
}
async function main(args) {
  const targets = [];
  if (args.length === 1 && args[0] === "--all") {
    const folder = path.join(repo,"web/avatar/mappings");
    for (const name of fs.readdirSync(folder).filter(name => name.endsWith(".json"))) {
      const mapping = path.join(folder,name), data = readJson(mapping);
      const localRoot = path.join(repo,"models_local");
      let local = data.id === "hiyori" ? path.join(repo,"web/models/hiyori_pro_t11/hiyori_pro_t11.model3.json") : null;
      if (!local && typeof data.model === "string") {
        const candidate = path.resolve(localRoot,data.model);
        if (candidate.startsWith(localRoot + path.sep)) local = candidate;
      }
      targets.push({ mapping, model: local && fs.existsSync(local) ? local : null });
    }
  } else {
    const options = {};
    for (let i=0;i<args.length;i+=2) { if (!["--mapping","--model"].includes(args[i]) || !args[i+1] || args[i+1].startsWith("--")) throw Error("Usage: --all OR --mapping <mapping.json> [--model <local.model3.json>]"); options[args[i]]=args[i+1]; }
    if (!options["--mapping"]) throw Error("Specify --mapping or --all");
    targets.push({ mapping: path.resolve(options["--mapping"]), model: options["--model"] });
  }
  let failed = false;
  for (const target of targets) {
    let result;
    try { result = validateMapping(readJson(target.mapping), target.model ? await loadModelCatalog(target.model) : null); }
    catch (error) { result = { errors: [error.message], warnings: [], modelChecked: false }; }
    console.log(JSON.stringify({ mapping: path.relative(repo,target.mapping), ...result })); failed ||= result.errors.length > 0;
  }
  return failed ? 1 : 0;
}
module.exports = { validateMapping, loadModelCatalog, readJson, main };
if (require.main === module) main(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(error => { console.error(error.message); process.exitCode = 1; });
