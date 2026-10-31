# 적용 순서 — 백업 → SQL → PR 병합 → 서버 두 함수 → 웹사이트 확인

기존 Supabase 프로젝트와 육성 월드를 그대로 사용합니다. 이번에는 일괄 관리용 **game 서버**와 새 도전용 **treasure 서버** 둘 다 업데이트해야 합니다. 서버 배포 버튼 한 번으로 두 함수를 배포하도록 준비했습니다.

## 1. 백업

1. [현재 게임](https://kwonyoung1.github.io/pocket-friends/)을 엽니다.
2. 기존 월드의 **추억 보관**으로 JSON 백업을 내려받습니다.
3. 새 월드를 만들거나 사이트 데이터를 삭제하지 않습니다.

## 2. SQL 한 번

1. [새 SQL 파일](https://github.com/kwonyoung1/pocket-friends/blob/feat/faster-challenge-bulk-care/supabase/migrations/202610310001_treasure_rules5.sql)을 엽니다.
2. 오른쪽 위 **Raw → Ctrl+A → Ctrl+C**로 SQL 전체를 복사합니다(Mac은 Command).
3. [Supabase 대시보드](https://supabase.com/dashboard) → 기존 **pocket-friends** 프로젝트 → 왼쪽 **SQL Editor → New query / +**를 누릅니다.
4. 붙여 넣고 **Run**을 누릅니다. **Success. No rows returned**면 정상입니다.
5. 기존 세션·코인·캐릭터를 지우지 않으며 재실행해도 데이터를 초기화하지 않습니다. v4의 `treasure_sessions`가 없다는 오류라면 [이전 v4 SQL](https://github.com/kwonyoung1/pocket-friends/blob/main/supabase/migrations/202610300001_treasure_rewards.sql)을 먼저 적용해야 합니다. 이미 적용했다면 반복할 필요 없습니다.

## 3. PR 생성·검사·병합

1. [이번 PR 만들기](https://github.com/kwonyoung1/pocket-friends/compare/main...feat/faster-challenge-bulk-care?expand=1)를 누릅니다.
2. **Sign in**이 보이면 `kwonyoung1` 계정으로 로그인하고 링크를 다시 엽니다.
3. **base: main / compare: feat/faster-challenge-bulk-care**를 확인합니다.
4. **Create pull request → 제목 입력 → Create pull request**를 누릅니다. 제목은 `빠른 도전·캐릭터 일괄 관리·보상 검증 경량화`로 쓰면 됩니다. [설명 초안](FAST_CARE_PR.md)도 준비했습니다.
5. 개별 PR 아래의 검사가 초록색이 될 때까지 기다립니다. 노란색은 진행 중입니다. GitHub의 기존 전체 CI는 유지하므로 시간이 걸릴 수 있습니다.
6. 초록색과 **No conflicts with base branch**를 확인하고 **Merge pull request → Confirm merge**를 누릅니다. 초안이면 먼저 **Ready for review**를 누릅니다.
7. 보라색 **Merged**가 뜨면 main에 합쳐졌고 웹사이트 검사가 자동 시작됩니다. 목록 화면에는 병합 버튼이 없습니다.

## 4. 서버 업데이트 — 한 번 실행

1. [서버 업데이트 워크플로](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy-treasure.yml)를 엽니다.
2. 병합 후 표시 이름은 **Deploy game update (manual)**입니다. 예전 이름 **Deploy Treasure rewards (manual)**이 보이면 새로고침합니다.
3. **Run workflow → Branch: main → 초록색 Run workflow**를 누릅니다.
4. 새 실행 제목을 누르고 **deploy-treasure / Status: Success**가 초록색인지 확인합니다. 이 한 실행이 game과 treasure를 차례로 배포합니다.
5. 이 방식으로 배포했다면 기존 **Deploy cloud backend (manual)**을 따로 실행할 필요 없습니다. 비밀번호나 프로젝트를 새로 만들지도 않습니다.
6. 빨간색이면 **deploy-treasure → 빨간 × 단계**를 펼쳐 마지막 오류를 확인합니다. `Invalid access token`은 기존 `SUPABASE_ACCESS_TOKEN`의 만료를 확인하고, 권한 오류는 Supabase 토큰의 프로젝트 접근과 **Edge Functions: Read-write**를 확인합니다. [GitHub secrets](https://github.com/kwonyoung1/pocket-friends/settings/secrets/actions) · [Supabase 토큰](https://supabase.com/dashboard/account/tokens)

## 5. 자동 웹사이트 배포 확인

1. [Test and deploy Pocket Friends](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml)를 엽니다.
2. 이번 **Merge pull request … faster-challenge-bulk-care**, 파란 **main** 표시의 실행을 누릅니다.
3. **build·deploy 모두 초록색 / Success**인지 확인합니다.
4. 자동 실행 중이면 다시 Run workflow를 누르지 않습니다. 병합 후 실행 항목 자체가 없을 때만 **Run workflow → main → Run workflow**로 한 번 실행합니다.
5. 서버 성공과 웹사이트 성공을 모두 확인합니다. 웹사이트만 먼저 올라오면 일괄 명령/새 도전이 거절될 수 있으며 서버 확인 전 코인을 임의 지급하지 않습니다.

## 6. 게임에서 확인

1. [게임](https://kwonyoung1.github.io/pocket-friends/)을 엽니다. PC는 **Ctrl+Shift+R**, Mac은 **Command+Shift+R**로 새로고침합니다. 모바일은 탭을 닫고 다시 열거나 새로고침합니다.
2. 기존 비밀번호 → **이 클라우드 월드 사용하기**로 입장합니다.
3. **생활·입양 → 친구 생활**에서 **모두 놀아주기 / 모두 씻기**를 누릅니다. 결과에서 성공·쿨타임·일일 제한 인원을 확인합니다. 씻기는 기존처럼 30분 목욕입니다.
4. **인벤토리 → 음식 → 원하는 음식의 일괄 주기**를 누릅니다. 음식 수량·대상·이름을 확인한 뒤 **확인하고 일괄 주기**를 누릅니다. 한 명당 한 개이며 부족하면 목록 순서대로 지급합니다.
5. **💎 보물 3매치 → 도전 모드 시작**에서 Lv.1 **시간 소모 ×1.5**, 3초 콤보를 확인합니다. 점수를 얻으면 빠르게 올라가며 Lv.7은 ×8입니다.
6. 이전 v4 미지급 보상이 있으면 먼저 **보상 다시 확인**으로 정산합니다. 이전 판은 이전 공식으로 지급되고 새 판만 /500 공식을 사용합니다.

버튼이 안 보이면 이번 main의 웹사이트 build/deploy를 확인합니다. 버튼은 보이는데 지원하지 않는 명령/규칙 버전 오류가 나오면 4번 서버 배포와 2번 SQL 적용을 확인합니다. 사이트 데이터를 지우지 마세요.
