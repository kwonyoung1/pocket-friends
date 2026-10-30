# 보물 3매치 배포 — 누를 버튼 순서

배포 대상은 **웹사이트**입니다. 이번에는 Supabase 서버 코드와 SQL을 수정하지 않았으므로 **Deploy cloud backend (manual)을 실행할 필요가 없습니다.** 기존 프로젝트·비밀번호·토큰·변수·저장 데이터를 그대로 사용합니다.

## 1. 기존 월드 파일 보관

1. [현재 포켓프렌즈 열기](https://kwonyoung1.github.io/pocket-friends/)를 누릅니다.
2. 게임 맨 아래 **추억 보관**을 눌러 현재 육성 월드의 JSON 백업을 보관합니다.
3. 업데이트를 위해 새 월드를 만들거나 백업을 다시 가져올 필요는 없습니다.

## 2. PR 만들기

1. [보물 3매치 PR 만들기](https://github.com/kwonyoung1/pocket-friends/compare/main...feat/pocket-treasure-match?expand=1)를 누릅니다.
2. 오른쪽 위에 **Sign in**이 보이면 눌러 `kwonyoung1` 계정으로 로그인한 뒤 위 링크를 다시 엽니다.
3. 비교 선택을 확인합니다: **base: main**, **compare: feat/pocket-treasure-match**.
4. 초록색 **Create pull request**를 누릅니다. 제목에 `보물 3매치·특수 보석·로컬 기록 추가`를 입력합니다.
5. 설명은 [PR 설명 초안](TREASURE_MATCH_PR.md)을 복사해 넣고 다시 **Create pull request**를 누릅니다. 이미 PR이 있다면 **View pull request**로 들어갑니다.
6. PR 화면 아래의 **Test and deploy Pocket Friends / build**가 초록색이 될 때까지 기다립니다. 전체 기존 게임 검사까지 실행하므로 10~20분 정도 걸릴 수 있습니다. 노란색은 진행 중입니다.

일반 CI에서는 10분 실측 테스트 두 개를 생략하고 기능 검사를 실행합니다. 실제 10분 실측은 개발 환경에서 별도로 실행한 결과를 검증 보고서에 기록합니다.

## 3. main에 병합

1. [Pull requests 목록](https://github.com/kwonyoung1/pocket-friends/pulls)에서 이번 PR 제목을 누릅니다.
2. 검사 결과가 모두 초록색이고 충돌이 없는지 확인합니다.
3. 화면 아래 **Merge pull request → Confirm merge**를 차례로 누릅니다. 초안 PR이면 먼저 **Ready for review**를 누릅니다.
4. 보라색 **Merged**가 표시되면 병합 완료이며 웹사이트 배포가 자동으로 시작됩니다.

`Merge pull request`는 PR 목록이 아니라 개별 PR의 아래쪽에 있습니다. 목록에 열린 PR이 없으면 2번 링크에서 먼저 PR을 만듭니다. 이미 Merged라면 다음 단계로 갑니다.

## 4. 자동 웹사이트 배포 확인

1. [Test and deploy Pocket Friends 열기](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml)를 누릅니다.
2. 목록 맨 위에서 이번 **Merge pull request …** 항목과 파란 **main** 표시를 확인하고 제목을 누릅니다.
3. **build**가 검사를 마친 뒤 **deploy**가 실행됩니다. 둘 다 초록색이고 **Success**가 나와야 운영 주소에 반영됩니다.
4. 병합으로 자동 실행되므로 진행 중에는 **Run workflow를 다시 누르지 않습니다.**
5. 이번 병합 실행 자체가 없을 때만 이 웹사이트 워크플로에서 **Run workflow → Branch: main → Run workflow**로 한 번 실행합니다.

빨간색이면 실행 항목 → 왼쪽 **build** 또는 **deploy** → 빨간 × 단계 → 마지막 오류를 확인합니다. 실패한 검사를 건너뛰고 병합하지 않습니다.

## 5. 게임에서 새 메뉴 열기

1. [게임 열기](https://kwonyoung1.github.io/pocket-friends/)를 누릅니다.
2. PC는 **Ctrl + Shift + R**을 누릅니다. 모바일은 탭을 닫았다가 같은 주소로 다시 열거나 새로고침합니다. 저장 데이터를 삭제하지 않습니다.
3. 비밀번호가 나오면 기존 비밀번호로 입장하고 **이 클라우드 월드 사용하기**를 누릅니다.
4. 메인 게임 상단 메뉴에서 **💎 보물 3매치**를 누릅니다. 작은 화면에서는 메뉴의 두 번째 줄에 있을 수 있습니다.
5. 보석 두 칸을 누르거나 서로 밀어 바꿉니다. **힌트**, **일시정지**, **소리 OFF/ON**, **게임 방법**을 사용할 수 있습니다.
6. 오른쪽 위 **× → 거실로 돌아가기**를 누르면 원래 방으로 돌아옵니다. 다른 기기에서 바뀐 코인·배치 등은 최신 월드에서 다시 받아옵니다.

새 메뉴가 없다면 4번의 **main 실행에서 build와 deploy가 둘 다 초록색인지** 먼저 확인합니다. 다른 워크플로의 서버 배포 성공만으로 새 화면이 올라가지는 않습니다.

## 기록에 관한 안내

기존 육성 월드는 계속 PC·모바일이 공유합니다. **보물 3매치의 최고 점수와 해금 기록은 각 브라우저에 별도로 저장**합니다. 모바일 기록이 PC와 다른 것은 이번 로컬 싱글플레이 규칙입니다. 코인·경험치·아이템 보상은 지급하지 않습니다. 진행 중인 보드는 종료/새로고침 시 끝나며 완료한 이동의 최고 기록은 보관합니다.

## 개발자가 로컬에서 실행할 때

```bash
npm ci
npm run dev
```

터미널에 나온 주소를 열고 **💎 보물 3매치**를 누릅니다. 운영 preview는 기존 클라우드 인증 설정을 사용합니다. 테스트 명령은 [검증 보고서](TREASURE_MATCH_VERIFICATION.md)에 있습니다.
