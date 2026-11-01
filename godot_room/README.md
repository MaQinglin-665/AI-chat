# Godot room spike

[第二阶段：自主行动验收与录像时间线](PHASE2-REPORT.md)

Run with Godot 4.6.3. From this directory run `godot --headless --editor --import`, then `godot --fixed-fps 60 --script res://import_probe.gd`. The probe renders frames under docs/spike and measures spring-joint rotation relative to its parent during body translation and head turning.

Godot 4.7.2 (ed1daf0bf) rejects missing returns in godot-vrm 2.1.0's VRMC_springBone, VRMC_materials_mtoon and VRMC_materials_hdr_emissiveMultiplier scripts. Plugin initialization fails at the first springBone.new(). The two subsequent null-extension diagnostics occur while parsing glTF and enumerating supported extensions. Geometry imports but the secondary node has no script. Godot 4.6.3 (7d41c59c4) instead produces a working VRMSecondary and 149 skeleton bones. Its importer still reports a missing vrm/already_processed dictionary key.

On 4.6.3 the motion probe recorded about 13–15 degrees of rotation at skirt endpoints and over 20 degrees on multiple hair joints. Frames 020/050 show the front/side, 075 the Joy expression, and 110/120/130 moving frames. These measurements establish secondary motion, not calibrated fidelity.

- Godot Engine, MIT: https://godotengine.org/license/
- V-Sekai godot-vrm v2.1.0-assetlib, MIT, including its MToon dependency and bundled notices: https://github.com/V-Sekai/godot-vrm/tree/v2.1.0-assetlib
- Sendagaya Shino, pixiv, CC0. Official notice: https://vroid.pixiv.help/hc/en-us/articles/360013482714-Sendagaya-Shino . Source model: https://github.com/madjin/vrm-samples/blob/master/vroid/beta/Sendagaya_Shino.vrm . Embedded title and CC0 metadata verified.

Animations: Quaternius Universal Animation Library Standard, CC0 1.0, official listing https://quaternius.itch.io/universal-animation-library . glTF distribution https://github.com/J-Ponzo/gltf-universal-animation-library . Original license in animations/LICENSE.txt. Godot strips _Loop from imported names. Retargeting maps DEF bones to VRM human bones with rest-basis conjugation and transfers vertical hips displacement. Navigation drives horizontal translation.

[完整验收报告和同角度对比](SPIKE-REPORT.md)
