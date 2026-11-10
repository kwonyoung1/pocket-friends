# Painted character source and usage notes

Generated 2026-11-10 using the image_gen tool for this Pocket Friends request.
These are newly AI-generated illustrations, not third-party stock downloads,
not hand-painted human artwork, and not pose extractions from an existing photo.

The boy and girl generation used the repository's existing `src/assets/humans/boy.png`
and `girl.png` as hairstyle/outfit identity references. Subsequent animal and gait
images used the generated character art as style/identity references. No uploaded
personal photo was used or modified.

Output usage is governed by the applicable OpenAI terms:
https://openai.com/policies/terms-of-use/ (Content / Ownership of content).
These files are included as project art under those output terms. We do not
represent that the generated art has an independently obtained CC0 stock license,
that copyright exclusivity is guaranteed, or that reference/user photos are
relicensed. No paid stock, Kenney, OpenGameArt, itch.io or Craftpix asset is included.

`*-atlas.png`: six generated poses, but only cells 0,1,2,5 are used.
Cells 3 and 4 were too similar for the intended walking animation and are unused.
`*-stride.png`: separately generated wide-stride pose.
`*-passing.png`: separately generated raised-knee passing pose.
`sources.json`: exact repository paths of the 21 archived PNGs.
`metadata.json`: hashes and sizes of the 42 actual runtime WebP frames.

Derived files: `src/assets/characters/{cat,bunny,dog,bear,fox,boy,girl}/`.
Each includes the lossless 512px idle PNG and six alpha WebP frames. The preparation
script only extracts atlas cells, normalizes canvas/foot anchor, cleans negligible
alpha noise and encodes files; it does not invent body poses. Raw sources are not
Vite/public inputs and are not copied to the website build.
