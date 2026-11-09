# 장비30강 업데이트 배포 — 클릭 순서

이번 업데이트는 **PR 병합 + 서버 배포 + 웹사이트 자동 배포 확인**입니다. **Supabase SQL Editor에서 실행할 새 SQL은 없습니다.** 기존 프로젝트·월드·비밀번호·변수를 그대로 사용합니다.

## 1. PR 만들기

1. [PR 생성 화면 열기](https://github.com/kwonyoung1/pocket-friends/compare/main...feat/equipment-enhancement-30?expand=1).
2. 오른쪽 위 **Sign in**이 있으면 `kwonyoung1` 계정으로 로그인합니다.
3. **base: main**, **compare: feat/equipment-enhancement-30**인지 확인합니다.
4. 초록 **Create pull request**를 누릅니다.
5. 제목: `feat: add +30 equipment enhancement and retire word minigame`.
6. 본문은 [준비한 PR 설명](ENHANCEMENT_30_PR.md)을 복사하고 **Create pull request**를 누릅니다.

이미 PR이 있다면 [열린 PR 목록](https://github.com/kwonyoung1/pocket-friends/pulls)에서 제목을 눌러 다음 단계로 가세요.

## 2. 검사 확인하고 병합

1. 해당 PR의 **Conversation** 탭 아래쪽으로 내립니다.
2. **Test and deploy Pocket Friends / build**가 노란색이면 실행 중입니다. 초록색으로 바뀔 때까지 기다립니다. PR 검사에서는 deploy가 skipped여도 정상입니다.
3. 빨간색이면 병합하기 전에 실패한 검사명을 눌러 오류를 확인합니다.
4. 초록색이면 **Merge pull request → Confirm merge**를 누릅니다.
5. 보라색 **Merged** 표시가 보이면 완료입니다. PR 목록에는 Merge 버튼이 없으므로 PR 내부에서 확인하세요.

## 3. 서버 배포 — 반드시 한 번 실행

화면뿐 아니라 강화·탐험·판매·영단어 명령 차단을 서버에 반영해야 합니다.

1. [Deploy game update (manual) 열기](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy-treasure.yml).
2. 오른쪽 **Run workflow** 클릭.
3. **Use workflow from / Branch**에서 **main** 선택.
4. 아래 초록 **Run workflow** 클릭.
5. 새 실행 제목을 누르고 **deploy-treasure**가 초록색 **Success**가 되면 완료입니다.

이 기존 워크플로는 game과 treasure를 배포합니다. 이번 변경은 game 쪽이며 treasure 코드는 그대로입니다. 비밀번호나 DB를 초기화하지 않습니다. 이 워크플로가 성공하면 **Deploy cloud backend (manual)을 추가 실행할 필요는 없습니다**.

토큰 오류라면 [Actions Secrets](https://github.com/kwonyoung1/pocket-friends/settings/secrets/actions)의 기존 `SUPABASE_ACCESS_TOKEN` 만료 여부를 확인하세요. Supabase 토큰의 **Edge Functions: Read-write** 권한이 필요합니다. 비밀값을 채팅에 보내지 마세요.

## 4. 웹사이트 배포 확인

1. [Test and deploy Pocket Friends 열기](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml).
2. 최상단에서 **main**, 제목 **Merge pull request ...**인 실행을 누릅니다. 기능 브랜치 PR 검사와 구별하세요.
3. **build·deploy가 모두 초록색 Success**가 되면 완료입니다.
4. 병합하면 자동 시작합니다. 이미 실행 중이거나 성공했다면 **Run workflow를 다시 누르지 않습니다**. 자동 실행이 아예 없을 때만 **Run workflow → main → Run workflow**를 한 번 누르세요.

서버 워크플로는 Supabase에 계산 규칙을, 웹사이트 워크플로는 GitHub Pages에 화면을 올립니다. 이번에는 둘 다 완료해야 합니다. 진행은 GitHub 서버에서 계속되므로 PC를 꺼도 됩니다.

## 5. PC·모바일 확인

1. [게임 열기](https://kwonyoung1.github.io/pocket-friends/).
2. PC는 **Ctrl+Shift+R**, 모바일은 게임 탭을 닫고 주소를 다시 엽니다. 저장 데이터/사이트 데이터를 삭제하지 마세요.
3. 기존 캐릭터·코인·장비·보물 수량을 확인합니다.
4. **캐릭터 성장 → 장비 → 보유 카드의 강화·상세**를 누릅니다. +0과 다음 비용/확률이 표시되어야 합니다. 기존 장비 강화가 새로 생긴 것이므로 처음에는+0이 정상입니다.
5. +20까지는 강화석0개로 가능하고, +21부터 부족하면 강화석 부족이 표시됩니다. 강화석 수량은 인벤토리에도 보입니다.
6. 메뉴에서 영단어 탐험/오답노트가 사라져야 합니다. 사천성/보물3매치는 그대로 사용합니다.

장비가 없으면 고대 동굴 이상의 탐험에서 획득해야 합니다. 진행 중인 옛 탐험에는 새 강화석을 소급 추가하지 않으므로 업데이트 후 새로 출발한 탐험에서 확인하세요.

`지원하지 않는 게임 명령`이 뜨면 웹사이트만 먼저 새로워지고 서버가 아직 예전 버전일 수 있습니다. 3번의 main 실행 성공 여부를 확인하세요. 성공한 워크플로를 반복 실행하거나 새 Supabase 프로젝트를 만들 필요는 없습니다.
