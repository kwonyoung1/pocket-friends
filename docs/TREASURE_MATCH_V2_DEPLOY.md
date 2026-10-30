# 보물 3매치 v2 배포 — 클릭할 위치 순서

이번 업데이트는 **웹사이트만 배포**합니다. 서버·DB·Supabase 함수·GitHub Actions 설정은 변경하지 않았습니다. **Deploy cloud backend (manual) 실행과 SQL 실행은 필요 없습니다.** 기존 Supabase 프로젝트·비밀번호·토큰·GitHub 변수는 유지합니다.

## 1. 현재 육성 데이터 보관

1. [현재 게임 열기](https://kwonyoung1.github.io/pocket-friends/)를 누릅니다.
2. 기존 월드에 들어가 게임 맨 아래 **추억 보관**을 눌러 JSON 파일을 내려받습니다.
3. 업데이트 때문에 새 월드를 만들거나 저장 데이터/사이트 데이터를 삭제하지 마세요. 정상 업데이트에는 백업 가져오기도 필요하지 않습니다.

## 2. Pull Request 만들기

1. [이번 업데이트 PR 만들기 화면 열기](https://github.com/kwonyoung1/pocket-friends/compare/main...feat/treasure-match-v2-challenge?expand=1)를 누릅니다.
2. 오른쪽 위 **Sign in**이 보이면 `kwonyoung1` 계정으로 로그인한 뒤 같은 링크를 다시 엽니다.
3. 화면 위 선택이 **base: main**, **compare: feat/treasure-match-v2-challenge**인지 확인합니다.
4. 초록색 **Create pull request**를 누릅니다. 제목은 `보물 3매치 v2: 5초 콤보·무한 도전·강화 이펙트`로 입력합니다.
5. 설명 칸에 [PR 설명 초안](TREASURE_MATCH_V2_PR.md)을 복사해 붙이고 아래 **Create pull request**를 누릅니다.
6. 이미 PR이 만들어졌다면 **View pull request**로 들어가거나 [열린 PR 목록](https://github.com/kwonyoung1/pocket-friends/pulls)에서 이번 제목을 누릅니다.
7. PR 화면 아래 **Test and deploy Pocket Friends / build**가 초록색이 될 때까지 기다립니다. 기존 게임 검사도 함께 하므로 10~20분 이상 걸릴 수 있습니다. 노란색은 검사 중입니다.

아직 이 단계에서는 운영 게임이 바뀌지 않습니다. PR 검사는 코드가 안전한지 확인하는 과정이며 운영 주소 배포는 다음 병합 후 시작됩니다.

## 3. main에 합치기

1. 이번 **개별 PR 화면** 아래쪽으로 내립니다. PR 목록 화면에는 병합 버튼이 없습니다.
2. 검사 결과가 모두 초록색이고 **No conflicts with base branch**인지 확인합니다.
3. **Merge pull request → Confirm merge**를 차례로 누릅니다. 초안이면 먼저 **Ready for review**를 누릅니다.
4. **Merged** 표시가 나오면 코드 병합이 끝났고 웹사이트 배포가 자동 시작됩니다.

이미 Merged가 보이면 다시 PR을 만들거나 병합하지 말고 4번으로 갑니다. 실패한 검사를 건너뛰어 병합하지 마세요.

## 4. 자동 웹사이트 배포 확인

1. [Test and deploy Pocket Friends 실행 목록 열기](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml)를 누릅니다.
2. 목록 위쪽에서 이번 **Merge pull request … treasure-match-v2-challenge** 제목과 파란색 **main** 표시가 있는 항목을 누릅니다.
3. 왼쪽 **build**가 초록색이 되면 이어서 **deploy**가 실행됩니다. 두 항목이 모두 초록색이고 위쪽 **Status: Success**여야 합니다.
4. 이미 자동 실행 중이면 **Run workflow를 추가로 누르지 않습니다.**
5. 병합했는데 실행 자체가 없다면 이 화면에서만 **Run workflow → Branch: main → 초록색 Run workflow**를 한 번 누릅니다. 왼쪽의 **Deploy cloud backend (manual)**은 이번에 사용하지 않습니다.

빨간색이면 해당 실행 → 왼쪽 빨간 **build/deploy** → 빨간 × 단계 → 마지막 오류 문구를 확인합니다. 토큰/비밀 키는 공개하지 말고 오류 문구만 전달해 주세요. 긴 실측 검사는 기본 CI에서 의도적으로 생략하며, 별도 실행 결과는 [검증 보고서](TREASURE_MATCH_V2_VERIFICATION.md)에 있습니다.

## 5. 새 게임 확인

1. **build·deploy가 모두 초록색인 것을 확인한 다음** [게임 열기](https://kwonyoung1.github.io/pocket-friends/)를 누릅니다.
2. PC는 **Ctrl + Shift + R**(Mac은 **Command + Shift + R**)로 새로 불러옵니다. 모바일은 게임 탭을 닫고 위 링크로 다시 열거나 브라우저의 새로고침을 누릅니다.
3. 비밀번호 화면이 나오면 기존 비밀번호로 입장하고, 월드 선택이 나오면 **이 클라우드 월드 사용하기**로 기존 월드를 엽니다.
4. 상단 **💎 보물 3매치**를 누릅니다. 작은 화면에서는 메뉴가 두 번째 줄에 있을 수 있습니다.
5. **스테이지 모드 / 도전 모드** 두 카드가 보이면 v2 화면이 반영된 것입니다.
6. **도전 모드 시작**을 누르면 **30.0초**로 시작합니다. 매치를 만들면 큰 콤보 숫자와 **+5.0 SEC**가 표시됩니다. 남은 시간은 최대 30초입니다.
7. **Ⅱ 일시정지 → 계속하기**, **흔들림 ON/OFF**, **이펙트 강도**를 확인해 보세요. 도전 모드는 힌트 없이 진행합니다.
8. **모드 선택**에서 스테이지로 돌아가 기존 해금 단계와 최고 점수가 남아 있는지 확인합니다. 오른쪽 위 **× → 거실로 돌아가기**로 원래 월드로 돌아옵니다.

새 화면이 안 보이면 먼저 4번의 **이번 main 실행**이 성공했는지 확인합니다. 예전 실행의 초록색이나 서버 배포 성공은 이번 웹사이트 배포 성공과 다릅니다. 사이트 데이터를 지우지 말고 새로고침부터 해 주세요.

## 저장 범위

기존 육성 데이터는 계속 PC·모바일에서 공유합니다. **3매치의 해금과 최고 기록·도전 기록은 브라우저별 로컬 저장**이며 서로 다른 기기에서 기록이 다른 것은 정상입니다. 진행 중 보드는 새로고침하면 끝나지만 완료한 교환의 기록은 보관합니다. 이번 업데이트로 코인·사진·캐릭터를 초기화하지 않습니다.
