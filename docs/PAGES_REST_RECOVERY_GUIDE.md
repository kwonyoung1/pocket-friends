# Pages 업로드 성공 후 조회 실패 복구 — #47 없이 진행

## 확인한 내용

실행 https://github.com/kwonyoung1/pocket-friends/actions/runs/45327183906 에서
첫 업로드는 파일 ID `14890968253`, 이름 `github-pages-45327183906-1`로 성공했습니다.
배포 액션은 그 이름을 찾지 못했고 재시도 attempt 2에서도 같은 형태로 실패했습니다.
동일 실행을 계속 재시도하거나 Supabase 토큰을 바꾸지 않습니다.

공식 `actions/deploy-pages@v4` 소스를 확인하면 내부 Twirp 아티팩트 목록을 조회합니다.
공식 `v4.0.0`은 실행 ID와 정확한 이름을 지정한 GitHub REST API로 조회합니다.
이번 수정은 배포·롤백의 액션 참조 두 곳만 그 공식 릴리스의 전체 SHA로 고정하여 조회 경로를 변경합니다.

- 고정 SHA: `f33f41b675f0ab2dc5a6863c9a170fe83af3571e`
- [확인한 공식 소스](https://github.com/actions/deploy-pages/blob/f33f41b675f0ab2dc5a6863c9a170fe83af3571e/src/internal/api-client.js)
- 파일 이름의 실행/attempt 구분, 승인, 권한, 필수 CI, 배포 후 SHA·모바일 검사는 유지합니다.
- #47의 사전 검증 스크립트는 사용하지 않으며 #47을 병합할 필요가 없습니다.
- 실제 서비스에서 원인이 재현·해결됐다는 검증은 새 배포가 성공한 후에만 가능합니다.
- 이전 공식 릴리스를 고정하므로 이후 v4 업데이트를 자동으로 받지 않습니다. 공식 조회 문제가 해소되면 별도 검증 후 업데이트합니다.

## 클릭 순서

1. [이 수정 PR 찾기](https://github.com/kwonyoung1/pocket-friends/pulls?q=is%3Apr+head%3Acodex%2Ffix-pages-rest-lookup)를 열고 `Codex: fix-pages-rest-lookup`를 클릭합니다.
2. **Checks**를 클릭합니다. **Approve workflows to run**이 나타날 때만 눌러 검사를 실행합니다.
   필수 `unit`, `browser`, `cloud`, `build`가 성공해야 합니다.
   이 저장소는 워크플로 변경에도 필수 CI를 요구하며 이번 수정에서 이를 우회하지 않습니다.
3. **Files changed**에서 액션 고정 변경을 검토하고 **Submit review → Approve → Submit review**를 누릅니다.
4. 검사가 모두 성공하고 **Merge pull request**가 활성화되면 **Merge pull request → Confirm merge**를 누릅니다.
   #47을 먼저 병합하지 않습니다.
5. [main Actions](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml?query=branch%3Amain)를 엽니다.
   이 수정 PR 병합으로 새로 시작한 실행을 선택합니다. 예전 실패 실행의 Re-run으로는 수정이 적용되지 않습니다.
6. 승인 대기이면 **Review deployments → release-approval 선택 → Approve and deploy**로 진행합니다.
7. **deploy**에서 액션 참조가 `f33f41b...`인 단계와 이후 SHA·모바일 검사가 성공하는지 확인합니다.
   성공 전에는 배포가 완료됐다고 판단하지 않습니다.
8. [운영 사이트](https://kwonyoung1.github.io/pocket-friends/)를 엽니다.
   데이터 초기화나 새 공유 월드 생성은 하지 않습니다.

## 다시 실패하면

이번 SHA가 실행됐는지 먼저 확인합니다.
새 로그에서도 조회 실패면 추가 재시도를 반복하지 말고 해당 단계의 오류를 확인합니다.
권한·배포 거부 오류가 나온 경우에도 기존 보호 규칙이나 토큰 권한을 임의로 해제하지 않습니다.
REST 경로의 운영 성공은 로컬 모의 검증과 다르며, 실제 Actions 결과로 판단해야 합니다.
