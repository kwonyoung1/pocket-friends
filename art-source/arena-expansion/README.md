# Arena expansion original artwork

Original PNGs were generated with OpenAI image_gen for this project. They are not ripped, extracted, recolored commercial RPG assets or downscaled illustration substitutes for pixel characters.

- Five separately drawn character illustrations: Dudu (fox), Lulu (cream cat), Toto (brown bear), Byeol (lavender lop rabbit), Mungchi (ivory floppy-eared dog).
- Five separately generated 5×4 pixel pose sheets: 20 poses per character, 100 total. Native runtime cells are 64×64.
- Seven distinct illustrated region backgrounds; the original forest background stays in use.
- Eight 4×4 enemy sheets: four enemy species × four poses per region, 32 species / 128 cells.
- Existing Youngi/Chanmi source portraits and all existing home character artwork are unchanged.

The first Mungchi and Byeol card drafts contained an extra central lower limb. They were rejected and edited with image_gen; only corrected two forepaw + two hind paw source files are committed. All five new character cards and 100 new hero poses were inspected visually. Enemy idle/attack contact sheets were checked for clipping and stray neighboring limbs. Pixel body segmentation uses alpha >220 to avoid cross-cell glow bridges; original PNGs remain intact here.

Reproduce compressed runtime assets with `node scripts/prepare-arena-expansion.mjs`. This uses Sharp for atlas extraction, transparent connected-component segmentation, nearest-neighbor pixel resizing and WebP compression. It does not paint or edit anatomy. Source/output SHA-256, dimensions and sizes are in `src/arena/art/expansion-metadata.json`.

Animation limitations: these are discrete illustrated pixel poses with PixiJS movement/effects, not skeletal animation or 3D models. Only mobile browser emulation was available for verification; physical phone GPU results are not claimed.
