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

## Authorized automation workflow

- For each new task, fetch latest main and create `codex/<task>` from it. Preserve
  unrelated/unmerged feature branches and all player data. Keep changes reviewable.
- Implement the requested change, focused mobile checks, server/integrity checks
  when shared code changes, automation tests when workflows change, and a build.
  Required CI `build` still includes the complete existing browser/cloud suites.
- Commit and push the task branch. Use `npm run automation:submit` or the trusted
  auto-pr workflow to open/update its PR. Git transport access is not GitHub API
  access: report 403/permission failures accurately; never claim a PR exists.
- Inspect PR checks and automatic merge eligibility. With the owner's one-time
  AUTO_PR_ENABLED / AUTO_MERGE_ENABLED / AUTO_SERVER_DEPLOY_ENABLED consent,
  execute safe internal changes through the pipeline without asking for routine
  PR/merge/deployment clicks. Never bypass repository protection or reviews.
- Security/auth, DB, secrets, economy, workflow changes and runtime deletions are
  protected by `scripts/automation/policy.mjs`; finish development and validation
  before the required explicit review/production approval. Do not redefine a
  dangerous change as safe or weaken policy/checks to get it merged.
- While this Codex session can access GitHub, monitor the current run using
  `npm run automation:watch -- <run-id>`, diagnose failures, repair code and retry
  at most twice. Stop blind retries on credentials, permissions, migrations or
  data risks. Actions cannot continue an ended Codex conversation by themselves.
- Confirm both changed Edge Function SHA health checks and the published website
  SHA/live mobile boot check. Read-only smoke checks must never log in, award
  coins, initialize or overwrite the operating world.
- Report implemented code, tests, PR/merge status, server/web deployment status
  and URL/SHA verification separately. Do not claim production completion before
  verification. If first-time setup/API access is blocked, link AUTO_DEPLOY_SETUP.md
  and name exactly what remains incomplete; settings docs do not grant access.
