# 별빛 아레나 요정·챕터 업데이트 — 클릭 배포 안내

운영: https://kwonyoung1.github.io/pocket-friends/

[이번 PR 찾기](https://github.com/kwonyoung1/pocket-friends/pulls?q=is%3Apr+head%3Acodex%2Farena-fairy-chapters)

이 문서는 진행 안내이며 운영 반영 완료 증명이 아닙니다. PR·CI·서버·웹의 실제 결과는 각 실행 화면에서 확인합니다. 이전 시즌 초기화 안내를 따라 데이터를 지우지 마세요. 이번에는 초기화가 없습니다.

## 1. PR 검사와 검토

1. 위 PR 목록에서 `Codex: arena-fairy-chapters`를 클릭합니다.
2. **Files changed**에서 변경을 확인합니다.
3. 검사를 기다리는 중이라도 **Submit review → Approve → Submit review**로 리뷰를 먼저 제출할 수 있습니다.
4. **Approve workflows to run**이 표시되면 별도로 눌러 검사 실행을 허용합니다. 리뷰 승인과 검사 실행 승인은 별개입니다.
5. **Checks**에서 필수 `unit`, `browser`, `cloud`, `build`가 성공했는지 확인합니다. 회색인 운영 배포 작업이 PR 단계에서 생략되는 것은 정상입니다.
6. 안전 정책상 서버 보상·에너지 코드 변경은 명시적 검토가 필요합니다. 필수 검사를 해제하지 않습니다.
7. **Merge pull request**가 활성화되면 **Merge pull request → Confirm merge**로 병합합니다. 자동 병합이 적용되면 **Merged**만 확인하면 됩니다.

## 2. 서버·웹을 한 번의 main 배포 흐름으로 반영

1. [main Actions](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml?query=branch%3Amain)를 엽니다.
2. 이 PR 병합 커밋으로 시작한 최신 실행을 클릭합니다. 이전 실행을 재실행하는 것으로 새 코드가 적용되지는 않습니다.
3. `unit`, `browser`, `cloud`, `build`, `plan` 통과를 확인합니다.
4. `release-approval` 대기이면 **Review deployments → release-approval 체크 → Approve and deploy**를 누릅니다.
5. 이번에는 서버 계산이 바뀌므로 `backend / functions`를 확인합니다. 배포 계획에서 변경된 함수만 배포하고 `/health`의 SHA를 검증합니다. 토큰·비밀번호를 다시 발급하거나 프로젝트를 새로 만들지 않습니다.
6. `backend-gate`가 성공해야 웹이 공개됩니다. 서버 실패를 무시하고 Pages만 따로 배포하지 않습니다.
7. `deploy`에서 업로드, Pages 배포, **Verify live HTML, exact commit and executable assets**, 모바일 부팅 검사가 모두 성공하는지 확인합니다.
8. Summary가 **Success**인 것과 `deploy`가 실제 성공한 것을 함께 확인합니다. `Skipped`는 배포 성공을 뜻하지 않습니다.

## 3. 운영 게임에서 확인

1. [운영 게임](https://kwonyoung1.github.io/pocket-friends/)을 엽니다. 기존 접속 비밀번호로 기존 월드를 사용합니다.
2. **별빛 아레나**를 엽니다. `125 스테이지` 및 **요정 도감 · 보물상자** 표시를 확인합니다.
3. 에너지 안내가 **6분당 1 · 매일 한국시간 00:00 전체 충전**인지 확인합니다. 최대치는 100, 기존 스테이지와 이벤트 입장 비용은 그대로입니다.
4. 원하는 순서로 친구를 골라 정식 입장합니다. **정식 입장 성공** 후 마지막 파티가 서버에 저장됩니다. 화면에서만 바꾼 선택은 저장되지 않습니다.
5. 아레나를 닫았다가 열어 **마지막 출전 파티** 표시와 순서를 확인합니다. 같은 비밀번호의 다른 기기도 같은 아레나 계정을 사용합니다.
6. **고대 유적** 이후 각 챕터에 1~10단계, 5단계 중간 보스와 10단계 최종 보스가 있는지 확인합니다.
7. 신지역은 **별의 정원 → 꿈의 미궁 → 천공의 성 → 잊혀진 별의 신전**입니다. 정식 해금은 이전 스테이지 순서를 따르며 연습에서는 미리 볼 수 있습니다.
8. 오래된 진행 중 전투는 당시 규칙으로 이어집니다. 보존된 이전 챕터 접근은 유지되며 새 스테이지의 첫 보상은 각각 서버 검증 후 지급합니다.

## 4. 오류가 나면

- `cloud` 또는 `build` 실패: 해당 작업의 첫 오류를 확인합니다. 모든 성공 조건을 검사하는 build 오류만으로 토큰을 바꾸지 않습니다.
- `backend` 401/403: [cloud-backend 환경](https://github.com/kwonyoung1/pocket-friends/settings/environments)을 열어 기존 환경을 선택하고 토큰 만료/등록 상태를 확인합니다. 정상 토큰을 임의로 교체하지 않습니다.
- Pages 파일 조회 실패: 배포 액션이 main에 병합된 REST 조회 고정 버전인지 확인합니다. 예전 실행의 실패를 반복 재실행하지 않습니다.
- 아레나 업데이트 안내: 데이터 삭제 없이 게임을 새로 열고 최신 웹·서버 SHA가 모두 반영됐는지 확인합니다. 이전 행동 기록은 보존됩니다.
- 운영 확인을 위해 **새 공유 월드**, 데이터 가져오기, 저장 초기화, 기존 캐릭터 삭제를 실행하지 않습니다.
- 정상 배포 상태 확인 전에는 작업 완료로 판단하지 않습니다.

[저장소 설정](https://github.com/kwonyoung1/pocket-friends/settings) · [Environments](https://github.com/kwonyoung1/pocket-friends/settings/environments) · [전체 Actions](https://github.com/kwonyoung1/pocket-friends/actions)
