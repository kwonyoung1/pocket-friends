# Woodland animals and room: source and usage

New AI-generated art made with image_gen on 2026-11-10 for this Pocket Friends
request. An original warm watercolor family-animation aesthetic; no existing
film character, scene or studio artwork was used as an image reference.

The previous project cat image was used for its fur palette and face identity.
The new quadruped cat gait became the style reference for the other four species.
Each species' gait sheet became its own life-pose identity reference. Cat, dog and
bear life sheets were edited with image_gen to correct transparency and cell
margins. Only accepted source PNGs are archived here. Existing RoomArt was
rendered alone as a composition reference for the new watercolor room. No user
photo, human character image or third-party stock image was modified or included.

Output use follows the applicable OpenAI terms, Content / Ownership of content:
https://openai.com/policies/terms-of-use/
These are AI output, not human hand-painted art, and are not falsely labeled as
CC0 stock or as copyright-exclusive works. No paid stock, Kenney, OpenGameArt,
itch.io or Craftpix download is included. Reference and private photo rights are
not relicensed.

sources.json lists 10 original PNG atlases and the new room PNG. Each atlas is
1536×1024, with 4 columns and 2 rows (384×512 source cells). The preparation
script extracts cells, removes negligible alpha noise, calibrates idle body size
between gait/life sheets and normalizes all frames to 512×512. Upsampling these
cells is disclosed: these are not claimed to be individually 512px source drawings.
Each frame remains individually inspectable as WebP in src/assets/animals.
No paws or poses are invented by the sprite extraction script.

Walk cells: 8 consecutive walking/hopping phases. Life cells: idle, blink, sit,
sleep, stretch, groom, yawn, look. Source alpha at every cell edge is checked so
characters never cross into neighboring cells. Metadata includes hashes and sizes.

Runtime uses 10 horizontally packed WebP atlases (4096×512), not 80 DOM images.
Raw PNGs and individual review frames are outside production imports. People
retain their preceding PNG/WebP artwork unchanged; personal photos bypass animals.
