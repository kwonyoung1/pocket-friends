# 처음 한 번 하는 자동 배포 설정

**1번(main 반영)을 마쳤다면 [2번부터 따라 하는 쉬운 안내서](AUTO_DEPLOY_BEGINNER_GUIDE.md)를 먼저 보세요.**

현재 상태: 자동화 코드는 준비되어 있지만 **이 문서를 작성한 Codex 환경의 GitHub API는 403 Forbidden**이다. 저장소 설정/Secrets 이름 조회·PR 생성·병합·workflow 실행을 실제로 완료하지 못했다. Git push 권한만 있는 상태와 API 권한은 다르다. 따라서 아직 “완전 자동 배포가 운영에서 검증됐다”고 볼 수 없다.

설정 대상: [kwonyoung1/pocket-friends](https://github.com/kwonyoung1/pocket-friends). 개인 계정 소유자가 진행한다. 비밀키를 채팅·코드·PR에 붙이지 않는다. 아래 UI 명칭은 GitHub의 표준 설정 명칭과 공식 문서 링크를 기준으로 했으며, 이번 환경에서는 공식 문서 HTTP 접속도 403이라 현재 사용자 계정 화면을 직접 확인하지 못했다. 명칭/제공 여부가 다르면 연결된 공식 문서를 확인한다.

## 1. 이번 자동화 코드 먼저 한 번 반영하기

1. GitHub 로그인 → [자동화 PR 만들기](https://github.com/kwonyoung1/pocket-friends/compare/main...feat/auto-deploy-system?expand=1).
2. `base: main`, `compare: feat/auto-deploy-system`인지 확인 → **Create pull request**. 이미 PR이 있으면 [PR 목록](https://github.com/kwonyoung1/pocket-friends/pulls)에서 연다.
3. Checks를 기다린다. 기존 `build` 검사는 유지하되 unit/browser/cloud 결과를 합치는 최종 검사로 바뀐다. 기존 PC 테스트/모바일 테스트/보상·권한·중복 지급 검증은 삭제하지 않았다.
4. 아래 환경/변수 설정까지 마친 뒤 이 최초 PR을 **Merge pull request → Confirm merge**한다. 자동화 자체와 health route 변경은 보호 대상이므로 이 PR이 스스로 자동 병합하지 않는다.

이 최초 한 번의 반영은 향후 일반 작업의 반복 수동 PR/병합과 다르다. 현재 권한이 복구되면 Codex가 PR 생성/Checks 감시를 대신할 수 있지만, 실제로 수행하지 않은 단계를 완료로 보고하지 않는다.

## 2. Codex GitHub 연결과 API 권한

1. 사용 중인 Codex 서비스의 GitHub 연결/앱 설정에서 이 저장소가 선택됐는지 확인한다. 서비스별 화면 명칭은 다르므로 임의의 버튼 이름을 지정하지 않는다.
2. GitHub 우측 프로필 → **Settings → Applications**에서 해당 GitHub App 연결과 저장소 접근 범위를 확인한다. 설치 앱 관리는 [Installed GitHub Apps](https://github.com/settings/installations)에서도 연다.
3. `All repositories` 대신 이 저장소만 선택한다. 변경한 저장소 선택은 화면의 **Save**로 저장한다.
4. Codex 환경에서 `gh api repos/kwonyoung1/pocket-friends`가 정상 응답하는지 확인한다. 공개 저장소 조회조차 403이면 토큰 추가 전에 서비스의 GitHub API/네트워크 차단부터 해결한다. 이번 환경은 이 경우에 해당했다.
5. Git transport만 된다면 `git push`는 성공해도 PR/Actions 조회는 실패할 수 있다. 이를 단순 코드 오류로 반복 재시도하지 않는다.

**App 또는 토큰이 필요한 경우만:** GitHub App 설치 토큰을 우선한다(단기 만료). Codex 연결이 API 인증을 제공하지 못할 때는 [Fine-grained personal access tokens](https://github.com/settings/personal-access-tokens) → **Generate new token**, 만료 30일 등 짧은 기간, Resource owner 본인, **Only select repositories: pocket-friends**를 선택한다. 일반 Codex 제출/감시에 필요한 Repository permissions는 **Contents: Read and write**, **Pull requests: Read and write**, **Actions: Read and write**, Metadata 기본 Read이다. 워크플로 파일을 변경하는 이번 초기 작업에만 **Workflows: Read and write**도 필요할 수 있다. 관리 권한 전체/Admin/Secrets 읽기를 일상 토큰에 부여하지 않는다.

GitHub Actions 내부에서는 기본 `GITHUB_TOKEN`을 사용하므로 별도의 장기 PAT를 저장할 필요가 없다. Codex 환경 인증은 서비스의 보안 인증 기능으로 등록하고, 해당 서비스가 GitHub Secret으로 받는 경우에만 거기에 저장한다. 채팅/PR/커밋에 토큰을 넣지 않는다. 앱의 세부 설정 UI는 서비스 제공자 설명을 따른다.

정상 확인: API 조회, `codex/...` 브랜치 push, 자동 PR workflow가 모두 작동해야 한다.

## 3. Actions 권한

1. 저장소 → **Settings → Actions → General** ([바로가기](https://github.com/kwonyoung1/pocket-friends/settings/actions)).
2. 조직 정책이 허용하는 Actions 사용 옵션을 선택한다. 사용하는 공식 `actions/*`, `supabase/setup-cli`, `denoland/setup-deno`를 허용해야 한다. 무조건 모든 외부 Action을 허용할 필요는 없다.
3. 하단 **Workflow permissions**에서 workflow가 요청한 쓰기 권한을 허용한다. 계정 화면이 `Read and write permissions` 선택을 요구하면 선택하고 **Save**. 실제 토큰 권한은 각 YAML의 `permissions`로 제한했다.
4. 같은 영역의 **Allow GitHub Actions to create and approve pull requests**를 켜고 **Save**. 이 설정은 PR 생성에 필요하다. 코드에서는 자기 PR 리뷰 승인 기능을 쓰지 않는다.
5. 조직에서 설정을 잠갔다면 조직 관리자에게 이 저장소에 대한 허용을 요청한다. 우회용 관리자 토큰을 코드에 넣지 않는다.

이 자동화는 기본 토큰으로 만든 PR/병합의 후속 이벤트가 생략되는 것을 고려해 **workflow_dispatch를 명시적으로 호출**한다. 누락된 main 배포는 15분 주기 reconcile이 보완하지만, 이미 실패한 동일 SHA를 무한 재시도하지 않는다.

## 4. main 보호와 자동 병합

1. **Settings → Rules → Rulesets** ([바로가기](https://github.com/kwonyoung1/pocket-friends/settings/rules))에서 main 대상 branch ruleset을 만든다. 제공되지 않으면 **Settings → Branches → Add branch protection rule**을 사용한다.
2. 대상 브랜치는 `main`. **Require a pull request before merging**, **Require status checks to pass**를 켠다.
3. 필수 검사에 기존 이름 **build**를 선택한다. 새 workflow의 첫 실행 전에는 목록에 안 보일 수 있으니 PR Checks가 한 번 실행된 다음 선택한다. 이 검사는 unit/browser/cloud 중 하나라도 실패·취소·skipped이면 실패한다.
4. main 최신 상태 요구(strict up-to-date)를 반드시 켠다. 자동 병합 코드는 main의 PR 필수·build 필수·strict 설정을 API로 확인하며, 확인하지 못하면 병합하지 않는다. 뒤처진 브랜치는 Codex가 최신 main으로 업데이트하고 재검증한다. 자동으로 보호 규칙을 우회하지 않는다.
5. force push/삭제는 허용하지 않는다. Actions/GitHub App을 bypass list에 추가하지 않는다. **Save changes / Create**로 저장하고 main 대상인지 다시 확인한다.
6. 일반 안전 변경도 매번 리뷰가 필요하도록 설정하면 자동 병합은 그 승인을 기다린다. 반복 클릭 없이 운영하려면 일반 PR의 필수 리뷰 수를 강제하지 않고, 아래의 민감 경로 정책 및 별도 `release-approval` 환경을 사용한다. 기존 필수 리뷰 정책을 임의로 제거하지 말고 소유자가 선택한다.

코드는 Actions 기반의 **정확한 head SHA merge API**를 사용한다. GitHub의 보호 규칙/리뷰를 서버가 검사한다. **Settings → General → Pull Requests → Allow auto-merge**는 GitHub 네이티브 Auto-merge를 따로 쓸 때만 필요한 옵션이며, 이 구현의 필수 설정은 아니다. 메뉴가 없다고 자동화 전체가 불가능한 것은 아니다.

GitHub Free 공개 저장소는 사용 가능한 보호 기능을 확인한다. 비공개 저장소/조직 정책/요금제로 보호 기능이 없으면 자동화를 켜기 전에 보호 가능한 플랜/공개 여부를 검토하거나 수동 리뷰 운영을 유지한다. 비용을 피하려고 저장소를 임의 공개하지 않는다.

## 5. 세 환경 설정 — 비밀키를 PR에서 분리

저장소 **Settings → Environments** ([바로가기](https://github.com/kwonyoung1/pocket-friends/settings/environments)).

### cloud-backend

1. 기존 `cloud-backend`를 연다. 없으면 **New environment**, 이름 `cloud-backend`.
2. **Deployment branches and tags**를 선택된 브랜치로 제한하고 **main**만 허용한다. 일반 자동 서버 배포는 항상 병합된 main에서 실행된다. 임의 기능 브랜치가 운영 비밀키에 접근하게 하지 않는다.
3. 일반 안전 서버 배포를 자동으로 허용하려면 이 환경에 매번 Required reviewer를 요구하지 않는다. 현재 reviewer가 있다면 소유자가 정책을 선택한다. 유지하면 그 승인 단계는 여전히 수동이며 자동 완료라고 보고하지 않는다.
4. Environment secrets에 `SUPABASE_ACCESS_TOKEN`을 **Add secret**으로 등록한다. 기존 토큰이 있으면 재사용한다. GitHub는 저장된 값을 다시 보여주지 않는다. 원본을 모르면 Supabase에서 제한된 새 토큰을 발급해 갱신한다.
5. 기존 같은 키가 Repository secrets에 있다면 환경 Secret 등록이 정상임을 확인한 후 저장소 범위 복사본은 제거한다. 이렇게 해야 외부/임의 PR 코드에 운영 자격증명을 노출하지 않는다. 비밀값을 옮긴 척하거나 API로 읽으려 하지 않는다.
6. `GAME_ACCESS_PASSWORD`는 **명시적 수동 비밀번호 갱신** 기능을 쓸 때만 이 환경에 둔다. 자동 배포는 `supabase secrets set`을 호출하지 않으며 기존 서버 비밀값을 유지한다.

Supabase access token은 현재 UI가 지원하는 범위에서 기존 프로젝트의 Edge Function 조회/배포에 필요한 최소 권한을 선택한다. 자동 배포는 DB 관리·프로젝트 생성·비밀키 변경 권한을 쓰지 않는다. 수동 비밀번호 갱신 옵션을 쓸 때만 secrets write가 추가로 필요하다. 만료일을 설정하고 갱신 알림을 관리한다.

### release-approval

1. **New environment** → `release-approval`.
2. **Required reviewers**에 운영 소유자 또는 승인 담당자를 등록 → 보호 설정 저장.
3. 배포 브랜치는 main만 허용한다.
4. 이 환경에는 비밀키를 넣지 않는다. 코드가 reviewer 설정의 존재를 API로 검사하고, 보호가 없거나 읽을 수 없으면 중단한다. 같은 이름의 빈 환경이 자동 생성돼도 승인으로 간주하지 않는다.

이 환경의 수동 승인은 DB/인증/경제/배포 코드 등 민감 변경과 최초 구축/롤백에만 사용한다. GitHub UI가 reviewer 기능을 제공하지 않는 플랜이면 해당 범주의 자동 운영 배포를 켜지 말고 보호 가능한 운영 방식으로 바꾼다. 승인 확인 코드를 지우는 것은 대안이 아니다.

### github-pages

1. 기존 `github-pages`를 연다.
2. 배포 브랜치를 main으로 제한한다. 정상 자동 웹사이트 배포를 위해 일반 배포마다 불필요한 reviewer를 요구하지 않는지 소유자가 확인한다.
3. `release-approval`은 별도 보호 단계이므로 민감 변경은 계속 승인이 필요하다.

## 6. 저장소 변수와 Supabase 기존 설정

**Settings → Secrets and variables → Actions → Variables** ([바로가기](https://github.com/kwonyoung1/pocket-friends/settings/variables/actions)) → **New repository variable**. 다음 값은 비밀 토큰이 아니라 공개 설정/정책이다.

| 이름 | 값 |
|---|---|
| `AUTO_PR_ENABLED` | `true` — 내부 Codex 브랜치 PR 생성 허용 |
| `AUTO_MERGE_ENABLED` | `true` — 안전한 변경의 조건부 자동 병합에 최초 동의 |
| `AUTO_SERVER_DEPLOY_ENABLED` | `true` — 보호 대상이 아닌 승인된 함수 변경의 자동 배포에 최초 동의 |
| `TRUSTED_CODEX_ACTORS` | 기본은 저장소 소유자. 추가 Codex App/bot이 필요하면 정확한 GitHub login을 쉼표로 입력. 외부 사용자·와일드카드 금지 |
| `SUPABASE_PROJECT_REF` | 기존 프로젝트 reference ID. 새 프로젝트 생성 금지 |
| `VITE_CLOUD_ENABLED` | 기존 운영 설정 유지(운영 main 빌드는 cloud 활성화를 요구함) |
| `VITE_SUPABASE_URL` | 기존 `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | 기존 **공개 publishable/anon** 키. service_role/secret 키 금지 |
| `SUPABASE_HEALTH_ANON_JWT` | 기존 공개 키가 JWT 형식의 legacy anon이면 생략 가능. `sb_publishable_...`이면 같은 프로젝트의 공개 legacy anon JWT를 여기에 지정 |

Supabase Dashboard에서 기존 프로젝트 → API Keys 설정을 연다. 현재 UI에서 Legacy anon key를 제공하는지 확인하고 **anon/public**만 사용한다. 새 프로젝트나 관리자 키를 만들지 않는다. legacy 공개 anon JWT를 사용할 수 없는 프로젝트라면 현재 health probe는 작동하지 않으므로 임의로 JWT 검증을 끄지 말고 별도 읽기 전용 모니터 인증 설계를 먼저 검토한다.

Supabase Edge Function 기존 secrets의 `GAME_ACCESS_PASSWORD`, `GAME_ALLOWED_ORIGINS`도 확인한다. 허용 origin에는 `https://kwonyoung1.github.io`가 필요하며 `/pocket-friends/` 경로를 origin에 넣지 않는다. 자동 배포가 이를 덮어쓰지 않는다. `SUPABASE_SERVICE_ROLE_KEY`는 Supabase 서버 환경에만 있어야 하며 GitHub 프런트엔드 변수에 넣지 않는다.

## 7. GitHub Pages

1. **Settings → Pages** ([바로가기](https://github.com/kwonyoung1/pocket-friends/settings/pages)).
2. **Build and deployment → Source: GitHub Actions** 확인.
3. 저장 버튼이 표시되는 설정에서 변경했다면 저장한다. 기존에 Actions 방식이면 바꿀 필요 없다.
4. 운영 주소는 [게임](https://kwonyoung1.github.io/pocket-friends/)이다. 저장 데이터/도메인/브랜치 내용을 초기화하지 않는다.

## 8. 최초 배포와 자동화 실험

1. 최초 자동화 PR Checks 통과 후 한 번 병합한다.
2. [Test and deploy Pocket Friends](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml)에서 main 실행을 연다. 최초 구축은 `release-approval`에서 **Review deployments**가 나타나면 내용을 확인해 승인한다.
3. `backend`가 두 기존 함수에 health/version을 설치하고 확인한 뒤 Pages를 배포한다. `deploy` 마지막의 live SHA 검사와 모바일 boot 검사까지 통과해야 운영 검증 성공이다. DB SQL은 실행하지 않는다.
4. Codex API가 복구됐다면 Codex에게 `automation-smoke.yml`을 main에서 한 번 실행하고 결과를 감시하도록 요청한다. 직접 처음 시험할 때만 [Automation smoke experiment](https://github.com/kwonyoung1/pocket-friends/actions/workflows/automation-smoke.yml) → **Run workflow → main → Run workflow**.
5. 이 workflow는 사용자 화면을 바꾸지 않는 문서를 `codex/automation-smoke-<run>` 브랜치에 커밋하고 PR 생성/검사 실행을 자동 수행한다. 신뢰한 시작 사용자와 정확한 PR head SHA를 artifact로 결합한다. 조건을 충족하면 자동 병합·main 배포·실제 URL 검증까지 이어진다.
6. 각 실행 Summary에서 PR 번호/커밋/서버 대상/승인 여부/실제 사이트 검증을 확인한다. main 배포의 `release-proof-<sha>`가 있어야 배포 검증 완료다.
7. 막히면 [문제 해결](AUTO_DEPLOY_TROUBLESHOOTING.md)을 사용한다. 녹색 build만으로 운영 배포 성공으로 간주하지 않는다.

현재 환경에서는 4~6단계를 실제 실행할 API 권한이 없으므로 미완료다. 설정을 마친 뒤 한 번 성공한 실제 실험 결과로 이를 대체해야 한다.

## 공식 참고 문서

- [GITHUB_TOKEN으로 발생시킨 이벤트와 workflow_dispatch](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow)
- [Workflow permissions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication)
- [Protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Environments / required reviewers](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [GitHub Pages Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

### 환경 보호 조회만 403인 경우

전체 GitHub API는 되는데 `approval-config`의 환경 보호 조회만 403이면, 저장소 하나에 대한 **Environments: Read-only** 권한의 단기 fine-grained token 또는 동일 권한 GitHub App 토큰을 `ENVIRONMENT_READ_TOKEN` Repository secret에 등록할 수 있다. 기본은 `GITHUB_TOKEN`이며 이 추가 토큰은 선택 사항이다. 해당 토큰은 reviewer 구성 읽기에만 쓰고, 보호 규칙을 바꾸거나 승인하는 데 쓰지 않는다. API가 네트워크 전체에서 차단된 현재 환경의 403을 이 토큰으로 해결했다고 가정하지 않는다.
