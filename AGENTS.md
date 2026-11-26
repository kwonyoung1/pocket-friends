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
  Required CI `build` enforces the shared trusted risk policy below; FULL includes
  the complete existing browser/cloud suites.
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

## Shared risk-based validation (default AUTO)

- Read `docs/VALIDATION_POLICY.md`; local and CI decisions use
  `scripts/validation/policy.mjs`. A prompt may specify `검증 등급: AUTO`, `FAST`,
  `STANDARD` or `FULL`. Choose the higher of requested and inferred risk.
- Before local checks, use `npm run validate:plan -- --base origin/main --out /tmp/pocket-validation-plan.json`.
  This includes tracked worktree edits and untracked files. Uncertain classification
  means FULL, never assume a filename alone proves safety.
- For an explicit request, run `npm run validate:request -- --mode FAST --base origin/main`
  (substitute the requested mode), and commit the base-bound `validation.request.json`.
  The auto-PR annotation mirrors that file; body/labels/commit text cannot lower CI.
  An unchanged file inherited from a previous task does not carry its request forward.
- FAST: mapped unit checks, one production build (already includes TypeScript),
  relevant asset checks; omit unrelated E2E/cloud and long simulation tools.
- STANDARD: related units, selected feature browser/cloud coverage, one build.
- FULL: all units, automation/validation tests, frozen Deno checks, one build,
  full existing browser and cloud suites. Tooling/workflow changes require FULL.
- Do not repeat a passing check for unchanged relevant code and environment. A
  changed implementation, failed check or new unresolved concern justifies reruns
  of affected checks. Local results never substitute for CI's independent decision.
- CI executes the classifier from trusted main/base, not the candidate branch's
  policy. First policy migration or unavailable/failed analysis runs FULL.
- Preserve protected reviews, exact head/base proof and all production SHA/asset/
  read-only boot/server gates. Only explicitly policy-omitted jobs may be skipped;
  required failures, cancellations, missing jobs and unexpected skips block `build`.
- On a resource-limited local machine, run the FULL browser/cloud tasks sequentially;
  separate CI jobs have separate CPUs, but simultaneous local software-GPU suites
  can create unrelated timeouts. Recheck only failed affected cases after diagnosis.
