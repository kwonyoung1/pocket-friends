# Original quadruped / rabbit-hop art

Species: cat, bunny, dog, bear, fox. Each directory contains:
- `idle.png`: transparent normalized master, 512×512.
- `walk-0.webp` through `walk-7.webp`: 8 real walking/hopping pose drawings.
- `idle/blink/sit/sleep/stretch/groom/yawn/look.webp`: 8 real life poses.
- `walk-atlas.webp`, `life-atlas.webp`: runtime 8-frame strips, 4096×512.

Source PNGs, generation provenance and usage terms:
[art-source/woodland/LICENSE.md](../../../art-source/woodland/LICENSE.md).
No human character art is registered in these animal atlases.

`npm run prepare:animal-art` rebuilds from archived sources.
`npm run check:animal-art` verifies source margins, output alpha, dimensions,
hashes and differences between adjacent leg silhouettes.
