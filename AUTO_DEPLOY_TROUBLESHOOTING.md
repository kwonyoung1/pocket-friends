# 자동화가 멈췄을 때

기본 확인 위치: [Actions](https://github.com/kwonyoung1/pocket-friends/actions), [PR 목록](https://github.com/kwonyoung1/pocket-friends/pulls), [초기 설정](AUTO_DEPLOY_SETUP.md). 실패 실행에서 빨간 job → 빨간 step을 펼친다. 비밀키나 실제 사용자 데이터를 로그/채팅에 붙이지 않는다.

| 상황 | 확인/대응 |
|---|---|
| Codex API 권한 없음 | GitHub 프로필 Settings → Applications/Installed GitHub Apps에서 저장소 선택 확인. `gh api repos/kwonyoung1/pocket-friends`가 403이면 서비스 네트워크/API 정책과 인증을 확인한다. Git push 성공만으로 API 연결 성공은 아니다. |
| PR 생성 실패 | Settings → Actions → General → Workflow permissions와 Actions의 PR 생성 허용 확인. Variables의 AUTO_PR_ENABLED=true, 브랜치 `codex/...`, TRUSTED_CODEX_ACTORS의 실제 actor login 확인. [auto-pr 실행](https://github.com/kwonyoung1/pocket-friends/actions/workflows/auto-pr.yml) Summary 확인. |
| 자동 병합 안 됨 | PR Checks의 build와 다른 필수 검사가 모두 성공인지 확인. 충돌/behind/필수 리뷰/보호 경로 변경/신뢰한 push 증거가 없으면 병합하지 않는다. Codex가 최신 main을 반영하고 재검증한다. **검사/보호를 끄는 방식은 금지**. 자동화 자체의 최초 PR은 수동 반영이 필요하다. |
| 검사 실패 | 실패 job의 로그와 diagnostics artifact 확인. Codex 세션이 살아 있고 API가 되면 최대 2회 수정·재검증. Actions는 임의의 코드를 자동 생성하지 않는다. runner startup_failure만 1회 자동 재시도할 수 있고 권한/토큰/코드/SQL 오류는 무한 재시도하지 않는다. |
| Actions가 시작되지 않음 | 저장소 Settings → Actions → General 허용 및 Actions disabled 여부 확인. 자동 PR 생성 뒤 explicit workflow_dispatch가 있는지 확인. GITHUB_TOKEN의 일반 push/PR 이벤트 억제를 고려한 코드가 들어 있다. 동일 SHA 실행이 이미 있으면 reconcile은 중복/실패 무한 재실행을 하지 않는다. |
| Pages 실패 | Settings → Pages의 Source=GitHub Actions, github-pages 환경 main 허용 확인. main 실행의 backend-gate 실패라면 웹사이트를 먼저 강제 배포하지 않는다. deploy-pages 성공 뒤 SHA/live boot step 실패도 배포 검증 실패다. |
| Supabase token 만료/Invalid access token | Settings → Environments → cloud-backend → Secrets의 SUPABASE_ACCESS_TOKEN을 같은 프로젝트의 유효한 제한 토큰으로 갱신. 기존 프로젝트를 삭제/재생성하지 않는다. 자동 재시도로 토큰 문제가 해결되지는 않는다. |
| Missing edge_functions permission | Supabase 토큰에 기존 함수 조회/배포에 필요한 권한만 추가. 자동 배포는 secrets write를 쓰지 않는다. 명시적 수동 비밀번호 갱신을 선택한 경우에만 secrets write가 필요하다. |
| 서버 배포가 skipped/실패 | main Summary에서 game/treasure 변경 판정 확인. AUTO_SERVER_DEPLOY_ENABLED=false면 서버 변경이 있는 웹사이트 배포는 멈춘다. cloud-backend 환경이 main을 허용하는지와 함수 health JWT/CORS 확인. DB 마이그레이션 오류를 DB 초기화로 해결하지 않는다. |
| release-approval에서 멈춤 | Settings → Environments → release-approval → Required reviewers가 실제 등록됐는지 확인. 빈 환경은 승인으로 보지 않는다. main Actions의 Review deployments에서 승인 담당자가 내용을 검토한다. 환경 조회만403이면 읽기 전용 ENVIRONMENT_READ_TOKEN 선택 설정을 확인한다. |
| Backend health HTTP 401/403 | 공개 **legacy anon JWT**와 프로젝트 ref가 일치하는지 확인. service_role/secret 키를 넣거나 --no-verify-jwt를 추가하지 않는다. 기존 GAME_ALLOWED_ORIGINS에 https://kwonyoung1.github.io가 있는지 확인. |
| 웹사이트만 신형/서버 구형 | main release plan 및 backend health SHA를 확인. 변경된 서버가 검증되지 않으면 새 파이프라인은 Pages 배포를 차단한다. 기존 수동 배포로 이미 불일치한 경우 Codex가 해당 SHA/호환성을 검증한 뒤 올바른 함수를 배포한다. |
| 배포 성공인데 예전 모바일 화면 | deploy의 EXPECTED_SHA 및 version.json/HTML 검사 결과 확인. [버전 메타데이터](https://kwonyoung1.github.io/pocket-friends/version.json)와 main 커밋을 비교. 새로고침/탭 재접속은 가능하지만 사이트 데이터·클라우드 월드·사진을 삭제하지 않는다. |
| live mobile boot 실패 | 실제 JS 로드/console error/로그인 UI/가로 overflow 및 공개 Supabase URL/key 설정을 확인. 이 검사는 로그인 버튼을 누르거나 운영 계정을 생성하지 않는다. 오류를 숨기기 위해 검사를 skip하지 않는다. |

## 실패 후 안전한 재개

- 서버 배포는 같은 SHA가 이미 health에 확인되면 해당 함수를 재배포하지 않는다. game만 성공하고 treasure가 실패한 경우 원인 해결 후 실패 job 재개 시 game은 생략한다.
- HTTP health/site 검사만 제한 횟수 재시도한다. 배포 명령을 권한 오류에도 무한 반복하지 않는다.
- 성공 proof가 있는 마지막 main부터 변경을 계산하므로, 실패한 배포를 완료로 간주해 필요한 서버 변경을 누락하지 않는다.
- 자동 병합 후 dispatch가 누락됐고 해당 main SHA 실행 자체가 없으면 15분 reconcile이 보완한다. 이미 실패한 실행은 사람/Codex가 원인을 확인해야 한다.

## 웹사이트 롤백

1. 기존 성공 main 실행에서 release proof와 `website-<sha>` artifact 보존 여부 확인(웹사이트 artifact 기본 14일).
2. Codex/운영자가 구버전 웹사이트와 현재 서버의 호환성을 먼저 확인한다.
3. [Approved website artifact rollback](https://github.com/kwonyoung1/pocket-friends/actions/workflows/rollback-pages.yml) → Run workflow → main → 성공 실행 ID와 **전체 SHA** 입력 → Run workflow.
4. release-approval 담당자가 Review deployments에서 승인한다. 실제 HTML/버전/엔트리 asset 확인까지 통과하는지 본다.

이 workflow는 검증된 기존 웹사이트 artifact만 배포하고 **서버/DB/코인/사용자 저장을 되돌리지 않는다**. artifact가 만료되면 실패하며 검증되지 않은 과거 코드를 임의 빌드해 배포하지 않는다. 서버를 되돌릴 필요가 있으면 기존 성공 코드로 수정/되돌림 PR을 만들고 구/신 클라이언트 호환성·서버 테스트·필수 승인을 거쳐 배포한다. DB 데이터를 과거 snapshot으로 자동 덮어쓰지 않는다.

공식 UI/권한 항목이 계정에 보이지 않으면 [초기 설정의 공식 링크](AUTO_DEPLOY_SETUP.md#공식-참고-문서)를 참고한다. 조직 정책/플랜으로 보호 기능이 없으면 무인 운영을 강행하지 않는다.

롤백 후에는 문제가 남은 main을 그대로 둔 채 다음 일반 배포를 진행하지 않는다. 소유자가 AUTO_MERGE_ENABLED를 일시 중지하고, Codex가 수정/되돌림 PR을 검증해 main을 복구한 뒤 재활성화한다. reconcile은 이미 실행된 같은 main SHA를 다시 배포해 승인 롤백을 덮어쓰지 않는다.
