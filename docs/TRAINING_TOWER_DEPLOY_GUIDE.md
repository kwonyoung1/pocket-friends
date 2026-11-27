# 별빛 수련탑 — 클릭으로 따라가는 배포 안내

브랜치: `codex/starlight-training-tower`. 기존 토큰·Secrets·Pages 설정은 정상이라면 다시 만들지 않습니다. 이번 기능은 계정 JSON 확장이며 DB 테이블 마이그레이션·새 프로젝트 생성·데이터 초기화가 필요 없습니다.

## 1. 이번 PR 확인과 병합

1. [수련탑 PR 찾기](https://github.com/kwonyoung1/pocket-friends/pulls?q=is%3Apr+head%3Acodex%2Fstarlight-training-tower)를 엽니다. **Codex: starlight-training-tower** PR의 최신 커밋을 확인합니다.
2. **Checks**를 누릅니다. **Approve workflows to run**이 실제로 표시될 때만 변경 내용을 확인한 뒤 눌러 CI 실행을 허용합니다. `build` 등 필수 검사가 성공해야 합니다.
3. 이번 PR은 서버·보상·검증 정책 변경이 포함돼 기존 보호 규칙에 따른 명시적 리뷰가 필요합니다. **Files changed** → **Submit review** → **Approve** → 리뷰 제출 순으로 진행합니다. 자기 PR 승인 금지 등 GitHub가 제한하면 다른 적격 리뷰어가 필요합니다.
4. **Overview/Conversation** → **Merge pull request** → **Confirm merge**를 누릅니다. 이미 **Merged**면 생략합니다. 비활성 버튼을 우회하거나 필수 검사를 끄지 않습니다.
5. PR이 검색되지 않으면 [자동 PR 실행](https://github.com/kwonyoung1/pocket-friends/actions/workflows/auto-pr.yml)의 이번 브랜치 `open` 로그를 확인합니다. 자동 생성 실패가 확인된 경우에만 [브랜치 비교](https://github.com/kwonyoung1/pocket-friends/compare/main...codex/starlight-training-tower) → **Create pull request**를 사용합니다.

## 2. main의 서버·웹 배포

1. [Test and deploy Pocket Friends](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml)를 엽니다.
2. 방금 병합한 **main 커밋** 실행을 선택합니다. PR 브랜치 검사 결과와 구분합니다.
3. `changes`, `unit`, `browser`, `cloud`, `build`, `plan`을 확인합니다. **Release plan**의 함수 목록이 실제 서버 배포 대상입니다. 수련탑은 `game` 함수가 필요하며, 변경되지 않은 `treasure` 재배포를 수동으로 반복하지 않습니다. 미배포 누적 변경이 있다면 실제 plan을 따릅니다.
4. **Waiting** 및 **Review deployments**가 표시되면 누르고 **release-approval** 선택 → **Approve and deploy**를 누릅니다. 이미 승인되었다면 반복하지 않습니다.
5. `backend / functions`에서 필요한 함수의 배포 및 정확한 SHA 확인이 성공한 뒤 `backend-gate` → `deploy`가 성공해야 합니다. 필요한 서버 배포가 실패한 상태에서 Pages를 강행하지 않습니다.
6. `deploy` 안의 **Verify live HTML, exact commit and executable assets**, **Read-only live mobile boot check**까지 성공인지 확인합니다. **This job was skipped**는 배포 완료가 아닙니다.
7. [Pages 설정](https://github.com/kwonyoung1/pocket-friends/settings/pages)의 기존 게시 주소를 확인합니다. Source가 이미 **GitHub Actions**면 다시 바꾸지 않습니다.

PR 리뷰/병합·운영 승인은 [기존 저장소 작업 규칙](../AGENTS.md)과 [자동화 보호 정책](../scripts/automation/policy.mjs)에 따른 단계입니다. 수련탑 작업에서 이 보호 단계를 삭제하지 않았습니다.

## 3. 실제 수련탑 사용 확인

1. [운영 포켓프렌즈](https://kwonyoung1.github.io/pocket-friends/)를 열고 새로고침합니다. 오래 열린 다른 기기의 탭도 새로고침합니다. 저장 데이터를 지우거나 새 월드로 초기화하지 않습니다.
2. 기존 접속 비밀번호로 입장 → **별빛 아레나** → **별빛 수련탑**을 누릅니다.
3. 최고층·최근층·누적 승리·친구별 숙련도를 확인합니다. 처음에는 최고 클리어0층, 도전 가능1층입니다.
4. **훈련 층** 입력 또는 **-10층/-1층/+1층/+10층**, **최고층 바로 가기**, **최근 훈련 층**으로 층을 고릅니다. 최고 클리어보다 한 층 높은 곳까지만 가능합니다.
5. 기존 편성 규칙에 맞춰 친구를 고르고 **수련 시작 · 에너지 0**을 누릅니다. 기존 레벨·성급·훈련·장비·스킬 강화가 적용됩니다. 수련탑에서는 임의의 연습 레벨을 고를 수 없습니다.
6. 스킬 → 대상 → **선택한 스킬 사용**으로 직접 전투합니다. 입장 에너지0과 스킬용 별빛은 별개입니다. 스킬용 별빛은 기본 공격으로 회복합니다.
7. 승리하면 서버 확인 후 숙련 XP·숙련 레벨·능력치 증가율·누적 승리가 나옵니다. **같은 층 다시 훈련**, **다음 층 도전**, **수련탑으로 돌아가기**를 사용합니다.
8. 다른 기기에서 같은 비밀번호로 접속해 최고층·숙련도가 공유되는지 확인합니다. 진행 중인 전투는 **전투 이어하기**로 재개합니다. 동시에 다른 행동 기록을 보내 충돌하면 최신 기록을 다시 불러옵니다.
9. 숙련 보너스는 새 일반 아레나 전투에도 적용됩니다. 진행 중이던 구규칙9 전투는 입장 당시 능력치로 끝내며, 새 화면에서 시작한 전투는 규칙10입니다. 기존 레벨·성급·기존 요정 마스터리는 초기화되지 않습니다.

## 4. 선택적 CI가 적용됐는지 확인

1. Actions의 **changes** → **Validation policy** 요약/`plan.json`을 확인합니다. `mode`는 강도, `scope`와 선택자 목록은 범위입니다.
2. 정책을 처음 바꾸는 이번 PR은 기존 trusted main/base가 전체 CI를 요구할 수 있습니다. 이 독립 검사를 생략하지 않습니다.
3. 새 정책이 main에 병합된 뒤 수련탑 내부만 바꾸는 PR은 FULL이어도 아레나·수련탑 브라우저/클라우드 범위만 선택합니다. 단순 기존 적 수치는 FAST, 확인된 순수 수련탑 UI 수정은 STANDARD로 분류할 수 있습니다.
4. 공통 저장·인증·디스패처, 워크플로/정책/도구, 알 수 없는 의존성·분석 실패는 전체로 복귀합니다. FULL의 단위·Deno·자동화·빌드와 필수 job 성공 확인은 유지합니다.
5. 실제 GitHub 실행 시간과 배포 총시간은 해당 실행에서 확인합니다. 테스트 개수 감소를 시간 절감률로 읽지 않습니다.

## 5. 문제가 생겼을 때

|표시|클릭과 조치|
|---|---|
|PR Checks 실패|**Checks** → 빨간 검사 → 실패 단계 로그를 확인합니다. 실패를 무시하고 병합하지 않습니다.|
|main Waiting|**Summary** → **Review deployments** → release-approval 승인.|
|backend 실패/Skipped|실제 plan의 함수와 서버 배포 권한을 확인합니다. [기존 자동 배포 설정 안내](../AUTO_DEPLOY_SETUP.md)를 오류가 가리키는 항목에만 적용합니다.|
|Invalid access token|[Supabase Access Tokens](https://supabase.com/dashboard/account/tokens)와 [GitHub Environments](https://github.com/kwonyoung1/pocket-friends/settings/environments)를 확인합니다. 프로젝트 publishable/secret key와 배포 Access Token은 다릅니다. 값은 채팅에 붙이지 않습니다. 정상인 토큰을 새로 만들 필요는 없습니다.|
|사이트가 이전 화면|최신 main의 deploy 및 live SHA 성공부터 확인한 뒤 사이트를 새로고침합니다. 실패/Skipped는 캐시 삭제로 해결되지 않습니다.|
|진행 중 전투가 있음|**전투 이어하기**로 끝내거나 **진행 중 전투 포기**를 선택합니다. 수련 포기는 연승 보너스만 초기화하고 숙련 XP·재화를 보존합니다.|
|잠긴 층|**최고층 바로 가기** 또는 **최근 훈련 층**으로 복귀합니다. DB에서 최고층을 임의 수정하지 않습니다.|
|보상 확인 중/연결 끊김|같은 기록으로 **보상 다시 확인**을 사용하거나 재접속 후 이어합니다. 중복 XP를 만들려고 다른 결과를 제출하지 않습니다.|

구현·검증 수치와 운영 확인 범위는 [수련탑 결과 보고서](TRAINING_TOWER_REPORT.md)에 기록합니다. 로컬 통과, 원격 CI, 병합, game 배포, Pages 및 실제 접속 확인은 각각 구분합니다.
