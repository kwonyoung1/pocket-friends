# Pages 배포 파일 ID 직접 사용 — 클릭 안내

## 이번 실패와 변경

실패 실행: https://github.com/kwonyoung1/pocket-friends/actions/runs/45549364867

업로드 성공 후 v4의 내부 목록 조회가 파일을 찾지 못했고, REST 목록을 사용한 v4.0.0 고정도 실제 실행에서 `artifacts[0]`이 없어 실패했습니다. 두 안내 모두 운영 성공을 확인하지 못했습니다. 기존 실패 실행을 계속 재시도하거나 이전 버전 고정을 다시 적용하지 않습니다.

이번에는 `upload-pages-artifact@v3`가 반환한 `artifact_id`를 그대로 사용합니다.

1. `/actions/artifacts/{artifact_id}`로 해당 파일을 직접 조회합니다. 목록/count/이름 검색을 사용하지 않습니다.
2. 파일 ID·이름·실행 ID·main 브랜치·현재 커밋 SHA·만료·크기를 검증합니다.
3. 기존 작업 토큰과 OIDC 토큰으로 GitHub Pages REST API에 검증한 ID를 한 번 전달합니다.
4. 생성된 배포 ID의 상태를 확인하여 `succeed`일 때만 성공 처리합니다. 생성 POST는 실패해도 자동 재전송하지 않습니다.
5. 조회·상태 대기는 제한되며 권한 오류는 중단합니다. 대기 중 실패·시간 초과·작업 취소에는 해당 배포 취소를 시도합니다.
6. 이후 기존 공개 HTML/정확한 SHA/실행 파일/모바일 검사는 그대로 실행합니다.

새 이름을 임의로 찾거나 다른 실행의 파일로 대체하지 않습니다. 권한·승인·필수 CI·서버 게이트는 유지합니다. Supabase 설정이나 배포 토큰 변경은 필요 없습니다. 실제 GitHub 서비스에서의 성공은 새 main 배포가 통과한 뒤에만 확인할 수 있습니다.

## 1. PR 열기와 검토

1. [이번 PR 찾기](https://github.com/kwonyoung1/pocket-friends/pulls?q=is%3Apr+head%3Acodex%2Ffix-pages-artifact-id)를 엽니다.
2. `Codex: fix-pages-artifact-id`를 클릭합니다.
3. **Files changed**를 확인하고 **Submit review → Approve → Submit review**로 리뷰를 먼저 제출할 수 있습니다.
4. **Approve workflows to run**이 표시되면 별도로 눌러 검사를 시작합니다.
5. **Checks**에서 필수 `unit`, `browser`, `cloud`, `build` 성공을 기다립니다. 이번에도 기존 필수 CI를 우회하지 않습니다.
6. **Merge pull request → Confirm merge**로 병합합니다. 자동 병합이 완료됐으면 **Merged**만 확인합니다.

## 2. 새 main 실행에서 배포

1. [최신 main Actions](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml?query=branch%3Amain)를 엽니다.
2. 이 PR의 병합 커밋으로 시작한 새 실행을 클릭합니다. 예전 실패 실행의 Re-run은 새 코드를 사용하지 않습니다.
3. 승인 대기이면 **Review deployments → release-approval 체크 → Approve and deploy**로 진행합니다.
4. **deploy → Run actions/upload-pages-artifact@v3 → Upload artifact**에서 완료와 Artifact ID를 확인합니다.
5. 새 **Deploy the exact uploaded Pages artifact ID** 단계를 펼칩니다.
6. 다음 로그를 확인합니다.
   - `Verified uploaded Pages artifact ...`: 업로드와 동일한 ID/이름/실행/SHA 검증 완료
   - `Created Pages deployment ... from artifact ...`: 해당 ID로 배포 생성
   - `Pages deployment ... succeeded`: GitHub가 성공 상태를 반환
7. 이어지는 **Verify live HTML, exact commit and executable assets**, **Read-only live mobile boot check**까지 성공해야 운영 검증 완료입니다.
8. [포켓프렌즈 열기](https://kwonyoung1.github.io/pocket-friends/)에서 새 콘텐츠를 확인합니다. 데이터 초기화나 새 공유 월드 생성은 하지 않습니다.

## 3. 다시 실패하면

- `Upload returned no valid artifact_id`: 업로드 하위 로그와 업로드 성공 여부를 확인합니다.
- `metadata does not match`: 업로드 ID·실행/attempt·커밋을 대조합니다. 다른 파일로 바꿔 배포하지 않습니다.
- 파일 ID GET이 404: 제한된 조회 후에도 실제 파일이 조회되지 않은 상태입니다. 해당 업로드 파일 링크와 [GitHub Status](https://www.githubstatus.com/)를 확인합니다.
- 401/403: [Pages 설정](https://github.com/kwonyoung1/pocket-friends/settings/pages)과 해당 실행 권한·환경 승인을 확인합니다. 토큰이나 OIDC 값을 채팅에 붙이지 않습니다.
- 생성 요청 실패/유효한 배포 ID 없음: 요청이 처리됐는지 불명확할 수 있어 자동으로 생성 요청을 반복하지 않습니다. [저장소 Deployments](https://github.com/kwonyoung1/pocket-friends/deployments)를 확인합니다.
- 시간 초과·취소 API 오류: 진행 중 배포 상태부터 확인한 뒤 재시도합니다. 성공이 확인되지 않은 상태를 완료로 보고하지 않습니다.

[Environments](https://github.com/kwonyoung1/pocket-friends/settings/environments) · [전체 Actions](https://github.com/kwonyoung1/pocket-friends/actions)
