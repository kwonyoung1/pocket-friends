# 할로윈 업데이트 — 클릭별 배포 안내

이번 변경은 **서버와 게임 화면을 모두 배포**해야 합니다. 순서는 **PR 생성·검사 → 새 브랜치로 서버 배포 → PR 병합 → 자동 웹사이트 배포 확인**입니다. 이미 연결한 Supabase 프로젝트와 저장 데이터를 그대로 사용하며, 새 SQL은 없습니다.

## 1. 현재 게임 보관하기

1. [현재 게임 열기](https://kwonyoung1.github.io/pocket-friends/)를 누릅니다.
2. 페이지 맨 아래 **추억 보관**을 눌러 현재 게임의 JSON 파일을 내려받아 둡니다.
3. 평소처럼 기존 클라우드 월드를 사용합니다. 업데이트를 위해 새 월드를 만들거나 백업을 다시 불러올 필요는 없습니다.

## 2. Pull Request 만들기

1. [이번 변경으로 PR 만들기](https://github.com/kwonyoung1/pocket-friends/compare/main...feat/halloween-room-placement?expand=1)를 누릅니다.
2. GitHub에 로그인되지 않았다면 오른쪽 위 **Sign in**을 눌러 `kwonyoung1` 계정으로 로그인한 뒤 위 링크를 다시 엽니다. 로그아웃 상태에서는 PR 생성 버튼이 안 보일 수 있습니다.
3. 비교 선택이 **base: main**, **compare: feat/halloween-room-placement**인지 확인합니다.
4. 초록색 **Create pull request**를 누릅니다. 제목은 `할로윈 테마 추가와 가구·보석 배치 영역 확대`로 입력합니다.
5. 설명에는 [PR 설명 초안](HALLOWEEN_PR.md)의 내용을 복사해 넣고 다시 **Create pull request**를 누릅니다. 이미 PR이 있으면 **View pull request**로 들어갑니다.
6. PR 아래쪽 **Test and deploy Pocket Friends / build**가 초록색이 될 때까지 기다립니다. 이 과정은 검사이며 아직 운영 웹사이트를 바꾸지 않습니다. 최근 실행은 약 13분 걸렸으므로 진행 중에는 중복 실행하지 않습니다.

## 3. 서버 배포하기 — 이번 기능 브랜치 선택

1. [서버 배포 화면](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy-cloud.yml)을 누릅니다. 왼쪽 **Deploy cloud backend (manual)**이 선택되어 있어야 합니다.
2. 오른쪽 **Run workflow**를 누릅니다.
3. 작은 창의 **Branch: main**을 누르고 목록에서 **feat/halloween-room-placement**를 고릅니다. 이 단계는 아직 병합 전이므로 새 서버 코드가 있는 기능 브랜치를 선택합니다.
4. 선택된 브랜치 이름을 확인한 뒤 작은 창 안의 **Run workflow**를 누릅니다.
5. 목록에 새 실행이 나타나면 제목을 누릅니다. 안 보이면 브라우저 새로고침을 한 번 합니다.
6. 실행 화면에서 선택 브랜치가 **feat/halloween-room-placement**인지 확인하고, **deploy-backend**가 초록색이며 **Success**가 나올 때까지 기다립니다.

여기까지는 Supabase의 명령 처리 서버 배포입니다. **이것만 성공했을 때 게임 화면이 그대로인 것은 정상입니다.** 다음 병합과 웹사이트 배포까지 마쳐야 새 버튼이 나타납니다.

기존 토큰·접속 비밀번호·프로젝트 ID를 사용합니다. 토큰이 유효하다면 새로 만들 필요 없습니다. 빨간색 실패라면 왼쪽 **deploy-backend → 빨간 × 단계**를 눌러 마지막 오류를 확인합니다.

- `Invalid access token`: 토큰 만료/잘못된 값입니다. Supabase에서 해당 프로젝트용 토큰을 만들고 GitHub [Actions 비밀값 설정](https://github.com/kwonyoung1/pocket-friends/settings/secrets/actions)의 **SUPABASE_ACCESS_TOKEN → 연필 → Secret 값 교체 → Update secret**을 누릅니다. 필요한 권한은 **Project Settings: Read**, **Edge Functions: Read-write**, **Edge Function Secrets: Read-write**입니다. 토큰은 채팅에 붙이지 않습니다.
- `Missing required permission(s)`: 오류에 나온 항목의 권한을 가진 토큰으로 교체합니다. 새 토큰을 저장한 뒤 서버 워크플로를 이번 브랜치로 다시 실행합니다.
- 설치의 `rate limit exceeded`: 기존 CLI 버전 `2.121.0` 고정 설정은 유지했습니다. 예전 실패 실행의 재실행 대신 위 서버 배포 목록에서 이번 브랜치로 새 실행을 만듭니다. 계속 실패하면 마지막 오류를 확인합니다.

## 4. PR 병합하기

1. [열린 PR 목록](https://github.com/kwonyoung1/pocket-friends/pulls)에서 이번 PR 제목을 누릅니다.
2. PR 검사가 초록색이고 서버 배포도 성공했는지 확인합니다.
3. PR 화면 아래 **Merge pull request → Confirm merge**를 차례대로 누릅니다. 초안이면 먼저 **Ready for review**를 누릅니다.
4. 보라색 **Merged** 표시가 나오면 main에 반영되었습니다. 이 단계로 웹사이트 배포가 자동 시작됩니다.

`Merge pull request`는 PR 목록이 아니라 **개별 PR 안쪽 아래**에 있습니다. 목록이 `Open 0`이면 위 PR 만들기 링크를 확인합니다. 이미 `Merged`라면 다시 PR을 만들지 말고 다음 배포 결과를 봅니다.

## 5. 웹사이트 배포 완료 확인

1. [웹사이트 배포 화면](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml)을 누릅니다. 왼쪽 **Test and deploy Pocket Friends**가 선택되어 있어야 합니다.
2. 맨 위의 이번 **Merge pull request …** 실행 중 파란 **main** 표시가 있는 항목을 누릅니다.
3. **build**가 검사와 빌드를 마치고 이어서 **deploy**가 실행됩니다. 두 항목 모두 초록색이고 **Success**가 나와야 완료입니다. 전체 검사로 10~15분 이상 걸릴 수 있습니다.
4. 자동 실행이 진행 중이면 **Run workflow를 또 누르지 않습니다.** `In progress`는 아직 처리 중입니다.
5. 이번 병합의 실행 자체가 없다면 이 웹사이트 배포 화면에서만 **Run workflow → Branch: main → Run workflow**로 한 번 실행합니다.

두 워크플로의 차이: **Deploy cloud backend (manual)**은 서버의 규칙을 바꾸며, **Test and deploy Pocket Friends**는 화면과 포함된 코드를 검사한 뒤 운영 게임 주소에 올립니다. 이번 업데이트는 둘 다 필요합니다. 서버 배포를 이번 브랜치에서 성공했다면 병합 후 main으로 서버를 다시 배포할 필요는 없습니다.

## 6. PC·모바일에서 확인

1. [포켓프렌즈 게임 열기](https://kwonyoung1.github.io/pocket-friends/)를 누릅니다.
2. PC는 **Ctrl + Shift + R**을 누릅니다. 모바일은 새로고침하거나 탭을 닫았다가 같은 주소로 다시 접속합니다. 사이트 저장 데이터를 삭제할 필요는 없습니다.
3. 비밀번호 화면이면 기존 비밀번호를 입력하고, 월드 확인 화면에서는 **이 클라우드 월드 사용하기**를 누릅니다.
4. **우리의 거실 → 🎃 할로윈 테마로 변경**을 누릅니다. 호박·유령과 보라색 창밖이 보이는지 확인합니다.
5. 모바일에서도 같은 월드에 들어가 같은 테마인지 봅니다. 동기화 대기 중이면 상단 **새로 동기화**를 한 번 누릅니다.
6. **인벤토리 → 보유 보석 또는 가구 → 방에 배치하기**에서 위/아래쪽으로 움직여 봅니다. 선택한 물건 본체가 바닥 안에 들어오면 가장자리 가까이 놓을 수 있습니다.
7. 기존 친구·사진·이름·코인·장비·배치·기록이 유지되는지 확인합니다. **🌿 기본 테마로 변경**을 누르면 원래 방으로 돌아갑니다.

새 버튼이 없다면 서버 성공 화면보다 먼저 **5번의 main 웹사이트 실행에 build와 deploy가 모두 초록색인지** 확인합니다. 업데이트된 화면을 여는 것으로 해결하며, 기존 월드·테이블을 삭제하거나 새로 생성하지 않습니다.
