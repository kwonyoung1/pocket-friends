# v5 업데이트 배포: 클릭할 순서

이번에는 **PR 병합 + SQL 1개 + treasure 서버 배포 + 웹사이트 자동 배포**가 필요합니다. 아래 순서로 한 번씩 진행하세요. 기존 Supabase 프로젝트를 그대로 사용합니다. 새 프로젝트/새 공유 월드를 만들거나 기존 저장 데이터를 지우지 마세요. 진행 중인 보상 도전은 끝내고 배포 동안 잠시 게임을 닫아 두는 편이 좋습니다.

## 1. GitHub PR 만들고 병합

1. [PR 생성 화면 열기](https://github.com/kwonyoung1/pocket-friends/compare/main...feat/treasure-twelve-levels?expand=1).
2. 오른쪽 위 **Sign in**이 보이면 `kwonyoung1` 계정으로 로그인합니다.
3. 위쪽이 **base: main**, **compare: feat/treasure-twelve-levels**인지 확인합니다.
4. 초록 **Create pull request**를 누릅니다. 제목은 `feat: add twelve-level treasure challenge and prism effects`로 입력합니다.
5. 본문에는 [준비된 PR 설명](TREASURE_TWELVE_PR.md)을 복사해 넣고 **Create pull request**를 누릅니다.
6. PR 아래 검사들이 초록색이 될 때까지 기다립니다. 노란색이면 실행 중이므로 Run workflow를 추가로 누르지 않습니다.
7. PR의 **Conversation** 탭 맨 아래에서 **Merge pull request → Confirm merge**를 누릅니다.

PR 목록 화면에는 Merge 버튼이 없습니다. 열린 PR 제목을 눌러 Conversation 화면으로 들어가야 합니다. `Merged`로 보라색 표시가 있으면 이미 끝난 단계입니다.

## 2. Supabase SQL 1개 적용

1. GitHub에서 [새 SQL 파일](https://github.com/kwonyoung1/pocket-friends/blob/main/supabase/migrations/202610310002_treasure_rules6.sql)을 엽니다. 404이면 1번 병합이 아직 완료되지 않았는지 확인합니다.
2. 코드 오른쪽 위 **Copy raw file** 아이콘으로 파일 내용 전체를 복사합니다. 찾기 어려우면 **Raw**를 눌러 코드만 연 뒤 전체 선택/복사합니다.
3. [Supabase 프로젝트 목록](https://supabase.com/dashboard/projects) → 기존 **pocket-friends** 프로젝트를 누릅니다.
4. 왼쪽 **SQL Editor** (`>_` 아이콘) → **New query** 또는 **+**를 누릅니다.
5. 복사한 SQL 전체를 붙여넣고 오른쪽 아래 **Run**을 누릅니다.
6. `Success. No rows returned`가 나오면 완료입니다. 기존 보상 테이블이 없다는 오류라면 초기 설정을 생략한 것이므로 오류를 확인해야 합니다. 테이블을 삭제해서 해결하지 마세요.

이 파일은 시작 함수의 새 게임 규칙을6으로 바꾸며 기존 코인·캐릭터·미지급 기록을 수정하지 않습니다. 과거 SQL을 처음부터 다시 실행할 필요가 없습니다.

## 3. 보상 서버 배포 — 이번에는 필요합니다

1. [Deploy game update (manual) 바로 열기](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy-treasure.yml).
2. 오른쪽 **Run workflow** 클릭.
3. **Use workflow from** / **Branch**에서 **main** 선택.
4. 아래 초록 **Run workflow** 클릭.
5. 새 실행 제목을 눌러 **deploy-treasure**가 초록색이고 **Success**인지 확인합니다.

이 워크플로는 기존 설정대로 game과 treasure를 배포합니다. 이번 변경은 treasure 쪽이며 기존 game 코드와 비밀값은 유지합니다. `Deploy cloud backend (manual)`만 실행하면 treasure는 갱신되지 않습니다.

`Invalid access token`이면 토큰 만료 여부를 확인하고 [GitHub Actions Secrets](https://github.com/kwonyoung1/pocket-friends/settings/secrets/actions)의 기존 `SUPABASE_ACCESS_TOKEN`을 갱신합니다. 누락 권한이 표시되면 해당 토큰의 **Edge Functions: Read-write**가 필요합니다. 기존 변수/비밀값을 지우거나 토큰을 채팅에 붙여넣지 마세요. 성공한 실행을 다시 돌릴 필요는 없습니다.

## 4. 웹사이트 배포 확인

1. [Test and deploy Pocket Friends 바로 열기](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml).
2. 최상단 실행 중 **main**, 제목 `Merge pull request ...`인 것을 누릅니다. PR 브랜치의 검사와 구별합니다.
3. **build**, **deploy** 둘 다 초록색이고 **Success**가 되면 완료입니다. PR 병합으로 자동 실행되므로 이미 실행 중/성공이면 **Run workflow를 또 누르지 않습니다**.
4. main 실행이 아예 없을 때만 **Run workflow → main → Run workflow**를 한 번 누릅니다.

Test and deploy는 게임 화면을 GitHub Pages에 올립니다. Deploy game update는 Supabase의 보상 검증 서버를 올립니다. 둘은 배포 대상이 다릅니다.

## 5. 게임에서 확인

[게임 열기](https://kwonyoung1.github.io/pocket-friends/)

PC는 Ctrl+Shift+R, 모바일은 게임 탭을 완전히 닫고 주소를 다시 엽니다. 브라우저 저장 데이터 삭제는 필요하지 않습니다.

미니게임 → **보물 3매치** → 모드 선택에서 **12단계 도전 · 시간 소모 ×1.5~16**이 보이는지 확인합니다. 새 도전을 시작하세요. 기존 캐릭터/코인이 유지되어야 하며, 소리와 이펙트 강도는 아래 설정에서 조정합니다. 서버 업데이트 안내가 나오면 2번 SQL과3번 서버,4번 웹사이트가 모두 완료됐는지 확인합니다. 미지급 기록은 **보상 다시 확인**으로 정산합니다.
