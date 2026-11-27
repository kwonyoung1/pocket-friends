# 별빛 아레나 스킬 밸런스 — 클릭 배포 안내

이 작업의 브랜치: `codex/arena-skill-balance` / 새 전투 규칙: **9**.

정상 설정된 토큰·Secrets·Actions 권한·Pages 설정은 다시 만들지 않습니다. DB 마이그레이션, 저장 초기화, Supabase 프로젝트 생성은 필요 없습니다. 현재 코드 기준 필요한 서버는 **game**이며 treasure는 변경되지 않았습니다. CI의 `plan`은 마지막 성공 배포 이후 누적 변경도 검사하므로 실제 plan에 다른 함수가 표시되면 그 결과를 따릅니다.

## 1. 이번 PR 열기

1. [이번 브랜치의 PR 검색](https://github.com/kwonyoung1/pocket-friends/pulls?q=is%3Apr+head%3Acodex%2Farena-skill-balance)을 누릅니다.
2. 제목 **Codex: arena-skill-balance**에 해당하는 PR을 엽니다. 번호와 마지막 커밋을 확인합니다. 과거 아레나 PR이나 이전 배포를 재실행하지 않습니다.
3. 결과가 없다면 [자동 PR 워크플로](https://github.com/kwonyoung1/pocket-friends/actions/workflows/auto-pr.yml)를 엽니다. 이번 브랜치 실행의 `open` 로그에서 실패 원인을 확인합니다. 브랜치가 푸시됐다는 사실만으로 PR이 만들어진 것은 아닙니다.
4. 자동 PR 생성이 실패했지만 브랜치가 있다면 [main과 이번 브랜치 비교](https://github.com/kwonyoung1/pocket-friends/compare/main...codex/arena-skill-balance)를 누르고, **Create pull request**가 보일 때만 눌러 PR을 만듭니다. 기존 PR이 있으면 새로 만들지 않습니다.

## 2. 검사 및 보호된 변경 리뷰

1. PR의 **Checks**를 누릅니다. 이번 작업은 STANDARD 요청이지만 기존 정책상 서버/전투 버전 변경으로 **FULL**입니다.
2. **Approve workflows to run**이 표시되면 변경 내용을 확인한 뒤 누릅니다. 이 버튼은 CI 실행 승인입니다.
3. `unit`, `browser`, `cloud`, `build`가 성공해야 합니다. PR에서는 운영 전용 `plan`, `approve`, `backend`, `deploy`가 의도적으로 Skipped일 수 있습니다. 전체 실행의 초록색 표시만으로 운영 배포 완료라고 판단하지 않습니다.
4. PR **Files changed**에서 스킬 밸런스와 구규칙8 호환 코드를 확인합니다. **Submit review** 메뉴에서 **Approve**를 선택해 제출합니다. 자기 PR 등 GitHub가 승인을 허용하지 않는 계정에서는 요구되는 다른 권한자의 리뷰가 필요합니다.
5. 기존 자동화는 서버/보안 관련 경로의 명시적 리뷰·병합을 요구합니다. 이번 작업의 `src/cloud/*`가 해당되므로 **자동 병합 대상이 아닙니다**. 리뷰 및 필수 검사 완료 후 PR **Overview/Conversation**의 **Merge pull request** → **Confirm merge**를 누릅니다. 이미 **Merged**이면 누르지 않습니다. 메뉴가 비활성이면 표시된 실패/대기 항목부터 해결합니다.

이 수동 단계의 근거는 [AGENTS.md의 Authorized automation workflow](../AGENTS.md) 중 “Never bypass repository protection or reviews” 및 “finish development and validation before the required explicit review/production approval”와 기존 [자동화 정책](../scripts/automation/policy.mjs)입니다. 이번 작업에서 보호 규칙을 바꾸지 않았습니다.

## 3. main 배포 승인

1. [Test and deploy Pocket Friends](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml)를 엽니다.
2. PR을 병합한 **최신 main 커밋**의 실행을 누릅니다. PR 브랜치 검사가 아니라 main의 실행이어야 합니다.
3. `changes`, `unit`, `browser`, `cloud`, `build`, `plan` 결과를 확인합니다. `plan`의 **Release plan**에는 대상 커밋, 배포 함수, 명시적 승인 여부가 표시됩니다.
4. **Waiting** 및 **Review deployments**가 보이면 누르고, **release-approval**을 선택해 **Approve and deploy**를 누릅니다. 이미 승인 완료라면 반복하지 않습니다. PR 리뷰 승인과 운영 환경 승인은 서로 다른 단계입니다.
5. `backend / functions`의 game 배포·정확한 SHA 확인 → `backend-gate` → `deploy` 순으로 완료되는지 확인합니다. 필요한 서버 배포가 실패하면 Pages를 강행하지 않습니다.

## 4. Pages와 실제 화면 확인

1. 최신 main 실행의 **deploy**가 초록색 성공이고, 내부 **Verify live HTML, exact commit and executable assets**, **Read-only live mobile boot check**까지 성공인지 확인합니다. **This job was skipped**는 배포 성공이 아닙니다.
2. [GitHub Pages 설정](https://github.com/kwonyoung1/pocket-friends/settings/pages)에서 게시 URL이 기존 사이트인지 확인합니다. Source가 이미 GitHub Actions면 다시 설정하지 않습니다.
3. [실제 포켓프렌즈](https://kwonyoung1.github.io/pocket-friends/)를 열고 새로고침합니다. 오래 열린 탭은 닫고 다시 엽니다. 저장 데이터 삭제나 “새 월드” 초기화는 하지 않습니다.
4. **별빛 아레나** → 네뷸라의 **스킬 · 해금 정보**를 엽니다. 스킬 +5일 때 총 계수는 **속성의 별가루264.5% / 고요한 성운368% / 성운 폭발707.25%**입니다. +0/+10은 숫자가 다릅니다. 표시를 맞추려고 유료 재화나 강화 재료를 쓰지 않습니다.
5. 새 전투에서 기존과 같은 이름·해금·2타/1타/3타·별빛1/2/3을 확인합니다. 기존 규칙8 진행 전투는 원래 규칙으로 끝낼 수 있어 새 계수가 적용되지 않을 수 있습니다. 레벨·성급·영구 강화·스킬 강화·코인·인벤토리가 유지되는지 확인합니다.

## 5. Supabase 확인

1. 서버는 기존 GitHub 배포가 처리합니다. [서버 배포 워크플로 파일](https://github.com/kwonyoung1/pocket-friends/blob/main/.github/workflows/deploy-backend.yml)을 별도로 편집하거나 토큰을 새로 만들 필요는 없습니다.
2. main 실행의 `backend / functions`에서 game 배포 후 exact SHA 검증 성공을 확인합니다. treasure가 plan 대상이 아니면 재배포할 필요가 없습니다.
3. 서버를 배포하지 않고 새 웹 버전만 올리면 규칙 번호가 달라질 수 있습니다. `backend-gate`를 우회하지 않습니다.

## 6. 실패했을 때 필요한 조치만 하기

|화면/오류|클릭할 곳과 대응|
|---|---|
|Checks 실패|PR **Checks** → 빨간 검사 → 실패한 단계 로그. 실패를 무시하고 병합하지 않습니다. 코드 수정이 필요하면 새 커밋의 검사 완료를 기다립니다.|
|Review required|PR **Files changed** → **Submit review** → **Approve**. 보호 설정을 끄지 않습니다.|
|main Waiting|해당 실행 **Summary** → **Review deployments** → release-approval 승인.|
|backend의 Invalid access token/401|main 실행의 실제 오류를 확인합니다. 기존 토큰이 유효한지 [Supabase Access Tokens](https://supabase.com/dashboard/account/tokens)와 [저장소 Environments](https://github.com/kwonyoung1/pocket-friends/settings/environments)를 확인하되, 토큰 값은 채팅에 붙이지 않습니다. 단순 버전 업데이트를 이유로 재발급하지 않습니다. 실제 설정 문제일 때만 [기존 설정 안내](../AUTO_DEPLOY_SETUP.md)를 따릅니다.|
|deploy 아티팩트 오류|업로드 단계의 이름·Artifact ID와 실패 로그를 확인합니다. 현재 main은 업로드된 정확한 ID로 배포합니다. 이전 실행/이전 PR을 반복 재실행하지 않습니다. 일시 오류로 확인된 경우에만 최신 실행의 **Re-run jobs**에서 실패 작업을 재시도합니다.|
|deploy Skipped|main 실행의 plan 및 backend-gate를 확인합니다. PR 실행이면 의도된 생략이며 main 배포를 엽니다.|
|사이트가 이전 화면|해당 main의 deploy 및 live SHA 검사 성공 여부를 먼저 확인하고, 성공 후 사이트를 새로고침합니다. 실패/Skipped이면 캐시 삭제로 해결되지 않습니다.|
|계수 불일치/409 업데이트 안내|최신 main 서버·웹 SHA를 확인한 뒤 탭을 새로고침합니다. 저장 초기화는 하지 않습니다.|

## 이 안내 작성 시 확인 범위

로컬 개발·검증 결과와 GitHub 푸시/PR/병합/서버/웹 배포 결과는 [결과 보고서](ARENA_SKILL_BALANCE_REPORT.md)에 각각 기록합니다. 이 세션은 GitHub API 및 운영 사이트 HTTP가403으로 차단되어, 그 상태를 초록색으로 추정하지 않습니다. 사용자의 기존 자동화 권한은 유지하며 반복 승인 요구를 새로 추가하지 않았습니다.
