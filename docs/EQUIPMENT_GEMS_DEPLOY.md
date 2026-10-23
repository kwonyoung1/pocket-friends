# 이번 업데이트 배포 — 누를 버튼 순서

이번에는 탐험 보상·장비 소유·배치 수량을 검증하는 서버 코드도 바뀌었습니다. **서버 배포 1회 → PR 병합 → 자동 웹사이트 배포** 순서입니다. 이전의 화면 흐려짐 수정과 달리 서버 배포도 필요합니다.

## 1. 기존 데이터 파일 보관

[현재 게임 열기](https://kwonyoung1.github.io/pocket-friends/) → 페이지 맨 아래 **추억 보관**을 눌러 파일을 내려받아 보관하세요. 새 월드를 만들거나 데이터를 초기화하는 버튼은 누르지 않습니다. 이 단계는 추가적인 수동 안전 사본이며, 업데이트는 기존 클라우드 월드를 그대로 사용합니다.

## 2. Pull Request 만들기

1. [이번 변경으로 PR 만들기](https://github.com/kwonyoung1/pocket-friends/compare/main...feat/equipment-gems-regions?expand=1)를 누릅니다.
2. 위쪽이 `base: main`, `compare: feat/equipment-gems-regions`인지 확인합니다.
3. 제목을 `탐험 지역·장비·보석 배치·가구 레이어 추가`로 입력하고 초록색 **Create pull request**를 누릅니다. 이미 PR이 있으면 **View pull request**로 들어갑니다.
4. 아래쪽 **Test and deploy Pocket Friends / build** 검사가 완료되어 초록색이 될 때까지 기다립니다. 검사 중에는 병합하지 않습니다. PR 검사에서는 웹사이트를 운영 주소에 배포하지 않습니다.

## 3. 서버 배포 — 이번 기능 브랜치를 선택

1. [서버 배포 화면 열기](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy-cloud.yml)를 누릅니다.
2. 오른쪽 초록색 **Run workflow**를 누릅니다.
3. 펼쳐진 창의 **Branch: main** 선택 부분을 누릅니다.
4. 목록 또는 검색창에서 **feat/equipment-gems-regions**를 찾아 선택합니다. **이 단계에서는 main이 아닙니다.** 새 서버 코드가 들어 있는 이번 기능 브랜치여야 합니다.
5. 선택된 이름을 확인하고 창 안의 초록색 **Run workflow**를 누릅니다.
6. 잠시 뒤 새 실행 항목이 생기면 누릅니다. 목록이 그대로라면 브라우저 새로고침을 한 번 합니다.
7. **deploy-backend**가 초록색이고 **Success**가 표시될 때까지 기다립니다. 이 단계가 완료되기 전에는 다음 병합을 진행하지 않습니다.
8. 빨간색 실패가 나오면 실행 항목 → **deploy-backend** → 빨간 × 단계 펼치기 → 마지막 오류 문구를 복사해 알려 주세요. 같은 실행을 반복하기 전에 원인을 확인합니다.

기존 `SUPABASE_ACCESS_TOKEN`, 프로젝트 ID, 접속 비밀번호를 재사용합니다. 기존 토큰이 만료되지 않았다면 새로 만들 필요는 없습니다. 이 업데이트용으로 SQL Editor에서 실행할 새 SQL은 없습니다.

## 4. main에 병합

1. [Pull requests 목록 열기](https://github.com/kwonyoung1/pocket-friends/pulls) → 이번 PR 제목을 누릅니다.
2. 검사 결과가 초록색이고 충돌이 없는지 확인합니다.
3. 아래쪽 **Merge pull request** → **Confirm merge**를 차례대로 누릅니다.
4. `Merged` 표시가 나오면 병합 완료입니다.

## 5. 웹사이트 자동 배포 확인

1. [웹사이트 배포 목록 열기](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml)를 누릅니다.
2. 가장 위의 이번 `Merge pull request ...` 실행이며 파란 **main** 표시가 있는 항목을 누릅니다.
3. **build**와 **deploy**가 모두 초록색이 될 때까지 기다립니다. 브라우저 테스트가 포함되어 수 분 걸릴 수 있습니다.
4. 병합하면 자동 실행되므로 **Run workflow를 다시 누르지 않습니다.** 진행 중인 같은 작업을 중복 실행할 필요가 없습니다.
5. 만약 이번 병합 실행 자체가 없다면 이 웹사이트 워크플로에서만 **Run workflow → main → Run workflow**로 수동 실행할 수 있습니다.

## 6. PC·모바일에서 새 화면 열기

1. [게임 열기](https://kwonyoung1.github.io/pocket-friends/)를 누릅니다.
2. PC는 **Ctrl + Shift + R**로 강력 새로고침합니다. 모바일도 새로고침하거나 탭을 닫은 뒤 같은 주소로 다시 접속합니다.
3. 비밀번호 화면이 나오면 기존 접속 비밀번호를 입력합니다.
4. 월드 선택 화면에서는 **이 클라우드 월드 사용하기**를 누릅니다. **새 공유 월드로 시작하기**를 선택하지 않습니다.
5. **탐험**에서 수정 광산·잊혀진 신전·별빛 성역이 보이는지 확인합니다. 해당 친구가 Lv.20/25/30 미만이면 잠겨 있는 것이 정상입니다.
6. **캐릭터 성장 → 장비** 탭을 확인합니다. 장비는 자동 지급되지 않으므로 아직 없을 수 있습니다. 고대 동굴 이상으로 새 탐험을 보내 발견해야 합니다. 이미 출발했던 탐험은 원래 보상 그대로 끝납니다.
7. 보석이 있다면 **인벤토리 → 보물 → 방에 배치하기**로 배치하고 **가구 편집 → 배치 아이템 선택**에서 개별 편집을 확인합니다.
8. PC와 모바일의 장비·배치 상태가 일치하는지 확인합니다. 다른 기기 화면 갱신에 잠시 걸리면 상단 **새로 동기화**를 누릅니다.

`최신 게임으로 새로고침해 주세요` 문구가 나오면 오래 열린 이전 화면입니다. 새로고침해서 사용하세요. 게임 데이터 초기화나 Supabase 테이블 삭제로 해결하지 않습니다.

## CLI 설치에서 `rate limit exceeded`가 나온 경우

`Failed to resolve latest Supabase CLI release: rate limit exceeded`는 Supabase 토큰 검사 전에, 설치 도구가 GitHub의 최신 버전 조회 한도에 걸렸다는 뜻입니다. 이를 방지하도록 CLI를 `2.121.0`으로 고정했습니다. 해당 배포용 Linux 다운로드 주소 응답과 CLI 버전 출력을 확인했습니다. 게임 데이터·배포 비밀값은 변경하지 않았습니다.

수정 전 실패한 실행의 **Re-run jobs**는 예전 코드·설정을 사용할 수 있으므로, [서버 배포 목록](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy-cloud.yml)으로 돌아가 **Run workflow → feat/equipment-gems-regions → Run workflow**로 새로 시작하세요. 초록색 성공이 되면 PR을 병합합니다. 이 오류만으로 Supabase 토큰을 다시 생성할 필요는 없으며, 토큰 자체의 유효성은 다음 배포 단계에서 확인됩니다.
