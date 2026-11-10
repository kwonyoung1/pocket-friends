# Winter room and human stroll source art

Generated with image_gen for Pocket Friends on 2026-11-10. AI-created artwork,
not human-painted original art or stock downloaded under a claimed CC0 license.
Applicable output usage terms: https://openai.com/policies/terms-of-use/
No paid assets or third-party game asset pack is included.

- winter-room.png: the project's own watercolor room used as a composition/style
  reference, edited into winter while preserving furniture layout. The outdoor
  snow scenery, knitted sofa blanket, cushion, snowman ornament and warm lights
  are new. Animated snowfall is separate code clipped to four window panes.
- boy-walk.png / girl-walk.png: referenced the existing project idle PNGs for face,
  hair, outfit and proportions. New alternate walking poses were generated.
  The first tiny-step version was excluded after the user's request for a less
  restrained stroll. The accepted version has clearer stride and arm swing,
  low foot lift and stable torso/head. Girl background alpha was corrected with
  image_gen. No original PNG or personal photo was overwritten or relicensed.

Each human source sheet is 1536×1024 (4×2 cells, source cells 384×512). The script
normalizes the 16 real drawings to 512×512 review WebP files, packs runtime
atlases and downsamples only the runtime strips to 2048×256. This is explicitly
not a claim that each source cell was originally 512px wide. Runtime frames are
256px; existing original PNGs remain full size. Original creation terms also
remain applicable to the reference files and are not replaced by these notes.

metadata.json records accepted review frame hashes and sizes. Rebuild from these
archived originals with `npm run prepare:mobile-art`; verify with
`npm run check:mobile-art`. The scripts perform extraction, alignment, alpha
cleanup and encoding only; they do not invent missing poses or facial features.
