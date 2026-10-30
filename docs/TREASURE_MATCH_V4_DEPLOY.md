# v4 적용 — SQL → PR 병합 → 새 보상 서버 → 웹사이트 확인

이번에는 실제 코인 정산 기능이 추가되어 **신규 SQL 한 번과 새 보상 서버 배포가 필요합니다.** 기존 Supabase 프로젝트·비밀번호·캐릭터·월드·API 변수는 그대로 사용합니다. 기존 `game` 서버를 교체하거나 새 프로젝트를 만들지 않습니다.

| 이름 | 역할 | 이번에 할 일 |
| --- | --- | --- |
| Test and deploy Pocket Friends | 검사 후 게임 웹사이트 배포 | main 병합 후 자동 실행, build/deploy 초록색 확인 |
| Deploy Treasure rewards (manual) | 새 보물 코인 검증 서버 배포 | 병합 후 main으로 한 번 실행 |
| Deploy cloud backend (manual) | 기존 육성/사천성 서버 배포 | 이번에는 실행하지 않음 |

## 1. 기존 데이터 백업

1. [현재 게임 열기](https://kwonyoung1.github.io/pocket-friends/)를 누릅니다.
2. 기존 월드에 입장해 맨 아래 **추억 보관**으로 JSON 파일을 내려받습니다.
3. 사이트 데이터 삭제·새 월드 생성·사진 재등록은 하지 않습니다. 업데이트 때문에 백업을 다시 가져올 필요도 없습니다.

## 2. 새 SQL 한 번 실행

1. [v4 SQL 파일 열기](https://github.com/kwonyoung1/pocket-friends/blob/feat/treasure-match-v4-rewards/supabase/migrations/202610300001_treasure_rewards.sql)를 누릅니다.
2. 파일 오른쪽 위 **Raw**를 눌러 코드만 있는 화면으로 이동합니다. **Ctrl+A → Ctrl+C**(Mac은 Command)를 눌러 전체 SQL을 복사합니다.
3. [Supabase 대시보드](https://supabase.com/dashboard)에 로그인하고 기존 **pocket-friends** 프로젝트를 누릅니다. 새 프로젝트를 만들지 않습니다.
4. 왼쪽 **SQL Editor** 아이콘 → **New query / +**로 새 쿼리를 만듭니다.
5. 복사한 SQL 전체를 붙이고 오른쪽 아래 **Run**을 누릅니다.
6. **Success. No rows returned**가 나오면 정상입니다. 이 SQL은 보상 세션 테이블·함수·권한을 추가하며 기존 월드 데이터를 초기화하지 않습니다. 실수로 다시 실행해도 기존 세션/월드를 삭제하지 않게 작성했습니다.
7. 빨간 오류가 나오면 다음 배포 전에 오류 문구를 확인합니다. 다른 기존 SQL을 반복 실행하지 않습니다.

## 3. PR 만들고 검사 후 병합

1. [v4 PR 만들기](https://github.com/kwonyoung1/pocket-friends/compare/main...feat/treasure-match-v4-rewards?expand=1)를 누릅니다.
2. 오른쪽 위 **Sign in**이 보이면 `kwonyoung1` 계정으로 로그인한 뒤 링크를 다시 엽니다.
3. **base: main**, **compare: feat/treasure-match-v4-rewards**를 확인합니다.
4. **Create pull request**를 누르고 제목은 `보물 3매치 v4: 3초 콤보·고난도·검증 코인 보상`으로 입력합니다.
5. [PR 설명 초안](TREASURE_MATCH_V4_PR.md)을 설명 칸에 붙이고 다시 **Create pull request**를 누릅니다. 이미 PR이 있다면 **View pull request**로 들어갑니다.
6. 개별 PR 아래 **Test and deploy Pocket Friends / build**가 초록색이 될 때까지 기다립니다. 기존 게임 전체 검사도 실행하므로 15분 이상 걸릴 수 있습니다. 노란색이면 검사 중이며 실패 검사를 건너뛰어 병합하지 않습니다.
7. 초록색과 **No conflicts with base branch**를 확인한 뒤 아래 **Merge pull request → Confirm merge**를 누릅니다. 초안이면 먼저 **Ready for review**를 누릅니다.
8. 보라색 **Merged**가 표시되면 main에 합쳐졌고 웹사이트 검사가 자동 시작됩니다. PR 목록에는 병합 버튼이 없으며 개별 PR 아래에 있습니다.

## 4. 새 보상 서버 배포

새 워크플로는 3번 병합 후 main에 등록됩니다. 웹사이트 검사가 도는 동안 진행할 수 있습니다.

1. [Deploy Treasure rewards (manual) 열기](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy-treasure.yml)를 누릅니다. 병합 직후 안 보이면 잠시 후 새로고침합니다.
2. 오른쪽 **Run workflow**를 누릅니다.
3. 펼쳐진 메뉴에서 **Branch: main**을 선택합니다.
4. 메뉴 안의 초록색 **Run workflow**를 한 번 누릅니다.
5. 새 실행이 목록 위에 생기면 제목을 누릅니다. **deploy-treasure**와 **Status: Success**가 초록색인지 확인합니다.
6. 빨간색이면 왼쪽 **deploy-treasure → 빨간 × 단계**를 펼쳐 마지막 오류를 확인합니다.

기존 GitHub `SUPABASE_ACCESS_TOKEN` secret과 `SUPABASE_PROJECT_REF` variable을 사용합니다. 새 비밀번호나 service_role 키를 프런트엔드에 넣지 않습니다. `Invalid access token`이면 토큰 만료를 확인하고, 권한 오류라면 Supabase 토큰의 **Edge Functions: Read-write**와 프로젝트 접근 권한을 확인합니다. 이번 워크플로는 함수 배포만 하므로 Edge Function Secrets를 다시 설정하는 작업은 없습니다. [GitHub Actions secrets 설정](https://github.com/kwonyoung1/pocket-friends/settings/secrets/actions) · [Supabase 토큰 설정](https://supabase.com/dashboard/account/tokens)

## 5. 웹사이트 자동 배포 확인

1. [Test and deploy Pocket Friends 열기](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml)를 누릅니다.
2. 이번 **Merge pull request … treasure-match-v4-rewards** 제목과 파란색 **main** 표시가 있는 항목을 누릅니다.
3. 왼쪽 **build**와 **deploy**가 모두 초록색, 위쪽 **Success**인지 확인합니다.
4. 병합으로 자동 실행되므로 진행 중에는 다시 **Run workflow**를 누르지 않습니다.
5. 병합했는데 실행 항목 자체가 없을 때만 이 웹사이트 워크플로에서 **Run workflow → main → Run workflow**로 한 번 실행합니다.

**새 보상 서버의 Success와 웹사이트의 build/deploy Success 둘 다** 확인해야 새 화면과 실제 보상을 함께 사용할 수 있습니다. 웹사이트가 먼저 배포되어 서버가 아직 없더라도 코인을 임의 지급하지 않고 오류/연습 선택을 보여 줍니다.

## 6. 게임에서 확인

1. [게임 열기](https://kwonyoung1.github.io/pocket-friends/)를 누릅니다. PC **Ctrl+Shift+R**, Mac **Command+Shift+R**로 새로 불러옵니다. 모바일은 게임 탭을 닫고 위 링크로 다시 열거나 새로고침합니다. 사이트 데이터를 지우지 않습니다.
2. 기존 비밀번호로 입장하고 **이 클라우드 월드 사용하기**를 누릅니다.
3. **💎 보물 3매치 → 도전 모드 시작**을 누릅니다. **서버 도전 · 정상 시간 종료 후 코인 정산** 문구를 확인합니다.
4. 큰 콤보 게이지가 **3초**, 타이머에 **시간 소모 ×1**이 보이는지 확인합니다. 점수가 올라가면 Lv.2 ×1.25 등으로 바뀝니다.
5. 보석을 누른 채 밀면 보석이 손가락/마우스를 따라 기울어집니다. 드래그 대상은 이웃 한 칸입니다.
6. 3회 이상 매치를 성공한 뒤 시간이 끝날 때까지 진행합니다. **보상 확인 중** 후 **보상 지급 완료**와 확정 코인이 나와야 지급 완료입니다.
7. **거실로 돌아가기**로 나와 코인을 확인합니다. 다른 기기의 기존 공유 월드에도 같은 코인이 반영됩니다.
8. 네트워크 오류면 **보상 다시 확인**을 누릅니다. 이미 서버에서 지급한 판은 같은 번호로 다시 확인해도 한 번만 지급됩니다. 새로고침 후에도 모드 선택 화면의 **보상 다시 확인**을 사용할 수 있습니다. 원래 로그인한 기기 계정에서 확인합니다.
9. 반복 거절/만료로 대기 중인 기록을 정리하려면 오류 안내의 **기록 보관 후 대기 정리**를 누릅니다. 확인 창을 승인하면 JSON 파일로 보관하고 대기만 지웁니다. 이 기록의 자동 재시도를 중단하며 육성 월드·사진·실제 코인은 지우지 않습니다.

**보상 없이 연습**, 로컬 개발 모드, 스테이지, 중도 종료는 실제 코인을 주지 않습니다. 예전 v2 최고 점수도 보상으로 소급 변환하지 않습니다. 한 판 보상 검증 한도(성공 2,000회·12시간)는 게임 방법에 표시합니다.
