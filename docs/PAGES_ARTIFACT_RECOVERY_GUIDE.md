# GitHub Pages 아티팩트 누락 오류: 클릭 복구 안내

## 현재 확인된 사실

실패 실행: https://github.com/kwonyoung1/pocket-friends/actions/runs/45327183906

`deploy-pages`가 `github-pages-45327183906-1`을 찾지 못했습니다.
추가로 받은 업로드 로그에서 동일 이름의 업로드 성공이 확인됐습니다.
파일 ID는 `14890968253`, 크기는 `22,947,828`바이트입니다.
[업로드 파일](https://github.com/kwonyoung1/pocket-friends/actions/runs/45327183906/artifacts/14890968253)
현재 main의 업로드 이름과 배포 이름 표현식도 일치합니다.
따라서 이름 오타나 업로드 누락으로 단정할 수 없으며, 업로드 완료 이후 배포 액션의 조회 결과가 불일치한 상황입니다.
일시적 반영 지연인지 GitHub 서비스 문제인지는 확인되지 않았습니다.
`punycode`는 경고이며 이 배포 실패의 원인은 아닙니다.
GitHub API 조회가 이 개발 환경에서 403으로 막혀 실제 재실행·원격 배포 상태는 직접 확인하지 못했습니다.

## 1. 기존 실패 실행을 한 번 재시도

1. [실패 실행](https://github.com/kwonyoung1/pocket-friends/actions/runs/45327183906)을 엽니다.
2. 오른쪽 위 **Re-run jobs**를 누릅니다.
3. **Re-run failed jobs**를 선택하고 확인 창이 나오면 실행합니다.
   성공한 테스트까지 전부 반복하는 **Re-run all jobs**는 우선 선택할 필요가 없습니다.
4. **deploy**를 클릭합니다. 실패한 작업의 처음부터 재실행되므로 Pages 업로드도 새 attempt 이름으로 진행됩니다.
5. **Run actions/upload-pages-artifact@v3 → Upload artifact**를 펼칩니다.
   업로드된 파일 이름, Artifact ID, 업로드 완료 여부를 확인합니다.
6. **Run actions/deploy-pages@v4**가 초록색인지 확인합니다.
   이후 **Verify live HTML, exact commit and executable assets** 및 모바일 확인까지 성공해야 운영 배포가 확인된 것입니다.
7. 같은 오류가 다시 나면 계속 재실행하지 말고 업로드 단계의 실제 파일명과 Artifact ID를 확인합니다.
   토큰·비밀번호·서명된 다운로드 URL을 전달할 필요는 없습니다.

주의: 이 재시도는 기존 커밋으로 실행됩니다. 아래 새 검증 코드는 수정 PR이 병합된 뒤 새 실행부터 적용됩니다.

## 2. 업로드 검증 보강 PR 적용

1. [수정 PR 찾기](https://github.com/kwonyoung1/pocket-friends/pulls?q=is%3Apr+head%3Acodex%2Ffix-pages-artifact-readiness)를 엽니다.
2. `Codex: fix-pages-artifact-readiness`를 클릭합니다.
3. **Checks**를 클릭합니다. **Approve workflows to run**이 있을 때만 눌러 검사를 허용합니다.
4. 필수 `unit`, `browser`, `cloud`, `build` 검사 성공을 확인합니다.
5. 이번 PR은 `.github/workflows` 및 배포 스크립트를 수정하므로 기존 보호 정책에 따라 명시적 검토·병합이 필요합니다.
   **Files changed → Submit review → Approve → Submit review**로 검토합니다.
6. 검사가 모두 성공하고 **Merge pull request**가 활성화되면
   **Merge pull request → Confirm merge**를 누릅니다. 보호 규칙·필수 검사는 변경하지 않습니다.
7. [최신 main 실행](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml?query=branch%3Amain)을 엽니다.
   수정 PR 병합 커밋으로 시작한 실행을 선택합니다.
8. `release-approval` 검토 대기이면 **Review deployments → release-approval → Approve and deploy**를 진행합니다.
9. **deploy → Verify this attempt's uploaded Pages artifact**에서
   `Verified Pages artifact: ... id=..., bytes=..., run=...`를 확인합니다.
10. **deploy-pages**와 배포 후 SHA·모바일 검사가 모두 성공했는지 확인합니다.

## 새 검증이 하는 일과 한계

- 업로드 액션이 반환한 `artifact_id`가 없으면 배포 전에 중단합니다.
- 현재 실행에 속한 정확한 이름·ID, 만료 여부, 크기를 검증합니다.
- 조회 결과가 아직 없거나 404이면 최대 6회, 회당 2초 간격으로 기다립니다.
- 중복·다른 ID·만료·빈 파일·권한 오류에서는 다른 파일로 대체하거나 배포를 강행하지 않습니다.
- 배포와 롤백에 같은 검증을 적용합니다. DB나 Supabase 데이터는 수정하지 않습니다.
- 검증은 GitHub REST 목록을 사용합니다. deploy-pages가 사용하는 별도 아티팩트 서비스의 장애까지 복구하거나 성공을 보장하지는 않습니다.
- 검증은 성공했는데 deploy-pages만 같은 오류가 나면 두 단계의 이름·ID 및 [GitHub Status](https://www.githubstatus.com/)를 확인합니다.

## 실제 사이트 확인

[포켓프렌즈 운영 사이트](https://kwonyoung1.github.io/pocket-friends/)

기존 게임을 열어 확인합니다. 확인을 위해 새 공유 월드를 만들거나 데이터를 초기화하지 마세요.
이번 변경에는 Supabase 배포 토큰 재발급이나 DB 마이그레이션이 필요하지 않습니다.
