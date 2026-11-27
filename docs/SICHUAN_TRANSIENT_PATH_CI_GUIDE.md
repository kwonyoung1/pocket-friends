# 사천성 일시 경로 검사 실패 — 클릭 안내

기존 [PR #55](https://github.com/kwonyoung1/pocket-friends/pull/55)에 테스트 수정만 추가한다. 새 기능 PR/서버 배포/토큰 재발급은 필요하지 않다.

원인: 약450ms 동안 표시되는 실제 SVG를 `toBeVisible()` 후 별도 `getAttribute()`로 조회했다. 두 호출 사이에 SVG가 제거되면 남은45초 제한까지 기다렸다. 수정은 클릭 전에 MutationObserver를 설치해 실제 DOM 표시 순간의 경로와 가시성을 한 번에 기록한다. 정확한 경로, 표시/제거, 서버의62타일, 코인300, 미지급 랭킹 검사는 유지한다. 게임 코드·효과 시간·서버·보상·CI 정책은 바꾸지 않는다.

로컬 확인: 같은 검사를 desktop5회·mobile5회, 총10회 반복해 모두 통과(1.0분). 제품 소스/의존성/워크플로는 `64f0f9a`와 동일하므로 직전 제품 빌드·단위·자동화/Deno 결과를 재사용하고 실패한 관찰 검사만 다시 실행했다. CI는 기존 FULL 정책에 따라 독립적으로 전체 필수 검사를 수행한다. 새 CI 성공·병합·운영 발행을 로컬 반복 통과와 혼동하지 않는다.

1. [PR #55 → Checks](https://github.com/kwonyoung1/pocket-friends/pull/55/checks)를 연다. **Commits**에서 최신 `fix: observe transient Sichuan path atomically in cloud CI` 커밋이 있는지 확인한다.
2. 최신 커밋의 **Test and deploy Pocket Friends** 실행을 선택한다. 새 커밋으로 검사가 실행되므로 예전 실패 실행의 **Re-run all jobs**를 먼저 누를 필요가 없다.
3. **Approve workflows to run**이 보일 때만 누른다. `cloud`와 필수 `build`가 성공해야 한다. 생략/우회하거나 실패를 무시하지 않는다.
4. 리뷰가 필요하면 **Files changed → Submit review → Approve → Submit review**. 이미 승인됐고 추가 승인을 요구하지 않으면 반복하지 않는다.
5. 자동 병합되면 기다린다. 필수 검사·리뷰가 끝난 뒤에도 병합되지 않을 때만 **Merge pull request → Confirm merge**를 누른다.
6. [최신 main 배포](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml?query=branch%3Amain)에서 이번 병합 커밋 실행을 연다. **Review deployments**가 보이면 `release-approval` → **Approve and deploy**를 누른다.
7. `deploy`와 운영 SHA/모바일 실행 검사 성공 후 [운영 게임](https://kwonyoung1.github.io/pocket-friends/)을 연다. 테스트 수정 자체에 서버 재배포는 필요 없으며 PR55의 누적 연출 변경은 기존 release plan이 판단한다.

계속 실패하면 최신 실행의 **cloud → 실패 단계** 로그와 `trace.zip`을 확인한다. 화면/서버 검증을 제거하거나 자동 재시도로 숨기지 않는다. GitHub API가 차단된 Codex 환경에서는 CI·병합·실제 운영 SHA를 직접 확인했다고 보고하지 않는다.

[기존 VFX 배포 안내](ARENA_VFX_DEPLOY_GUIDE.md) · [자동 배포 설정](../AUTO_DEPLOY_SETUP.md) · [Actions 설정](https://github.com/kwonyoung1/pocket-friends/settings/actions) · [환경 승인](https://github.com/kwonyoung1/pocket-friends/settings/environments).
