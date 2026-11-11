# 자동 개발·검증·배포 구축 보고

작성 기준: 2026-11-11, 조회 가능한 최신 main `09d72c2` → `feat/auto-deploy-system`.

**코드 구현/로컬 검증과 운영 활성화는 별도다. 현재 운영 자동화 검증은 미완료다.** 이 Codex 환경에서는 Git transport로 fetch/push는 가능하지만 GitHub REST/GraphQL 및 운영 URL HTTP 요청이 403으로 차단됐다. 저장소 관리자 설정·Secrets·환경 보호 상태는 읽거나 변경하지 못했다. 유효한 토큰을 새로 만들었다고 네트워크 차단이 해결된다고 가정하지 않는다.

이전 `feat/christmas-quiet-room`의 미병합 변경은 해당 브랜치에 보존하고, 이번 브랜치에서 임의로 병합/삭제하지 않았다.

## 구현 내용

1. 최신 main 기반 `codex/...` 작업 브랜치 규약, `automation:submit`의 실제 push/PR 생성·본문 갱신과 `automation:watch`의 실행 감시. API 실패를 성공으로 보고하지 않는다.
2. 신뢰한 내부 push에서 자동 PR 생성. 기본 GITHUB_TOKEN PR 이벤트 억제를 고려해 CI와 필요한 effects-lab 검사를 명시적으로 dispatch한다. 외부 fork가 운영 비밀키를 받거나 자동 병합되지 않게 한다.
3. PR head와 실제 검증 결과를 artifact 이름/커밋으로 결합한다. 신뢰한 push 또는 소유자가 시작한 smoke 증거, 모든 검사/리뷰/보호 규칙, 충돌 없음, 허용 변경 범위를 확인한 뒤 정확한 SHA를 merge API에 전달한다. 보호 경로는 자동 병합하지 않는다. 초기 AUTO_* 동의가 없으면 중단한다.
4. 병합 직후 main workflow_dispatch. main push 이벤트가 빠진 경우 15분 reconcile이 누락된 실행만 보완한다. 이미 실패한 동일 SHA를 반복 실행하지 않는다.
5. 기존 필수 검사는 삭제하지 않는다. unit 이후 브라우저/클라우드를 별도 러너에서 병렬 실행하고 최종 `build`가 모두 성공했는지 확인한다. npm/Playwright 캐시를 사용한다. 각 main 커밋은 한 번 빌드해 같은 artifact를 테스트 통과 후 배포에 사용한다. PR과 main은 서로 다른 검증 커밋이므로 main 검증은 보존한다.
6. 런타임 import dependency closure의 변경 전/후 합집합으로 game/treasure 배포 대상을 판정한다. type-only import는 제외한다. 해결되지 않는 dependency는 실패 처리한다. 최초에는 두 기존 함수에 read-only health/version을 설치한다.
7. 인증·SQL·DB·재화·배포/검증 스크립트·런타임 삭제 등 보호 변경은 명시적 release-approval이 필요하다. reviewer 없는 빈 환경 또는 조회 실패는 승인으로 보지 않는다. 정적 정책은 임의 코드의 의미적 안전성을 완전히 증명하지 않는다.
8. 같은 SHA가 이미 배포된 함수는 health로 확인해 생략한다. 변경 함수 → 함수 SHA/CORS health → 배포된 서버 SHA의 검증 main 계보 확인 및 기존/구버전 클라이언트 회귀 검사 → 웹사이트 배포 순서를 지킨다. 서버가 검증되지 않으면 새 웹사이트를 배포하지 않는다. DB/비밀키 자동 변경은 없다.
9. version.json + HTML meta + 실행 JS의 실제 HTTP 응답과 SHA 확인. 별도의 모바일 fresh browser가 네 크기에서 로그인 UI까지 boot되는지 확인한다. Supabase 쓰기 요청은 route에서 차단하며 로그인·계정 생성·코인 지급·월드 초기화는 하지 않는다. 운영 인증 후 실제 플레이를 자동 수행했다고 주장하지 않는다.
10. Actions Summary/실패 PR 댓글, 제한된 health 재시도, 명시적 runner startup_failure 1회 재시도, 검증된 artifact 웹 롤백 및 별도 승인. 종료된 Codex 세션을 Actions가 자동 재개해 코드를 고치지는 않는다. 활성 Codex 세션은 API가 될 때 최대 2회 수정·재검증한다.

