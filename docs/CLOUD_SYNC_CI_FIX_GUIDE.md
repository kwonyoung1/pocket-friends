# 두 기기 입양·이동 동기화 CI 수정 확인 안내

## 이번 수정

`cloud-tests/cloud.spec.ts`의 입양·이동·가구 공유 검사를 수정했습니다.
겹쳐 걷는 다른 친구가 눌리지 않도록 대상의 포인터 수신·드래그 상태를 확인합니다.
드래그의 `drop` 응답과 브라우저 저장 대기열의 완료를 확인한 다음,
두 번째 기기에 서버 좌표가 실제 렌더링되는 순간을 관찰합니다.
고정 초기 좌표 `530`과 계속 걷는 캐릭터를 외부에서 간헐적으로 읽는 방식에 의존하지 않습니다.
좌표 오차 허용 범위는 축마다 12 미만이며, 이동 거리·이름·입양·가구·원본 보존 검사를 유지합니다.
게임 실행 코드, 운영 데이터, Supabase 함수, 배포 보안 정책은 변경하지 않습니다.

## 클릭 순서

1. [이 수정 브랜치의 PR 찾기](https://github.com/kwonyoung1/pocket-friends/pulls?q=is%3Apr+head%3Acodex%2Ffix-cloud-adoptee-sync)를 엽니다.
   `Codex: fix-cloud-adoptee-sync` PR을 클릭합니다.
   목록이 없으면 [자동 PR 작업](https://github.com/kwonyoung1/pocket-friends/actions/workflows/auto-pr.yml)을 확인합니다.
2. PR의 **Checks**를 클릭합니다. **Test and deploy Pocket Friends**의
   `unit`, `browser`, `cloud`, 필수 `build`가 성공해야 합니다.
   `Approve workflows to run`이 표시될 때만 해당 버튼으로 검사 실행을 허용합니다.
   PR 단계에서 운영 배포 작업이 `Skipped`인 것은 정상이며, 검사 실패를 뜻하지 않습니다.
3. 자동 병합이 완료되면 PR 상태가 **Merged**로 바뀝니다.
   필수 검사가 성공했지만 `Approval required`가 남아 있으면
   **Files changed → Submit review → Approve → Submit review**로 검토를 제출합니다.
   자동 병합이 실행되지 않고 **Merge pull request**가 활성화되어 있으면
   **Merge pull request → Confirm merge**를 누릅니다. 보호 규칙은 해제하지 않습니다.
4. [main 배포 검사](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml?query=branch%3Amain)를 엽니다.
   수정 PR의 병합 커밋으로 실행된 가장 최신 항목을 클릭합니다.
   이전 실패 실행을 재실행해도 이전 커밋의 검사가 실행되므로 수정이 적용되지 않습니다.
5. 운영 배포가 필요한 것으로 판정되어 `release-approval` 대기 상태이면
   **Review deployments → release-approval 선택 → Approve and deploy**로 진행합니다.
   이번 수정은 Supabase 함수 변경이 없어 `backend` 생략이 정상입니다.
   main의 웹 배포는 기존 워크플로를 따릅니다. `deploy`가 생략되면
   `plan`, 승인, `backend-gate` 등 선행 작업과 최신 main 실행 여부를 확인합니다.
   `Skipped`만으로 웹 배포 성공으로 판단하지 않습니다.
6. [운영 게임](https://kwonyoung1.github.io/pocket-friends/)을 엽니다.
   이번 수정 자체는 게임 콘텐츠나 캐릭터 외형을 바꾸지 않습니다.
   필요하면 같은 접속 비밀번호의 두 기기에서 기존 이름·입양 캐릭터·가구 공유를 확인합니다.
   확인을 위해 새 월드를 만들거나 데이터를 가져오기/초기화하지 않습니다.

## 실패했을 때

- `cloud`가 실패하면 해당 작업을 클릭하고 최초 실패의 오류·테스트 이름을 확인합니다.
  `build`의 선행 검사 성공 조건 오류는 보통 `cloud` 등 앞선 실패의 결과이므로 최초 실패부터 해결합니다.
- 토큰·권한 오류가 없으면 GitHub Secrets나 Supabase 토큰을 다시 설정할 필요가 없습니다.
- 이번 수정에는 Supabase 서버 배포나 DB 변경이 필요 없습니다.
- 현재 안내서는 성공을 보장하는 배포 기록이 아닙니다. 최종 상태는 위 PR 및 Actions에서 확인합니다.
