# 별빛 아레나 모바일 화면 개선 — 클릭 배포 안내

작업 브랜치: `codex/arena-mobile-polish`. 요청 STANDARD / 공통 정책의 실제 판정 FULL. 새 배치 모듈과 회귀 테스트는 기존 보수적 판정 정책의 FULL 대상입니다. 판정/보안 정책을 변경하거나 검사를 강제로 생략하지 않습니다.

## 1. 변경과 검사 확인

1. [이번 PR 찾기](https://github.com/kwonyoung1/pocket-friends/pulls?q=is%3Apr+head%3Acodex%2Farena-mobile-polish)를 엽니다. `main ← codex/arena-mobile-polish`를 선택합니다.
2. **Files changed**에서 `battle-layout.ts`, `Battle.ts`, `polish.css`, `Arena.tsx`와 검증/안내서를 확인합니다. 원화와 배경 이미지는 재사용합니다.
3. **Checks**를 클릭합니다. **Approve workflows to run**이 표시될 때만 누릅니다. 이번 실제 판정 FULL에서는 `changes`, `unit`, `browser`, `cloud`, 필수 `build`가 성공해야 합니다.
4. 리뷰가 필요하면 **Files changed → Submit review → Approve → Submit review**를 누릅니다. 검사가 끝나기 전에 리뷰를 제출해도 됩니다. 리뷰가 필수 검사를 대신하지 않습니다.
5. 자동 병합이 예약돼 있으면 기다립니다. 검사/리뷰 완료 후에도 자동 병합되지 않을 때만 **Merge pull request → Confirm merge**를 누릅니다.

PR 생성이 아직 확인되지 않으면 [자동 PR 워크플로](https://github.com/kwonyoung1/pocket-friends/actions/workflows/auto-pr.yml)를 먼저 확인합니다. 생성 실패가 확인된 경우에만 [비교 → Create pull request](https://github.com/kwonyoung1/pocket-friends/compare/main...codex/arena-mobile-polish?expand=1)를 사용합니다.

## 2. 운영 배포

1. [main 배포 목록](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml?query=branch%3Amain)을 엽니다.
2. **이번 PR 병합 커밋**의 최신 실행을 선택합니다. 예전 실행 Re-run으로 새 코드를 배포하지 않습니다.
3. `build`, `plan`을 확인합니다. 이 작업은 렌더러·레이아웃·표시 UI만 바꾸므로 새 Supabase 함수 배포는 필요하지 않습니다. 이전 main의 미배포 서버 변경이 있다면 기존 `plan`이 별도로 판단합니다.
4. **Review deployments**가 표시되면 `release-approval` 선택 → **Approve and deploy**를 누릅니다. 이미 승인돼 진행 중이면 다시 설정하지 않습니다.
5. `backend`가 필요 없어서 **Skipped**인 것은 정상입니다. `backend-gate`, `deploy`와 그 안의 운영 SHA/HTML/JS/읽기 전용 모바일 실행 검사가 성공해야 완료입니다.
6. [운영 게임](https://kwonyoung1.github.io/pocket-friends/)을 엽니다. 이전 탭은 새로고침합니다. 저장 데이터·브라우저 데이터를 삭제하지 않습니다.

## 3. 게임에서 새 화면 확인

1. **별빛 아레나**를 누릅니다. 남청색 패널과 금빛 선택 테두리, 편성 카드/상점/도감/결과 패널의 통일된 디자인을 확인합니다.
2. **연습** 선택 → 파티를 편성하고 지역을 선택합니다. 후반 스테이지는 실제 성장한 편성으로 확인하세요. 기존 난이도와 보상 규칙은 그대로입니다.
3. **불꽃 협곡** 또는 **얼어붙은 설원**에서 출발합니다. 넓어진 바닥 영역, 발밑 그림자, 지면 위 진형을 확인합니다.
4. 적 카드나 필드의 적을 누릅니다. 같은 번호가 필드 이름표와 하단 카드에 표시됩니다. 금빛 원은 주 대상, 푸른빛 원은 스킬 범위입니다.
5. 필드 오른쪽 **대상 정보 · 번호**를 누르면 선택한 적의 전체 이름, HP, 약점, 상태 이상, 다음 공격 예고가 펼쳐집니다. 같은 버튼으로 닫습니다.
6. 스킬을 선택하고 **선택한 스킬 사용**을 누릅니다. 기존 범위·피해·패시브·보상은 유지하며 배치와 연출 위치만 개선됩니다.
7. **편성으로 돌아가기**로 돌아와 **보스전 바로 체험**을 누르면 보스 중심과 호위 진형을 확인할 수 있습니다. 연습은 에너지·보상·진행 기록을 변경하지 않습니다.
8. 화면 크기가 바뀌면 전장을 다시 배치합니다. 이미 진행 중인 공격은 마친 후 새 크기를 적용합니다. 짧은 화면/큰 글꼴에서는 필요하면 세로 스크롤해 기존 기능을 사용할 수 있습니다.

## 4. 실패 시 확인

- 빨간 검사: **Checks → 실패 job → 실패 단계**에서 로그/trace를 확인합니다. 필수 검사 실패를 무시하고 병합하지 않습니다.
- 새 스타일이 안 보임: 이번 **병합 커밋**의 deploy 성공 여부를 먼저 확인하고 새로고침합니다. DB나 브라우저 저장을 초기화하지 않습니다.
- WebGL 준비 오류: 게임 안내대로 최신 브라우저에서 다시 엽니다. 데이터 초기화는 하지 않습니다. 저사양 기기는 **전투 연출 설정 → 풍부한 이펙트**를 끌 수 있고 시스템의 동작 줄이기도 지원합니다.
- 배포가 대기 중: 위 `release-approval` 승인 여부를 확인합니다. 원래 승인 규칙이나 보호를 해제하지 않습니다.
- 배포 실패: 실패한 SHA와 단계 로그를 확인합니다. 필요한 경우 [기존 승인된 사이트 롤백](https://github.com/kwonyoung1/pocket-friends/actions/workflows/rollback-pages.yml)을 사용합니다. 운영 데이터는 되돌리지 않습니다.
- Codex의 GitHub API/운영 조회가 403인 경우: [기존 자동 배포 안내](../AUTO_DEPLOY_SETUP.md)를 참고합니다. 푸시와 PR 생성, CI, 병합, 운영 SHA 확인은 각각 별도 단계입니다. 설정 문서를 열어도 Codex에 권한이 자동으로 생기지는 않습니다.

이 작업 때문에 Supabase 토큰/비밀번호/DB 구조를 바꾸거나 기존 정상 설정을 다시 만들 필요는 없습니다.

설정 링크: [저장소](https://github.com/kwonyoung1/pocket-friends/settings) · [Actions](https://github.com/kwonyoung1/pocket-friends/settings/actions) · [환경 승인](https://github.com/kwonyoung1/pocket-friends/settings/environments) · [브랜치 보호](https://github.com/kwonyoung1/pocket-friends/settings/branches) · [Pages](https://github.com/kwonyoung1/pocket-friends/settings/pages).
