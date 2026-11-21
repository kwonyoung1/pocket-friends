# 별빛 아레나 — 배포 완료까지 클릭 안내

이 변경은 기존 포켓프렌즈에 아레나 메뉴를 추가합니다. 친구별 실제 레벨을 읽고, 선택 가능한 연습 레벨은 실제 성장에 저장하지 않습니다. **연습 전투이므로 코인·경험치·아이템은 지급하지 않습니다.** 기존 서버 재화·보상 검증·사용자 저장 데이터·자동화 정책은 변경하지 않습니다.

## 1. 이번 변경 화면 열기

1. [아레나 작업 PR 찾기](https://github.com/kwonyoung1/pocket-friends/pulls?q=is%3Apr+head%3Acodex%2Fstarlight-arena-integration)를 누릅니다.
2. 제목에 `starlight-arena-integration` 또는 `별빛 아레나`가 있는 PR을 누릅니다.
3. PR이 아직 보이지 않으면 [자동 PR 실행 목록](https://github.com/kwonyoung1/pocket-friends/actions/workflows/auto-pr.yml)을 눌러 이 브랜치의 최근 실행을 확인합니다. 초록색이면 PR 목록을 다시 엽니다.
4. 자동 PR이 실패했고 PR이 없다면 [변경 비교 화면](https://github.com/kwonyoung1/pocket-friends/compare/main...codex/starlight-arena-integration?expand=1) → **Create pull request**를 누릅니다. 이미 열린 PR이 있으면 새로 만들지 않습니다.

## 2. 검사 실행 또는 승인

1. PR의 **Checks** 탭을 누릅니다.
2. **Approve workflows to run**이 있을 때만 눌러 실행을 승인합니다. 버튼이 없고 검사가 실행 중이면 기다립니다.
3. `unit`, `browser`, `cloud`, 최종 필수 검사 `build`가 통과했는지 확인합니다. `build — Expected`는 아직 통과한 상태가 아닙니다.
4. 빨간 검사가 있으면 해당 검사 → 실패한 단계 → 로그를 확인합니다. 실패한 상태로 병합하거나 보호 규칙을 끄지 않습니다.
5. 이 브랜치의 [테스트 실행 목록](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml?query=branch%3Acodex%2Fstarlight-arena-integration)에서 상세 로그도 볼 수 있습니다.

## 3. PR 검토가 필요할 때만 승인

1. PR에서 **Approvals — 1 still required** 또는 **Review required**가 보이면 **Files changed**를 누릅니다.
2. 변경을 확인하고 우측 위 **Review changes** 또는 **Submit review**를 누릅니다.
3. **Approve**를 선택하고 **Submit review**를 누릅니다.
4. 본인이 PR 작성자로 표시되어 자기 승인할 수 없다면, 저장소에서 허용된 다른 리뷰어의 검토가 필요합니다. 리뷰 수를 0으로 바꾸지 않습니다.
5. 자동 병합되면 보라색 **Merged**가 표시됩니다. 검사가 모두 통과하고 리뷰 조건을 만족했는데 자동 병합되지 않으면 **Merge pull request → Confirm merge**를 누릅니다.

**Merged는 코드 병합 완료이고, 운영 배포 완료는 다음 단계까지 확인해야 합니다.**

## 4. 새 main 배포 확인

1. [main 배포 실행 목록](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml?query=branch%3Amain)을 누릅니다.
2. 이번 PR을 병합한 **가장 최근 main 실행**을 누릅니다. 이전 버전의 실패 실행을 다시 실행하면 새 코드가 적용되지 않습니다.
3. 새 main 실행이 없다면 같은 페이지의 **Run workflow → Branch: main → Run workflow**를 누릅니다. `validation_pr` 입력은 비워 둡니다.
4. 검사가 끝나고 **Review deployments**가 표시될 때만 누릅니다 → `release-approval` 선택 → **Approve and deploy**. 이번 프런트엔드 변경만으로는 이 승인이 생략될 수 있습니다.
5. `deploy`를 눌러 **actions/deploy-pages**와 **Verify live HTML, exact commit and executable assets**, 마지막 모바일 boot 검사가 초록색인지 확인합니다.
6. 이번 변경은 Edge Function을 바꾸지 않으므로 `backend`가 **Skipped**인 것은 정상입니다. **`deploy`가 Skipped이면 운영 반영 완료가 아닙니다.**
7. 실패 시 비밀키·정책·데이터를 임의로 수정하지 말고 실패 로그를 확인합니다. 새 버전의 공개 상태를 확인할 때까지 이전 안정 버전을 유지합니다. 복구가 필요한 경우 [기존 롤백 워크플로](https://github.com/kwonyoung1/pocket-friends/actions/workflows/rollback-pages.yml)를 사용하며 임의 아티팩트나 오래된 실행을 선택하지 않습니다.

저장소 설정을 확인할 일이 있다면 [Environments](https://github.com/kwonyoung1/pocket-friends/settings/environments), [Pages](https://github.com/kwonyoung1/pocket-friends/settings/pages)에서 확인할 수 있습니다. 이번 변경을 위해 설정·토큰을 새로 만들 필요는 없습니다.

## 5. 운영에서 직접 플레이

1. [운영 포켓프렌즈 열기](https://kwonyoung1.github.io/pocket-friends/)를 누릅니다.
2. 평소처럼 로그인하고 **이 클라우드 월드 사용하기**로 들어갑니다. 데이터 초기화·새 월드 생성·백업 덮어쓰기를 누르지 않습니다.
3. 성장·모험 메뉴의 **별빛 아레나**를 누릅니다. 메뉴가 옆으로 이어지면 가로로 밀어 찾습니다.
4. 기본 선택 **친구 실제 레벨**과 카드의 레벨을 확인합니다. 스킬을 미리 보고 싶으면 **전투 레벨 → 연습 Lv.35**를 선택합니다. 실제 친구 레벨은 오르지 않습니다.
5. 아래 **달빛 숲으로 출발**을 누릅니다. 적을 누르고 스킬을 누릅니다.
6. 비비의 **당근콩콩**, 모모의 **화염 돌진**, 찬미의 **포근한 치유/달빛 보호막**을 체험합니다. 코코는 편성에서 친구 한 명을 해제하고 선택해 COST 10 이하로 맞춥니다.
7. 필살기는 **연습 Lv.50**에서 기본 공격으로 별빛 3개를 모은 뒤 사용합니다. 상단 설정의 **컷인 미리보기**는 피해·턴을 바꾸지 않습니다.
8. **거실로 돌아가기**를 누르고 기존 이름·사진·레벨·코인·아이템이 유지되는지 확인합니다. 게임을 다시 열면 연습 레벨도 다시 **친구 실제 레벨**로 시작합니다.

## 6. 화면이 이전 그대로라면

1. 우선 위 main 실행의 `deploy`가 성공했는지 확인합니다. PR의 초록색 체크만으로는 부족합니다.
2. [운영 버전 정보](https://kwonyoung1.github.io/pocket-friends/version.json)를 눌러 `sha`를 확인합니다. 이번 PR 병합 커밋 또는 이를 포함하는 최신 main 배포 커밋과 일치해야 합니다.
3. 운영 사이트의 새로고침을 누릅니다. PC는 `Ctrl+Shift+R`로 다시 불러올 수 있습니다.
4. 저장소/쿠키 삭제나 새 월드 생성으로 해결하지 않습니다. 배포 SHA가 다르면 코드 배포 상태를 먼저 확인합니다.

## 완료 기준

- PR **Merged**.
- 새 main 실행의 `deploy`와 공개 버전/SHA/모바일 boot 확인 **성공**.
- 운영 메뉴에서 아레나 입장·전투·거실 복귀 확인.

위 세 가지를 확인하기 전에는 운영 배포 완료라고 표시하지 않습니다. 이 세션의 실제 확인 결과는 [작업 결과](STARLIGHT_ARENA_RELEASE_STATUS.md)에 별도로 기록합니다.
