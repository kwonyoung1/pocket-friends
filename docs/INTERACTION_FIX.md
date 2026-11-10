# 쓰다듬기 표정 및 모바일 드래그 회귀 수정

## 원인과 수정

- 동물의 공용 RAF가 실행된 직후 React가 쓰다듬기 표정을 반영하면 표정 속성만 `closed`가 되고 실제 생활 포즈는 다음 프레임까지 `idle`로 남았다. 표정 변경 커밋에서 보이는 동물만 경과시간 0으로 다시 그린다. 별도 타이머/RAF를 추가하지 않으며 비활성 방·화면 밖·백그라운드는 제외한다.
- 이름 변경 후 뜨는 알림이 모바일에서 남자 캐릭터의 터치 시작점을 가렸다. 실제 hit-test 결과가 캐릭터가 아닌 `.toast`였고, 터치가 브라우저 스크롤로 취소됐다. 알림 본문은 포인터 이벤트를 통과시키고 닫기 버튼만 기존처럼 받는다.
- 이름 변경/드래그 테스트는 알림이 보이는 상태에서 실제 터치로 이동하고, 알림 닫기 및 재접속 후 이동 좌표 보존까지 확인하도록 보강했다. 기존 표정·드래그·보상 검증을 제거하거나 대기시간을 늘리지 않았다.

캐릭터 원화, 저장 형식, ID, 상태 수치, 좌표 계산, 보상 규칙, 서버 코드는 변경하지 않는다. 데이터 초기화나 SQL 실행은 필요 없다.

## 배포

1. [현재 브랜치 PR 확인/생성](https://github.com/kwonyoung1/pocket-friends/compare/main...feat/mobile-winter-walk?expand=1). 이 브랜치의 기존 PR이 있으면 같은 PR에 수정 커밋이 자동으로 추가된다.
2. PR의 **Checks**가 통과한 뒤 **Merge pull request → Confirm merge**를 누른다.
3. [Test and deploy Pocket Friends](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml)에서 이번 병합으로 시작된 **main** 실행을 연다. **build**와 **deploy** 모두 초록색이 될 때까지 기다린다. 자동 실행이 있으면 Run workflow를 중복 실행할 필요 없다.
4. [게임 실행](https://kwonyoung1.github.io/pocket-friends/). PC는 Ctrl+Shift+R, 모바일은 페이지를 새로고침한다. 사이트 데이터는 삭제하지 않는다.
5. 이름을 변경한 뒤 알림이 떠 있는 동안 캐릭터를 드래그하고, 길게 쓰다듬을 때 눈 감는 모습과 하트를 확인한다.

이번 두 오류 수정 자체에는 **Deploy cloud backend (manual)** 재실행이 필요 없다. 앞선 겨울 테마 기능의 서버 업데이트를 아직 배포하지 않았다면 [겨울 테마 배포 문서](MOBILE_WINTER.md)의 서버 배포 절차를 한 번 진행한다.

## 검증 (2026-11-10)

- 실패했던 두 E2E: PC·모바일 각각 3회씩, 총 12회 통과 (`--output=/tmp/interaction-confirm`). 알림 표시 중 드래그, 닫기 버튼, 재접속 좌표 보존과 쓰다듬기 단계별 포즈/보상을 확인했다.
- 단위 테스트: `src/animals/motion.test.ts`, `src/humans/calm/motion.test.ts`, `src/interaction.test.ts` 총 22개 통과.
- 모바일 돌보기/동물 회귀: 10개 시나리오 검증. 첫 실행의 8개가 통과했으며, 나머지 2개는 병렬 테스트의 공용 진단 폴더 충돌(ENOENT)로 종료됐다. 별도 `--output=/tmp/interaction-extra`로 두 시나리오를 재실행하여 모두 통과했다. 테스트 조건은 완화하지 않았다.
- 클라우드 회귀: `cloud-tests/match3.spec.ts --project=mobile --output=/tmp/interaction-cloud-confirm` 2개 통과. 미니게임 중 방 렌더 정지와 기기 간 동기화·보상 보존을 확인했다. 테스트 서버를 이용한 검증이며 실제 운영 Supabase 데이터에 쓰지 않았다.
- `npm run build`: TypeScript, Vite, 번들 분리 검사 통과.
- 모바일 검증은 Chromium의 iPhone 화면/터치 에뮬레이션이다. 실물 Android/iPhone 검증은 수행하지 않았다. 관련 없는 미니게임 전체 테스트 및 전체 202개 E2E는 다시 실행하지 않았다.
