## TODO

- ~~Adjust position after `terrain.collide()` so player moves at constant-ish speed regardless of slope~~
- ~~Mouse controls~~
- More stuff in level
  - ~~Add big VBO for drawing "decorations" like in L-system~~
  - ~~Add tile-based "acceleration structure"~~
  - ~~Add buildings?~~
  - Snowmen
    - Integrate Mesh and LSystem
    - Make TerrainPlane take more things in constructor
    - Snowman that "follows" you?
    - Can do this with model matrix on separate VBO
- Maybe add jumping? Probably after adding collision w/ non-terrain entities
- Investigate weird precision bug that causes crashes if Player spawns at X = 0 and moves forward
- ~~Disable up/down movement~~
- Don't need invTr in pyramid, since we compute normal after transform anyway?
- Add Blinn-Phong to make things shinier?

