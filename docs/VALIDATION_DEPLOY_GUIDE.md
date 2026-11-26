# 검증 등급 최적화 — 클릭 배포 안내

이번 작업 브랜치는 `codex/selective-validation`입니다. 자동화 자체를 바꾸므로 이번 도입은 **FULL**이며, FAST 시간 단축은 정책이 main에 병합·배포된 다음 단순 업데이트부터 적용됩니다. 기존 게임 데이터/DB/접속 비밀번호/배포 토큰을 바꾸지 않습니다.

## 1. 이번 변경 확인

1. [이번 브랜치 PR 찾기](https://github.com/kwonyoung1/pocket-friends/pulls?q=is%3Apr+head%3Acodex%2Fselective-validation)를 엽니다.
2. `main ← codex/selective-validation` PR을 선택합니다. **Files changed**에서 공통 정책, `deploy.yml`, `AGENTS.md`, 클릭 안내서를 확인합니다.
3. 요청 등급은 `validation.request.json`의 `FULL`입니다. 이후 자동 PR에는 **검증 등급 요청** 항목도 표시됩니다. PR 본문·라벨·커밋 메시지만 바꿔 FAST로 낮출 수 없습니다.
4. PR이 없다면 [자동 PR 워크플로](https://github.com/kwonyoung1/pocket-friends/actions/workflows/auto-pr.yml)의 해당 브랜치 실행을 확인합니다. 생성 실패가 확인된 경우에만 [변경 비교 → Create pull request](https://github.com/kwonyoung1/pocket-friends/compare/main...codex/selective-validation?expand=1)를 사용합니다.

## 2. 이번 FULL 검사와 필수 승인

1. PR의 **Checks**를 엽니다. **Approve workflows to run**이 보일 때만 눌러 실행을 허용합니다.
2. `changes` → `unit`, `browser`, `cloud` → **build**를 확인합니다. 이번에는 첫 정책 도입이므로 모두 필요한 검사입니다. **build Success**가 되어야 합니다.
3. Actions 실행 **Summary**에서 `Requested`, `Automatic minimum`, `Applied: FULL`, 판정 이유를 확인합니다. `validation-plan-<run>-<attempt>` 아티팩트에도 계획이 있습니다.
4. 기존 리뷰가 필요하면 **Files changed → Submit review → Approve → Submit review**를 사용합니다. 검사가 완료되기 전에 리뷰를 먼저 제출해도 필수 검사를 우회하지는 않습니다.
5. 자동 병합이 예약되어 있으면 기다립니다. 필수 검사가 모두 통과했고 리뷰가 끝났지만 자동 병합이 예약되지 않은 경우에만 **Merge pull request → Confirm merge**를 누릅니다.

기존 [AGENTS.md](../AGENTS.md)는 자동화/워크플로 변경에 대해 “before the required explicit review/production approval”를 요구합니다. 이번 PR은 그 보호 대상입니다. Codex는 보호 규칙이나 승인 환경을 끄지 않습니다.

## 3. main 배포 마무리

1. [main 배포 목록](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml?query=branch%3Amain)을 엽니다.
2. 이번 PR 병합 커밋의 최신 실행을 누릅니다. 예전 커밋을 재실행하면 새 정책이 적용되지 않습니다.
3. `changes`, 필요한 검사, `build`, `plan`을 확인합니다.
4. **Review deployments**가 표시되면 `release-approval` → **Approve and deploy**를 누릅니다. 이미 승인돼 실행 중이면 다시 설정하지 않습니다.
5. `backend-gate`, `deploy`와 배포 후 SHA/HTML/JS/모바일 읽기 전용 실행 검사가 성공해야 합니다.
6. [운영 사이트](https://kwonyoung1.github.io/pocket-friends/)를 엽니다. 이번 변경은 배포/검증 정책이므로 새 게임 버튼이 추가되는 업데이트는 아닙니다. 기존 게임이 그대로 열려야 합니다.

이번 작업 자체는 Supabase 런타임을 수정하지 않습니다. 다만 이전 main의 미배포 서버 변경이 누적되어 있다면 기존 `plan`에 따라 필요한 함수 배포를 진행합니다. `backend`가 생략되어도 `backend-gate`와 `deploy`가 성공해야 하며, 서버가 필요한데 배포가 실패하면 사이트 발행도 차단됩니다.

## 4. 다음부터 검증 등급 요청하기

다음 개발 요청에 원하는 한 줄을 붙입니다.

- `검증 등급: AUTO` — 기본값. 실제 변경에 맞춰 선택합니다.
- `검증 등급: FAST` — 단순 수치·이미지 변경 요청. 위험도가 높으면 자동 상향됩니다.
- `검증 등급: STANDARD` — 관련 기능 검사를 더 요구합니다.
- `검증 등급: FULL` — 전체 검사를 요구합니다.

사용자가 GitHub 설정을 매번 바꿀 필요는 없습니다. Codex가 main 기준 SHA에 묶인 요청 파일을 기록하고, CI가 실제 diff를 독립 판정합니다. 이전 작업의 요청 파일을 수정하지 않으면 다음 작업의 요청으로 계속 재사용하지 않습니다.

## 5. 정상적인 FAST / STANDARD 확인

1. 다음 단순 업데이트 PR의 **Checks → changes**를 누릅니다.
2. **Summary**에서 `Applied: FAST`와 숫자/정적 에셋 판정 이유를 확인합니다.
3. `unit`의 관련 검사 및 빌드가 성공해야 합니다. `browser`, `cloud`는 정책상 **Skipped**이고 생략 사유가 있어야 합니다. 이를 “테스트 통과”로 보고하지 않습니다.
4. 최종 **build**가 성공하면 선택한 범위의 필수 검사가 모두 충족된 것입니다.
5. 새 스킬·전투/UI 변경은 STANDARD로 올라가 선택된 브라우저/클라우드 테스트 파일을 실행합니다.
6. 서버·성장·재화·자동화·설정/의존성 변경, 불확실한 분석, 마지막 운영 배포 증명 미확인 시에는 FULL입니다. FAST를 요청해도 낮출 수 없습니다.

FAST인데 **build**가 실패하면 생략된 job을 강제로 성공시키지 마세요. 필요한 검사 실패인지, 예상 밖 취소/Skipped인지 로그로 확인해야 합니다.

## 6. 실패 시 대응과 설정 링크

- **분석 불가/정책 파일 없음/API 조회 실패:** FULL로 복구합니다. 첫 도입의 FULL 표시는 정상입니다. `changes` 자체가 실패했거나 계획이 없으면 필수 `build`도 실패합니다.
- **main이 앞서간 PR:** 최신 main을 반영하고 새 커밋 검사 결과를 확인합니다. 예전 base의 증명을 재사용하지 않습니다.
- **Chromium 캐시 손상:** 한 번 재설치/실행 확인 후 다시 실패하면 실패로 남깁니다. 실패 로그를 확인하고 원인을 고칩니다.
- **PR/main 중복 검사:** 현재는 정책에 따른 main 검사와 새 빌드를 유지합니다. PR 결과를 main 대신 썼다고 판단하지 않습니다.
- **검사 실패:** 빨간 job → 빨간 단계 → 로그/실패 trace를 확인합니다. 수정 후 새 커밋 검사 결과를 봅니다. 이전 실패 실행의 Re-run은 새 코드를 검사하지 않습니다.
- **배포 실패:** [현재 main 실행](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml?query=branch%3Amain)에서 실패 단계와 SHA를 먼저 확인합니다. 새 정책이 불안정하면 분류 실패는 FULL로 닫히므로 FAST를 강제로 쓰지 않습니다. 수정/되돌림 PR 역시 FULL 검사를 통과해야 합니다. 필요한 경우 [기존 승인된 사이트 롤백](https://github.com/kwonyoung1/pocket-friends/actions/workflows/rollback-pages.yml)을 사용하며 사용자 데이터를 되돌리지 않습니다.

진단할 때만 확인하는 기존 설정: [일반](https://github.com/kwonyoung1/pocket-friends/settings), [Actions 권한](https://github.com/kwonyoung1/pocket-friends/settings/actions), [Actions 변수](https://github.com/kwonyoung1/pocket-friends/settings/variables/actions), [환경/승인](https://github.com/kwonyoung1/pocket-friends/settings/environments), [브랜치 보호](https://github.com/kwonyoung1/pocket-friends/settings/branches), [Rules](https://github.com/kwonyoung1/pocket-friends/settings/rules), [Pages](https://github.com/kwonyoung1/pocket-friends/settings/pages).이미 정상인 설정은 다시 변경하지 않습니다. 이번 기능 때문에 토큰을 재발급할 필요도 없습니다.

GitHub API/권한 접근이 막혀 Codex가 상태를 조회하지 못하는 경우 [기존 자동 배포 설정 안내](../AUTO_DEPLOY_SETUP.md)를 참고합니다. 이미 정상인 설정을 초기화하지 않습니다. 푸시/PR 생성, 필수 CI, 병합, 운영 발행과 SHA 확인은 각각 다른 완료 단계입니다.