## 파일

- 수정: `.github/workflows/deploy.yml`, `deploy-cloud.yml`, `deploy-treasure.yml`.
- 추가: `auto-pr.yml`, `auto-merge.yml`, `deploy-backend.yml`, `automation-smoke.yml`, `release-reconcile.yml`, `rollback-pages.yml`.
- 추가: `scripts/automation/{policy,github,backend,version,verify-site,submit,watch,tests}.mjs`, 테스트 및 Vite 타입 선언.
- 추가: `supabase/functions/_shared/{health,release}.ts`. 기존 game/treasure entry는 health wrapper만 적용하며 기존 인증/저장 handler는 보존한다. 게이트웨이 JWT 검증을 끄지 않는다.
- 수정: `vite.config.ts`(빌드 메타데이터), `package.json`(명령), `tsconfig.json`, `AGENTS.md`.
- 추가: `playwright.production.config.ts`, `deploy-tests/boot.spec.ts`, `src/cloud/health.test.ts`.
- 문서: [최초 설정](AUTO_DEPLOY_SETUP.md), [일상 사용](AUTO_DEPLOY_USER_GUIDE.md), [문제 해결/롤백](AUTO_DEPLOY_TROUBLESHOOTING.md).

## 로컬 검증

- 자동화 로직 테스트 16개: 권한/신뢰 출처, fork 차단, stale SHA 차단, 리뷰/보호 경로 차단, 정확한 head 병합 및 explicit dispatch, 서버 대상 분리, 환경 reviewer 확인, 실제 버전/asset 검사, 재시도 제한 등 통과. GitHub API는 mock으로 검증했으며 실제 병합 증거가 아니다.
- 기존 포함 전체 단위 테스트 532개 통과(health 테스트 3개 추가). 인증/보상/중복 지급 검증을 유지했다.
- TypeScript/Vite 및 기존 단어/이펙트 번들 분리 검사 통과. 기존 큰 청크 경고는 남아 있다.
- 별도 프로덕션 모드 빌드에 공개 테스트용 Supabase 설정을 사용하고 localhost에서 실제 앱으로 모바일 배포 smoke 1개 통과: 360×800, 375×812, 390×844, 412×915. 운영 Supabase에 로그인하거나 데이터를 쓰지 않았다.
- YAML 10개 syntax 및 job dependency 참조 확인. 로컬 actionlint/Deno 실행 도구는 사용할 수 없어 GitHub Actions 런타임 검증/기존 frozen Deno check는 CI에서 확인해야 한다.
- 모바일 클라우드 핵심 3개 통과: 잘못된 비밀번호 거부/개인 사진·원본 보존, 두 기기 구매 동기화/중복 구매 방지, 직접 교감/드래그 보상 분리. 로컬 fixture를 사용했다.
- 관련 없는 전체 브라우저 E2E를 로컬에서 반복 실행하지 않았다. 자동 병합 기준인 기존 전체 browser/cloud 검사 자체는 CI에 그대로 유지한다.

## 실제 운영 검증 상태

| 단계 | 상태 |
|---|---|
| 자동화 코드 작성·로컬 검증 | 완료 |
| GitHub 설정/Secrets/환경 reviewer 실제 확인·구성 | 미완료 — API 403 |
| 실제 PR 자동 생성·검사 실행·자동 병합 | 미완료 — API 403 / 초기 main 반영 전 |
| 운영 game/treasure 배포 | 미완료 — Secret/정책 설정 및 최초 승인 필요 |
| main GitHub Pages 새 배포 | 미완료 |
| 실제 URL의 새 SHA/모바일 boot 확인 | 미완료 — 운영 URL 요청도 403 |
| `automation-smoke.yml`의 전체 자동 실험 | 미완료 — 초기 설정/main 반영 후 실행 필요 |

운영 데이터·기존 Supabase 프로젝트·SQL·코인은 수정하지 않았다. 운영 시스템 구축 완료라는 표현은 위 실험과 실제 URL 검증을 통과한 뒤에만 사용할 수 있다.
