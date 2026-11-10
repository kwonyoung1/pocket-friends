# Pocket Friends working preferences

- Mobile is the design/performance priority. Use portrait CSS viewports 360×800,
  375×812, 390×844 and 412×915; 390px is the main design baseline.
- Do not add PC-only layouts, hover-only features, desktop design work or desktop
  screenshots unless the user explicitly changes this preference. Preserve basic
  existing desktop execution and leave existing CI coverage intact.
- Use touch-first controls, minimum 44px main targets, safe areas and dynamic
  viewport units. Check coarse-pointer hover feedback does not move touch targets.
- Preserve IDs, names, photos, progress, coins, inventory, furniture coordinates,
  cloud sync and minigame rules. Never reset user data to implement visual updates.
- Preserve original character PNGs. New compatible animation assets may be added;
  do not overwrite original person artwork or private photos.
- Prefer focused mobile browser tests plus relevant unit/server tests and a build.
  Avoid unrelated full minigame test runs. Clearly distinguish mobile emulation
  from physical Android Chrome/iPhone Safari validation.
- Report actual asset provenance and animation limits. Never call absent poses
  extracted artwork. Record concrete merge and deployment steps, including backend
  deployment when server command validation changes.
