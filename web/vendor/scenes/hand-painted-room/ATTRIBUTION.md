# Stylized Hand-Painted room

This work is based on "Stylized Hand-Painted room" by OzerGokmen.
Source: https://sketchfab.com/3d-models/stylized-hand-painted-room-53f5744bfe89424995eed0cce43fb427
Author: https://sketchfab.com/OzerGokmen
License: Creative Commons Attribution 4.0 International (CC BY 4.0)
https://creativecommons.org/licenses/by/4.0/
Original author-supplied notice: license.txt. No endorsement by the original author is implied.

Changes in Xinyu (2026-10-26):
- Retain original scene.bin and 15 base-color textures byte-for-byte. All supplied images are 2048x2048; no resizing was required.
- Remove normal/metallic-roughness references from scene.gltf; omit those unused maps. Retained unused image slots redirect to a packaged base-color image.
- Runtime uniform scale 0.014 metres/source unit and floor offset -20.46 * 0.014 metres.
- Clone/transformed geometry for a cutaway: omit front/right shell and high ceiling triangles; omit the central coffee table and its small props to create a walking aisle.
- Replace PBR materials with unlit base-color materials; apply interpolated cool/night and warm/day tint. Tag window and pendant-light meshes as future bloom sources; no bloom effect yet.
- Add a separate CC0 KayKit chair. Character, camera, lights, paths and animation are application additions, not part of the original work.
- Original download outside the repository remains unchanged.
