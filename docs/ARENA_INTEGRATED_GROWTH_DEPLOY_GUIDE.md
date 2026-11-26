# 별빛 아레나 통합 성장 업데이트 — 클릭 배포 안내

작업 브랜치: `codex/arena-integrated-growth`. 검증 등급 FULL. 실제 사용자 데이터를 초기화하는 버튼이나 SQL은 필요하지 않습니다. 기존 정상 토큰·환경 설정은 다시 만들지 마세요.

## 1. 변경 PR과 필수 검사

1. [이번 작업 PR 찾기](https://github.com/kwonyoung1/pocket-friends/pulls?q=is%3Apr+head%3Acodex%2Farena-integrated-growth)를 엽니다. `main ← codex/arena-integrated-growth`를 선택합니다.
2. **Files changed**에서 합성/패시브/전투 규칙 및 이 안내서를 확인합니다. 이전 진행 중 전투의 `legacy-v7` 복사본은 호환성 보존용입니다.
3. **Checks**를 엽니다. **Approve workflows to run**이 표시될 때만 눌러 실행합니다. `changes`, `unit`, `browser`, `cloud`, 필수 `build`가 성공해야 합니다. 이번 변경은 FULL이므로 browser/cloud 생략으로 통과하면 안 됩니다.
4. 리뷰가 필요하면 **Files changed → Submit review → Approve → Submit review**를 클릭합니다. 리뷰는 검사 완료 전 제출해도 되며 필수 검사 결과를 대신하지 않습니다.
5. 자동 병합이 예약돼 있으면 기다립니다. 모든 검사와 리뷰가 끝났는데 자동 병합되지 않을 때만 **Merge pull request → Confirm merge**를 클릭합니다.

자동화가 PR을 아직 생성하지 않았다면 [자동 PR 실행](https://github.com/kwonyoung1/pocket-friends/actions/workflows/auto-pr.yml)에서 이 브랜치 실행을 먼저 확인합니다. 생성 실패가 확인된 경우에만 [비교 화면 → Create pull request](https://github.com/kwonyoung1/pocket-friends/compare/main...codex/arena-integrated-growth?expand=1)를 사용합니다.

## 2. 서버와 사이트 함께 배포

1. [main 배포 실행 목록](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml?query=branch%3Amain)을 엽니다.
2. **이번 PR 병합 커밋** 실행을 선택합니다. 예전 실행의 Re-run은 새 코드를 적용하지 않습니다.
3. `build`, `plan`, `approval-config` 성공을 확인합니다. 이번에는 서버 명령·전투 검증이 바뀌므로 **game Edge Function 배포가 필요**합니다. 공유 의존성에 따른 정확한 함수 목록은 `plan`에 표시됩니다.
4. **Review deployments**가 보이면 클릭 → `release-approval` 선택 → **Approve and deploy**를 클릭합니다. 이미 승인/실행 중이면 추가 설정하지 않습니다.
5. `backend / functions`, `backend-gate`, `deploy`를 확인합니다. 필요한 함수 배포·SHA 상태 확인이 실패하면 웹 배포를 강행하지 않습니다. `deploy` 안의 운영 HTML/JS/SHA 및 읽기 전용 모바일 검증도 성공해야 완료입니다.
6. [운영 게임](https://kwonyoung1.github.io/pocket-friends/)을 엽니다. 서버 배포 후 이전 탭에서 업데이트 안내가 나오면 새로고침합니다. **사이트 데이터 삭제·저장 초기화는 하지 않습니다.**

이번 기능은 기존 저장 JSON의 모험가에 선택적 `stars` 필드를 추가합니다. Supabase DB 테이블/스키마 변경, SQL 실행, 재화 보정/소급 조각 지급은 없습니다. 기존 1~7 규칙 티켓은 원래 계산식으로 이어지고 새 전투만 규칙 8입니다.

## 3. 게임에서 확인할 내용

1. **별빛 아레나 → 요정 도감 · 보물상자 → 요정 합성 → 모험가 합성**을 엽니다.
2. **합성할 모험가**에서 보유한 캐릭터를 선택합니다. 현재 성급/레벨/보유 조각/필요 조각/전후 능력치가 표시돼야 합니다. 조각이 충분할 때만 `★2로 합성` 등의 버튼이 활성화됩니다. 실제 합성은 기존 조각을 소비하므로 확인만 할 때는 누를 필요 없습니다.
3. 편성 화면의 영이·찬미에서 **스킬 · 해금 정보**를 엽니다. 영이 ATK +20은 추가 타격 70%, +30은 85%; 찬미 DEF +20은 보호막 대상별 1회 차단 2턴, +30은 3턴/차단 후 작은 보호막입니다. 세 능력치 +20 여부도 구분 표시합니다.
4. **연습**에서 후반 챕터를 선택하면 진행/재화 소비 없이 적 5~6마리와 대상 선택을 확인할 수 있습니다. 높은 챕터는 성장한 편성으로 확인하세요. 기본 2인 무강화 파티의 생존을 보장하는 난이도가 아닙니다.
5. 정식 전투의 합성/강화 효과는 **다음 입장부터** 적용됩니다. 진행 중 전투는 입장 당시 성장과 규칙을 유지합니다. 다른 기기는 동일 공유 비밀번호로 들어와 새로 동기화하면 같은 성급을 읽습니다.

## 4. 오류가 보일 때

- 빨간 검사: **Checks → 실패 job → 실패 단계**의 로그를 확인합니다. CI 실패를 무시하고 병합하지 않습니다.
- FULL/필수 build 실패: 위험 등급을 FAST로 낮추거나 보호 규칙을 해제하지 않습니다.
- 서버 배포 실패: `backend / functions`의 오류를 먼저 확인합니다. `Invalid access token`이 실제로 나오는 경우에만 [cloud-backend 환경을 찾는 화면](https://github.com/kwonyoung1/pocket-friends/settings/environments)과 [Supabase 토큰 페이지](https://supabase.com/dashboard/account/tokens)를 참고합니다. 토큰은 채팅에 붙여넣지 않습니다. 현재 정상인 토큰은 갱신하지 않습니다.
- Pages 실패: `deploy`의 실제 실패 단계를 확인합니다. 아티팩트가 성공 업로드됐는지와 이번 실행/시도의 이름·ID를 함께 확인하며, 과거 아티팩트 삭제부터 하지 않습니다.
- 새 클라이언트가 서버보다 앞서 있거나 업데이트 안내: 배포 목록에서 서버와 사이트가 같은 커밋인지 확인합니다. 새로고침 후 계속되면 로그/SHA를 확인합니다. 로컬 저장을 삭제하지 않습니다.
- 동일 합성 응답 유실: 게임에 표시된 **같은 작업 다시 시도** 또는 **같은 합성 작업 다시 확인**을 사용합니다. 동일 operation의 영수증으로 조회하며 다시 재료를 소비하지 않습니다.
- 운영 문제가 확인되면 [기존 승인된 사이트 롤백](https://github.com/kwonyoung1/pocket-friends/actions/workflows/rollback-pages.yml)을 확인합니다. 규칙 8 서버는 이전 웹 클라이언트를 갱신하도록 요구하므로 **웹만 이전 버전으로 되돌리고 서버가 맞는다고 가정하지 마세요**. 서버 호환성까지 확인한 수정/복구 배포가 필요하며, DB/사용자 데이터는 되돌리지 않습니다.

기존 [AGENTS.md](../AGENTS.md)는 economy/security/runtime changes에 대해 “before the required explicit review/production approval”를 요구합니다. 조각 차감과 서버 검증 변경이므로 이 보호 절차를 유지합니다. Codex의 GitHub API가 403으로 차단되면 푸시/PR 생성과 CI/병합/운영 확인을 구분해 보고합니다. 설정 문서를 열어도 Codex에 권한이 자동으로 생기지는 않습니다.

설정 바로가기: [저장소](https://github.com/kwonyoung1/pocket-friends/settings) · [Actions 권한](https://github.com/kwonyoung1/pocket-friends/settings/actions) · [환경 승인](https://github.com/kwonyoung1/pocket-friends/settings/environments) · [브랜치 보호](https://github.com/kwonyoung1/pocket-friends/settings/branches) · [Pages](https://github.com/kwonyoung1/pocket-friends/settings/pages) · [기존 자동 배포 안내](../AUTO_DEPLOY_SETUP.md)
