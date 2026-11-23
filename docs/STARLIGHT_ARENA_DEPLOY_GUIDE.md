[별빛 상점·신규 지역·크리스마스 배포 클릭 안내서](STARLIGHT_ARENA_EXPANSION_GUIDE.md)

# 별빛 아레나 정식 확장 — 클릭 배포 안내

최신 환수·5인 파티 업데이트는 [새 클릭 안내서](STARLIGHT_BEAST_UPDATE_GUIDE.md)를 따르세요. 아래는 이전 확장 버전의 기록입니다.

이번 버전은 보유한 실제 친구 10명, 8개 지역·40개 스테이지, 32종 적, 서버가 검증하는 보상·이어하기를 추가합니다. 기존 월드를 그대로 사용합니다. SQL 마이그레이션이나 새 Supabase 프로젝트는 필요하지 않습니다.

자동 PR·자동 병합·서버 배포가 이미 설정돼 있다면 다시 설정하지 않습니다. 아래는 진행 상태 확인과 **실제로 대기 표시가 있는 경우**에만 필요한 클릭입니다. PR 병합, 서버 배포, 웹사이트 배포는 서로 다른 단계입니다.

## 1. 이번 PR 열기

1. [이번 작업 PR 찾기](https://github.com/kwonyoung1/pocket-friends/pulls?q=is%3Apr+head%3Acodex%2Fstarlight-arena-expansion)를 누릅니다.
2. `codex/starlight-arena-expansion`에서 `main`으로 들어가는 PR을 엽니다.
3. 없다면 [자동 PR 실행](https://github.com/kwonyoung1/pocket-friends/actions/workflows/auto-pr.yml)에서 이 브랜치 실행을 확인합니다. 실행 중이면 기다립니다.
4. 자동 PR이 실패했고 열린 PR도 없을 때만 [변경 비교](https://github.com/kwonyoung1/pocket-friends/compare/main...codex/starlight-arena-expansion?expand=1) → **Create pull request**를 사용합니다.

정상 표시: PR이 **Open**이거나 이미 **Merged**입니다. 이전 작업 PR의 초록색 체크를 이번 배포로 판단하지 않습니다.

## 2. 필수 검사 확인

1. PR의 **Checks**를 누릅니다. [이 브랜치 검사 실행 목록](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml?query=branch%3Acodex%2Fstarlight-arena-expansion)에서도 열 수 있습니다.
2. **Approve workflows to run**이 보일 때만 눌러 검사를 허용합니다. 이것은 코드 리뷰·운영 배포 승인과 다릅니다.
3. `unit`, `browser`, `cloud`와 최종 필수 검사 `build`가 모두 성공해야 합니다. `Expected`·`Pending`은 아직 통과가 아닙니다.
4. 빨간 검사를 누르고 실패한 단계를 펼칩니다. 로그를 확인하고 수정을 반영한 뒤 다시 검사합니다. 검사·브랜치 보호를 끄지 않습니다.

이번 변경은 공용 전투 계산·보상 코드를 포함하므로 기존 전체 CI도 그대로 실행됩니다. 로컬 모바일 테스트 통과만으로 운영 배포 완료라고 판단하지 않습니다.

## 3. 자동 병합과 필요한 리뷰

1. PR **Overview/Conversation**에서 상태를 확인합니다. 자동 병합되면 보라색 **Merged**가 표시됩니다.
2. **Approvals — 1 still required / Review required**가 있을 때만 **Files changed** → **Submit review**(또는 **Review changes**) → **Approve** → **Submit review**를 누릅니다.
3. 작성자 본인의 승인 제한이 있으면 저장소가 허용하는 다른 리뷰어가 필요합니다. 요구 리뷰 수를 줄이거나 우회하지 않습니다.
4. 모든 조건을 만족했는데 자동 병합 대기 중이라면 실제 표시된 **Enable auto-merge** 버튼을 사용합니다. 버튼이 없고 병합 가능한 경우 **Merge pull request → Confirm merge**로 마무리할 수 있습니다.

이번 버전은 서버 명령과 재화 보상을 추가하므로 기존 `scripts/automation/policy.mjs`의 보호 대상입니다. 저장소가 요구하는 리뷰·운영 승인은 유지됩니다. Codex가 사용자 리뷰를 대신 승인하거나 보호 규칙을 바꾸지 않습니다.

자동 병합 설정을 진단할 때만 [일반 설정](https://github.com/kwonyoung1/pocket-friends/settings)과 [Actions 변수](https://github.com/kwonyoung1/pocket-friends/settings/variables/actions)에서 기존 `AUTO_PR_ENABLED`, `AUTO_MERGE_ENABLED`, `AUTO_SERVER_DEPLOY_ENABLED` 값을 확인합니다. 이미 정상인 항목은 변경하지 않습니다. 브랜치 보호는 [Branches](https://github.com/kwonyoung1/pocket-friends/settings/branches), [Rules](https://github.com/kwonyoung1/pocket-friends/settings/rules)에서 확인합니다.

## 4. 새 main 실행과 배포 승인

1. [main 배포 목록](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml?query=branch%3Amain)을 엽니다.
2. 이번 PR 병합 커밋을 포함하는 **가장 최신 main 실행**을 누릅니다.
3. 새 실행이 없다면 같은 워크플로의 **Run workflow → Branch: main → Run workflow**를 누릅니다. `validation_pr`는 비워 둡니다. 오래된 실행을 재실행하면 새 코드는 반영되지 않습니다.
4. 검사가 끝난 뒤 **Review deployments**가 보일 때만 누릅니다. `release-approval`을 선택하고 **Approve and deploy**를 누릅니다. 승인자는 저장소에 설정된 리뷰어여야 합니다.
5. 정상 순서는 `approve` → `backend / functions` → `backend-gate` → `deploy`입니다.

이 승인은 [release-approval 환경](https://github.com/kwonyoung1/pocket-friends/settings/environments)과 저장소 정책에 따른 운영 승인입니다. 설정을 삭제해서 건너뛰지 않습니다.

## 5. Supabase 서버 배포 확인 — 이번 변경에 필요

1. 같은 main 실행에서 **backend → functions**를 누릅니다.
2. **Deploy only changed functions and verify exact SHA** 단계의 성공 여부를 확인합니다. 이번 변경의 의존성 분석 결과는 `game` 배포 대상입니다. `treasure`는 실행 의존성이 바뀌지 않아 재배포가 필요하지 않습니다. 자동화의 `plan` 결과를 기준으로 배포합니다.
3. 로그의 함수별 검증 SHA가 이번 배포 커밋인지 확인합니다. `backend-gate`도 성공해야 합니다.
4. 이번 변경에서 서버 단계가 예상 밖으로 **Skipped**라면 `plan`의 변경 함수 목록과 실행 커밋을 먼저 확인합니다. 웹 화면만 바뀌어도 새 서버 명령이 없으면 정식 전투는 사용할 수 없습니다.

기존 토큰이 정상이라면 새로 만들지 않습니다. 인증 실패가 실제로 나왔을 때만 [cloud-backend 환경](https://github.com/kwonyoung1/pocket-friends/settings/environments)에서 `cloud-backend`를 열어 기존 `SUPABASE_ACCESS_TOKEN` 시크릿을 점검합니다. 만료·폐기된 경우 [Supabase Access Tokens](https://supabase.com/dashboard/account/tokens)에서 새 토큰을 발급하고, 생성 직후 한 번 표시되는 전체 문자열을 복사해 해당 시크릿의 연필 버튼으로 교체합니다. 가려진 기존 문자열은 복원할 수 없습니다. 프로젝트 API의 publishable/secret 키를 배포 토큰 대신 넣지 않습니다. 토큰을 채팅·스크린샷에 공유하지 않습니다.

## 6. GitHub Pages 성공 확인

1. 같은 main 실행에서 **deploy**를 누릅니다.
2. **actions/deploy-pages**, **Verify live HTML, exact commit and executable assets**, **Read-only live mobile boot check**가 성공했는지 확인합니다.
3. [운영 버전 정보](https://kwonyoung1.github.io/pocket-friends/version.json)의 SHA를 배포 커밋과 비교합니다.
4. [Pages 설정](https://github.com/kwonyoung1/pocket-friends/settings/pages)의 공개 주소도 확인할 수 있습니다. 기존 GitHub Actions 배포 소스는 유지합니다.

워크플로 전체가 초록색이어도 **deploy가 Skipped이면 이번 실행에서 웹 배포를 완료한 것은 아닙니다.** `Merged` 표시와 PR 검사 통과만으로도 완료가 아닙니다.

## 7. 실제 게임 확인

1. [운영 포켓프렌즈](https://kwonyoung1.github.io/pocket-friends/)를 엽니다. 평소처럼 로그인하고 **이 클라우드 월드 사용하기**를 누릅니다. 새 월드 생성·초기화·백업 덮어쓰기는 누르지 않습니다.
2. 성장·모험 메뉴에서 **별빛 아레나**를 누릅니다. 가로 메뉴가 잘리면 옆으로 밉니다.
3. 보유 친구만 표시됩니다. 기존 5명에 두두·루루·토토·별이·뭉치가 대응됩니다. 아직 입양하지 않은 친구를 자동 지급하지 않습니다.
4. 기본 **정식 도전 / 친구 실제 레벨**을 확인합니다. COST 10 이하·최대 4명·영이 또는 찬미 포함으로 편성합니다.
5. **달빛 숲으로 출발**을 누릅니다. 적 선택 후 **기본 공격**으로 진행합니다. 액티브는 Lv.30·35, 필살기는 Lv.50부터입니다.
6. 승리 후 서버 보상 확인 문구가 뜨는지 확인합니다. 다음 스테이지가 열리고 코인·출전 친구 경험치가 반영됩니다. Lv.50 친구에게는 경험치를 지급하지 않습니다.
7. 전투를 중단할 때 **편성으로 돌아가기/거실로 돌아가기**를 누릅니다. 다시 열어 **전투 이어하기**로 이어갑니다. 서버 체크포인트 이후 이 기기의 행동은 로컬에도 보관합니다. 다른 기기는 서버에 저장된 기록까지 이어갑니다.
8. 전체 지역을 미리 보려면 **연습** 또는 **전투 레벨 → 연습 Lv.35/50**를 선택합니다. 연습은 실제 보상·클리어 진행을 바꾸지 않습니다. **보스전 바로 체험**도 연습입니다.
9. 거실로 돌아가 기존 이름·사진·코인·장비·가구·기존 미니게임이 유지되는지 확인합니다.

정식 보상 한도는 **공유 월드 합산 하루 5회·최대 120코인·친구별 XP 100**입니다. 한도 뒤에도 클리어 진행은 유지되며, 미수령 첫 보상은 다음 보상 가능일에 다시 도전해 받을 수 있습니다. 첫 보스 보상에는 기존 강화석·희귀 보물이 연결됩니다. 하루 기준은 기존 게임과 같은 한국 시간입니다. 전투 티켓은 6시간 유효합니다. 실패·포기는 기존 재화를 차감하지 않습니다.

## 8. 실패했을 때

| 표시 | 클릭할 곳 / 조치 |
|---|---|
| `build Expected` | PR **Checks**에서 앞선 `unit/browser/cloud`와 워크플로 실행 승인을 확인합니다. |
| `Waiting`, `release-approval` | 위 4번의 **Review deployments**를 확인합니다. |
| `401 Invalid access token` | 위 5번의 토큰 페이지와 `cloud-backend` 시크릿을 확인합니다. 무작정 반복 실행하지 않습니다. |
| 서버 성공, Pages 실패 | 실패 로그를 확인한 뒤 해당 최신 실행의 **Re-run failed jobs**를 한 번 사용합니다. 이번 버전은 재실행별 Pages 아티팩트 이름을 유지합니다. |
| `deploy Skipped` | `plan`, `approve`, `backend-gate`와 실행 커밋을 확인합니다. 승인 거절·선행 실패를 먼저 해결합니다. |
| 사이트가 예전 화면 | `version.json`과 최신 main `deploy`부터 확인하고 새로고침합니다. 쿠키·저장 데이터 삭제로 해결하지 않습니다. |
| 보상 확인 중 네트워크 오류 | 연결 복구 후 결과 화면의 **같은 기록으로 보상 다시 확인**을 누릅니다. 서버 티켓·작업 영수증이 중복 지급을 막습니다. |
| 다른 기기의 최신 기록 오류 | 전투를 나가 공유 월드를 새로 읽고 **전투 이어하기**를 누릅니다. 오래된 로컬 기록을 서버에 덮어쓰지 않습니다. |
| 운영 장애 | [기존 승인형 웹 롤백](https://github.com/kwonyoung1/pocket-friends/actions/workflows/rollback-pages.yml)을 사용합니다. 서버 변경이 있으면 웹만 롤백하고 해결됐다고 판단하지 않습니다. 실패 로그와 서버 SHA를 함께 점검합니다. DB를 초기화하지 않습니다. |

## 최종 완료 표시

- 이번 PR **Merged**, 최신 main의 필수 CI 성공.
- 필요한 Edge Function 배포와 함수별 SHA 검증 성공.
- Pages `deploy` 성공, 공개 SHA·읽기 전용 모바일 부팅 확인 성공.
- 운영 아레나의 새 편성·지역·정식 전투 동작 확인.

이 네 가지가 확인되지 않았다면 운영 반영 완료로 보고하지 않습니다.
