# 후반 몬스터·고난도 전투 업데이트 클릭 안내

이번 브랜치: `codex/arena-monster-overhaul`. 그래픽, 전투 계산, 서버 재현 규칙 7이 함께 변경됩니다. 웹만 배포하면 완료가 아닙니다. 기존 계정·비밀번호·프로젝트·Secrets를 그대로 사용합니다. DB 마이그레이션은 없습니다.

## 1. 이번 PR 확인

1. [이번 브랜치 PR 검색](https://github.com/kwonyoung1/pocket-friends/pulls?q=is%3Apr+head%3Acodex%2Farena-monster-overhaul)을 엽니다.
2. `main ← codex/arena-monster-overhaul` PR을 누릅니다. **Open**이면 진행 중, **Merged**이면 병합 완료입니다.
3. 검색 결과가 없으면 [자동 PR 실행](https://github.com/kwonyoung1/pocket-friends/actions/workflows/auto-pr.yml)을 확인합니다. 생성 실패가 확인된 경우에만 [변경 비교](https://github.com/kwonyoung1/pocket-friends/compare/main...codex/arena-monster-overhaul?expand=1) → **Create pull request**를 누릅니다.

## 2. 검사와 코드 리뷰

1. PR의 **Checks**를 누릅니다. **Approve workflows to run**이 실제로 보이면 눌러 검사 실행을 허용합니다.
2. `unit`, `browser`, `cloud`, 필수 `build`가 모두 성공해야 합니다. **Expected / Pending**은 아직 완료가 아닙니다. PR 실행에서 운영용 `deploy`가 **Skipped**인 것은 정상일 수 있습니다.
3. 코드 리뷰가 필요하면 **Files changed → Submit review → Approve → Submit review**를 누릅니다. 이 버튼은 검사 실행 승인이나 운영 배포 승인과 다릅니다. 검사 도중 리뷰를 먼저 제출해도 검사를 건너뛰지는 않습니다.
4. 자동 병합이 이미 예약됐다면 기다립니다. 검사가 모두 성공하고 필요한 리뷰도 끝났는데 **Open** 상태이고 자동 병합이 예약되지 않은 경우에만 **Merge pull request → Confirm merge**를 누릅니다.
5. 실패한 검사는 이름을 눌러 빨간 단계를 펼칩니다. 실패를 무시하거나 브랜치 보호를 해제하지 않습니다.

[AGENTS.md](../AGENTS.md)는 “Security/auth, DB, secrets, economy, workflow changes and runtime deletions are protected … before the required explicit review/production approval”라고 규정합니다. 이번 변경은 서버 전투/보상 검증 경로를 포함하므로 기존 리뷰·운영 승인을 유지합니다. API 접근이 거부되면 Codex가 이 승인을 대신 누를 수 없습니다.

## 3. 병합 후 main 배포 확인

1. [main 배포 실행 목록](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml?query=branch%3Amain)을 엽니다.
2. **이번 PR을 병합한 커밋**의 최신 실행을 누릅니다. 예전 실행의 성공 표시는 이번 업데이트의 배포 증거가 아닙니다.
3. `unit → browser/cloud → build → plan → approval-config`가 성공했는지 확인합니다.
4. **Review deployments**가 보이면 누르고, `release-approval` 선택 → **Approve and deploy**를 누릅니다. 이미 승인되어 진행 중이면 다시 설정하지 않습니다.
5. **backend / functions → backend-gate → deploy**까지 성공해야 합니다. 전체 실행이 초록색이어도 `deploy`가 **Skipped**이면 웹 배포는 실행되지 않은 것입니다.

이번 작업은 `game` Edge Function이 사용하는 계산 코드를 변경하므로 **서버 배포도 필요**합니다. 변경 함수는 자동화 `plan` 결과에 따릅니다. `treasure` 의존성이 바뀌지 않았다면 불필요하게 재배포하지 않습니다. **Deploy only changed functions and verify exact SHA** 단계와 `backend-gate` 성공을 확인합니다.

## 4. Pages 배포와 실제 게임

1. 같은 main 실행에서 **deploy**를 누릅니다. Pages 발행과 **Verify live HTML, exact commit and executable assets**, 마지막 모바일 부팅 검사가 성공했는지 확인합니다.
2. [Pages 설정](https://github.com/kwonyoung1/pocket-friends/settings/pages)에서 기존 **Build and deployment → Source: GitHub Actions**가 유지되는지 확인합니다. 이미 정상이라면 바꾸지 않습니다.
3. [운영 게임](https://kwonyoung1.github.io/pocket-friends/)을 엽니다. 새로고침 후 **별빛 아레나 → 그림자 성채 / 천상의 문 / 별의 정원 / 꿈의 미궁 / 천공의 성 / 잊혀진 별의 신전**을 확인합니다.
4. 해금하지 않은 지역을 확인하려면 **연습 → 전투 레벨 선택 → 지역 → 보스전 바로 체험**을 사용합니다. 연습은 운영 보상을 지급하지 않습니다. 정식 스테이지를 시작하면 기존 규칙대로 에너지가 소모됩니다.
5. 9~14장에 실제 몬스터가 표시되고, 5장부터 강화된 패턴 예고가 나오는지 확인합니다. 진행 중이던 규칙 6 전투는 이전 난이도로 이어지고, 새로 시작한 전투부터 규칙 7입니다.
6. 업데이트 안내가 나오면 화면만 새로고침합니다. **사이트 데이터·저장 데이터 삭제, 시즌 초기화는 하지 않습니다.**

## 5. 오류가 발생한 경우에만

- **필수 검사 실패:** PR의 **Checks**에서 실패 로그를 확인합니다. 수정 커밋의 검사가 다시 통과해야 병합합니다.
- **401 Invalid access token:** [환경 설정](https://github.com/kwonyoung1/pocket-friends/settings/environments) → 기존 `cloud-backend` → `SUPABASE_ACCESS_TOKEN`을 점검합니다. 만료·폐기가 확인된 경우에만 [Supabase 토큰 페이지](https://supabase.com/dashboard/account/tokens)에서 재발급하여 **생성 직후 표시되는 전체 문자열**을 복사해 교체합니다. 가려진 기존 토큰은 복원할 수 없습니다. API publishable/secret 키로 대체하지 않습니다.
- **Pages 아티팩트 오류:** 이번 main이 포함한 업로드 단계의 Artifact ID와 Pages 발행 로그를 확인합니다. 기존 main의 직접 Artifact ID 배포 방식을 그대로 사용합니다. 구형 실행을 반복 재실행하거나 워크플로를 임의로 바꾸지 않습니다.
- **배포 실패:** 실패 로그와 커밋을 먼저 확인합니다. 이전 배포가 여전히 서비스 중인지 확인하고, 복구가 필요하면 [기존 승인된 Pages 롤백 워크플로](https://github.com/kwonyoung1/pocket-friends/actions/workflows/rollback-pages.yml)에서 검증된 이전 릴리스만 선택합니다. 서버는 이전 규칙도 보존하므로 DB/사용자 데이터를 되돌리지 않습니다.
- **자동 병합/자동 서버 배포 대기:** [Actions 변수](https://github.com/kwonyoung1/pocket-friends/settings/variables/actions), [일반 설정](https://github.com/kwonyoung1/pocket-friends/settings), [환경 설정](https://github.com/kwonyoung1/pocket-friends/settings/environments)에서 이미 승인된 상태를 확인합니다. 기존 값과 보호 규칙을 삭제하거나 끄지 않습니다.

PR 병합, Edge Function SHA 확인, Pages SHA 확인이 모두 끝나야 운영 반영 완료입니다. 이 문서 자체는 배포 성공의 증거가 아닙니다.
