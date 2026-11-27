# 별빛 아레나 전투 연출 — 클릭 배포 안내

브랜치 `codex/arena-skill-vfx`, 기준 main `d7c9c45`(이전 UI 개선 PR54 병합). 요청STANDARD / 기존 공통 정책 실제 판정FULL. 서버 계산·DB·보상·저장 파일과 자동화 정책은 변경하지 않는다.

## 1. PR와 검사

1. [이번 PR 찾기](https://github.com/kwonyoung1/pocket-friends/pulls?q=is%3Apr+head%3Acodex%2Farena-skill-vfx)를 열고 `main ← codex/arena-skill-vfx`인 PR을 누른다.
2. **Files changed**에서 `src/arena/vfx`, `Battle.ts`, `Arena.tsx`, 테스트/문서를 확인한다. 기존 원화와 저장 데이터 변경은 없다.
3. **Checks**를 누른다. **Approve workflows to run**이 있을 때만 누른다. FULL의 `changes`, `unit`, `browser`, `cloud`, 필수 `build`가 성공해야 한다. 빨간 검사·취소·예상 밖 생략은 무시하지 않는다.
4. **Approval required**가 표시되면 **Files changed → Submit review → Approve → Submit review**. 검사 완료 전 리뷰 제출도 가능하지만 리뷰가 검사 성공을 대신하지 않는다.
5. 자동 병합되면 다음 단계로 이동한다. 모든 검사/필요 리뷰가 끝난 뒤에도 자동 병합되지 않을 때만 **Merge pull request → Confirm merge**를 누른다. 보호 규칙을 끄지 않는다.

PR이 없다면 [기존 자동 PR 실행](https://github.com/kwonyoung1/pocket-friends/actions/workflows/auto-pr.yml)을 확인한다. 생성 실패가 확인된 경우에만 [비교 화면 → Create pull request](https://github.com/kwonyoung1/pocket-friends/compare/main...codex/arena-skill-vfx?expand=1)를 사용한다.

## 2. 운영 배포

1. [main 배포 실행 목록](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml?query=branch%3Amain)을 연다.
2. 이번 PR의 **병합 커밋**으로 실행된 최신 **Test and deploy Pocket Friends**를 누른다. 예전 실행의 Re-run은 새 소스 배포가 아니다.
3. `build`와 `plan`을 확인한다. 이번 연출 코드 자체는 Supabase 함수 재배포 대상이 아니다. 이전 main의 미배포 변경이 있다면 기존 plan이 누적 범위로 판단한다.
4. **Review deployments**가 나올 때만 `release-approval` 선택 → **Approve and deploy**. 이미 진행 중이면 반복 설정하지 않는다.
5. `backend`가 불필요해서 **Skipped**인 것은 정상이다. `backend-gate`와 `deploy`의 SHA/HTML/JS/읽기 전용 모바일 실행 검사가 성공해야 운영 배포 완료다.
6. [운영 게임](https://kwonyoung1.github.io/pocket-friends/)을 연다. 이전 탭은 새로고침하며 브라우저 저장/DB를 삭제하지 않는다.

## 3. 새 연출 확인

1. 게임의 **별빛 아레나 → 연습**을 선택한다. 연습은 코인·에너지·진행 보상을 변경하지 않는다.
2. 보유 캐릭터를 편성하고 **전투 레벨**을50으로 선택하면 해금된 필살기를 확인할 수 있다. 미보유 캐릭터를 지급하는 절차는 아니다.
3. 지역/스테이지 선택 → **[지역명]으로 출발**. 기본 공격의 준비 동작·궤적·타격과 발밑 지면 효과를 확인한다.
4. 스킬 선택 → **선택한 스킬 사용**. 영이의 타격별 검기, 찬미의 달빛 보호/회복, 네뷸라의 성운, 피닉의 불꽃 날개, 시온의 결정, 로제의 연금 반응, 루시안의 참격, 세라피아의 수호 날개를 확인한다.
5. 오른쪽 상단 슬라이더 아이콘 **전투 연출 설정 → 그래픽 품질**에서 **낮음 / 보통 / 높음**을 선택한다. 기본 보통, 저사양/연속 프레임 지연에는 자동 축소한다. 설정을 다시 눌러 닫는다.
6. **전투 속도**를 누르면1×/2× 전환. **필살기 연출 단축**은 컷인 시간을 줄인다. 시스템의 동작 줄이기를 켜면 회전/강한 움직임/입자를 줄인다.
7. **전투 연출 설정 → 컷인 미리보기**는 피해 없이 기존 일러스트와 컷인을 확인한다. 정식 보상은 기존 서버 검증을 그대로 사용한다.

## 4. 문제가 생기면

- 새 화면이 안 보이면 이번 병합 SHA의 **deploy 성공**부터 확인하고 새로고침한다. 게임 데이터를 초기화하지 않는다.
- 느리면 **그래픽 품질 → 낮음**, **필살기 연출 단축**을 사용한다. 배속/품질은 실제 피해·확률·보상을 바꾸지 않는다.
- WebGL 오류는 최신 브라우저에서 다시 열고 실패 로그를 확인한다. 단순 연출 실패는 확정된 전투 결과를 유지하고 낮음으로 전환한다.
- CI 실패는 **Checks → 실패 job → 실패 단계**를 연다. 검사나 보안 정책을 해제하지 않는다.
- Pages 배포 실패는 실패 단계 로그를 확인한다. 필요하면 [기존 롤백 워크플로](https://github.com/kwonyoung1/pocket-friends/actions/workflows/rollback-pages.yml)를 사용한다. 운영 DB를 롤백/초기화하지 않는다.
- Codex의 API/사이트 접속403은 이 환경의 권한·네트워크 문제다. [기존 자동 배포 설정](../AUTO_DEPLOY_SETUP.md)을 참고하되 정상 토큰/Secrets/프로젝트를 재생성하지 않는다. PR·CI·병합·사이트 SHA를 각각 확인한다.

설정 확인 링크: [저장소](https://github.com/kwonyoung1/pocket-friends/settings) · [Actions](https://github.com/kwonyoung1/pocket-friends/settings/actions) · [Environments](https://github.com/kwonyoung1/pocket-friends/settings/environments) · [브랜치 보호](https://github.com/kwonyoung1/pocket-friends/settings/branches) · [Pages](https://github.com/kwonyoung1/pocket-friends/settings/pages).
