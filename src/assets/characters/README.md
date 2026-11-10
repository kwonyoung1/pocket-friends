# Actual painted character frames

Seven folders: cat, bunny, dog, bear, fox, boy, girl.
Each contains `idle.png` plus `idle.webp`, `happy.webp`, `closed.webp`,
`walk-a.webp`, `walk-b.webp`, `sleep.webp`, all 512 × 512 with alpha.

New AI-generated art, source/usage terms and provenance:
[../../../art-source/characters/LICENSE.md](../../../art-source/characters/LICENSE.md).
The shared normalization anchor is (256, 476). Faces are never stretched to
simulate sitting or sleeping. `walk-b` is a visibly different passing pose.

Rebuild from archived sources with `npm run prepare:character-art`.
Verify alpha, dimensions and hashes with `npm run check:character-art`.
Do not put private uploaded photos in these directories.
