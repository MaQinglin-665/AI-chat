"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { spawnSync } = require("node:child_process");
const { validateMapping, loadModelCatalog } = require("../scripts/validate_live2d_mapping.js");
const template = require("../web/avatar/mappings/template.json");
const catalog = { parameters: new Set(Object.values(template.params)), parts: new Set(["PartArm"]), expressions: new Set(["smile"]), motions: { TapBody: 2 } };
function check(mutate, expected) { const data = structuredClone(template); mutate(data); const result = validateMapping(data, catalog); assert.ok(result.errors.some(error => expected.test(error)), JSON.stringify(result)); }
(async () => {
  assert.deepEqual(validateMapping(template,catalog).errors, []);
  assert.equal(validateMapping(template).modelChecked, false); assert.match(validateMapping(template).warnings[0], /NOT checked/);
  check(m => { m.params.angleY = "ParamNotInModel"; }, /absent from actual model/);
  check(m => { m.modePoses.listen.fakeAlias = 2; }, /unknown parameter alias/);
  check(m => { m.actions.nod = { motion: ["Missing",0] }; }, /motion Missing/);
  check(m => { m.actions.nod = { motion: ["TapBody",2] }; }, /TapBody\[2\]/);
  check(m => { m.actions.nod = { motion: ["TapBody",-1] }; }, /invalid motion/);
  check(m => { m.faces.happy = "missing-exp"; }, /expression missing-exp/);
  check(m => { m.parts.arm = "MissingPart"; }, /part MissingPart/);
  check(m => { m.capabilities.vowels = true; }, /all five/);
  check(m => { m.gestureVocabulary.nod.keyframes[1].values = { mouthOpen: 1 }; }, /mouth ownership/);
  check(m => { m.gestureVocabulary.nod.durationMs = 50000; }, /invalid duration/);
  check(m => { m.gestureVocabulary.nod.keyframes[1].at = -1; }, /invalid duration/);
  check(m => { m.speechGestureEffects = []; }, /expected object/);
  check(m => { m.metadata.authors = 42; }, /expected author list/);
  for (const malformed of [null, [], {}, { version: 1, params: { angleX: null } }, { version: 1, params: {}, actions: [null] }]) {
    assert.ok(validateMapping(malformed).errors.length > 0);
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(),"xinyu-mapping-validator-"));
  try {
    const manifest = path.join(directory,"Sample.model3.json");
    fs.writeFileSync(manifest, JSON.stringify({ FileReferences: { Moc: "../outside.moc3", Textures: ["texture.png"] } }));
    await assert.rejects(loadModelCatalog(manifest), /Invalid model resource/);
    fs.writeFileSync(manifest, JSON.stringify({ FileReferences: { Moc: "missing.moc3", Textures: ["texture.png"] } }));
    await assert.rejects(loadModelCatalog(manifest), /ENOENT/);
    const broken = path.join(directory,"broken.json"); fs.writeFileSync(broken,"{");
    const cli = spawnSync(process.execPath,[path.resolve(__dirname,"../scripts/validate_live2d_mapping.js"),"--mapping",broken],{encoding:"utf8"});
    assert.equal(cli.status,1); assert.match(cli.stdout,/errors/); assert.doesNotMatch(cli.stderr,/at .*\.js:/);
  } finally {
    const resolved = fs.realpathSync(directory);
    assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith("xinyu-mapping-validator-"));
    fs.rmSync(resolved,{recursive:true,force:true});
  }
  console.log("Mapping schema and real-reference contracts: unknown IDs/groups/indices/faces/parts, mouth ownership, missing/traversal and CLI errors passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
