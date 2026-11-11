# 자동 배포 최초 설정 — 1번 완료 후 따라 하는 안내서

대상: `kwonyoung1/pocket-friends`. 자동화 코드의 main 반영은 완료된 상태를 기준으로 한다.
아래 설정은 처음 한 번 필요하다. GitHub에 `kwonyoung1`로 로그인하고 진행한다.
화면 명칭은 계정/언어에 따라 조금 다를 수 있다. 실제 계정의 설정 완료 여부는 아직 확인하지 못했다.

## 2. GitHub Actions가 PR을 만들 수 있도록 허용

1. [Actions 설정 열기](https://github.com/kwonyoung1/pocket-friends/settings/actions).
2. 페이지 아래쪽 **Workflow permissions**를 찾는다.
3. **Read and write permissions**를 선택한다.
4. **Allow GitHub Actions to create and approve pull requests**를 체크한다.
5. **Save**를 누른다.

완료 기준: 저장 후 다시 열어도 선택과 체크가 유지된다.
이름에 approve가 있어도 이번 자동화는 자기 PR을 스스로 리뷰 승인하지 않는다.
상단 Actions 사용 설정은 이미 실행되고 있다면 그대로 둔다. 액션 허용 목록을 쓰는 경우 기존 `actions/*`, `supabase/setup-cli`, `denoland/setup-deno`를 허용해야 한다.

## 3. 검사를 통과해야 main에 합쳐지도록 설정

1. [브랜치 보호 설정 열기](https://github.com/kwonyoung1/pocket-friends/settings/branches).
2. 기존 main 보호 규칙이 있으면 **Edit**. 없으면 **Add classic branch protection rule** 또는 **Add branch protection rule**을 누른다.
3. **Branch name pattern**에 `main`을 입력한다.
4. **Require a pull request before merging**을 체크한다.
5. **Require status checks to pass before merging**을 체크한다.
6. 그 안의 **Require branches to be up to date before merging**을 체크한다.
7. 검사 검색 칸에 `build`를 검색하고, 이 저장소의 **Test and deploy Pocket Friends**가 실행한 `build`를 선택한다.
8. **Allow force pushes**, **Allow deletions**는 켜지 않는다. 자동화용 계정을 우회 목록에 추가하지 않는다.
9. 맨 아래 **Create / Save changes**를 누른다.

`build`가 검색되지 않으면 Actions에서 새 배포 워크플로의 검사가 한 번 실행된 뒤 다시 확인한다. 다른 이름의 검사를 임의로 대신 고르지 않는다.

**리뷰 설정 주의:** `Require approvals`는 사람의 PR 리뷰를 매번 요구하는 옵션이다. 새 규칙에서 일반 변경의 완전 자동 병합을 원한다면 이 하위 옵션을 강제하지 않는다. 이미 운영 중인 필수 리뷰 정책이 있다면 임의로 해제하지 않는다. 유지하면 자동화도 리뷰를 기다린다. 위험한 운영 변경은 다음 단계의 별도 승인으로 보호한다.

Branches 대신 Rulesets만 보이면 [Rulesets](https://github.com/kwonyoung1/pocket-friends/settings/rules) → **New ruleset → New branch ruleset**에서 이름 `main-protection`, Enforcement **Active**, 대상 브랜치 `main`으로 만든다. PR 필수, status checks 필수, `build`, 최신 브랜치 요구를 동일하게 설정한다. 같은 목적의 규칙을 중복 생성할 필요는 없다.

완료 기준: main 대상 규칙에 PR 필수·build 필수·최신 main 요구가 저장되어 있다. 보호 기능이 제공되지 않으면 자동 병합 활성화보다 먼저 해당 제한을 확인한다.

## 4. 배포 장소 세 개 만들기

[Environments 열기](https://github.com/kwonyoung1/pocket-friends/settings/environments).
이미 같은 이름이 있으면 새로 만들지 않고 연다. 없으면 **New environment → 이름 입력 → Configure environment**.

### 4-A. cloud-backend — 서버 배포용

1. 이름을 정확히 `cloud-backend`로 만든다.
2. **Deployment branches and tags**에서 **Selected branches and tags**를 선택한다.
3. **Add deployment branch or tag rule**에서 Branch `main`을 추가한다.
4. 일반 서버 변경도 자동으로 배포하려면 이 환경에는 **Required reviewers**를 새로 추가하지 않는다. 기존 승인 정책은 소유자가 유지 여부를 결정한다.
5. 아래 **Environment secrets → Add environment secret**를 누른다.
6. Name: `SUPABASE_ACCESS_TOKEN`.
7. Value: 기존 Supabase 배포용 access token. **Add secret**로 저장한다.

이 토큰은 게임 로그인 비밀번호나 `anon` 키가 아니다. Supabase 계정의 Access Tokens에서 관리하는 배포 자격증명이다. 기존 GitHub Secret은 값을 다시 볼 수 없다. 기존 원본을 알고 있으면 재사용하고, 원본이 없을 때만 Supabase 계정 설정에서 새 토큰을 발급한다. 채팅에 보내지 않는다.

[Repository secrets](https://github.com/kwonyoung1/pocket-friends/settings/secrets/actions)에 같은 `SUPABASE_ACCESS_TOKEN`이 있다면, 환경 Secret에 올바른 값을 등록한 것을 확인한 뒤 저장소 범위 복사본을 제거한다. 이름만 옮겨 적으면 값이 복사되는 것이 아니다. 초기 검증이 끝나기 전 기존 토큰 자체를 Supabase에서 폐기하지 않는다.

`GAME_ACCESS_PASSWORD`는 수동으로 서버 비밀번호를 바꾸는 별도 기능에만 필요하다. 이번 설정을 위해 기존 게임 비밀번호나 Supabase 서버 Secrets를 변경하지 않는다.

### 4-B. release-approval — 중요한 변경의 승인용

1. 이름을 정확히 `release-approval`로 만든다.
2. **Required reviewers**를 체크하고 `kwonyoung1`을 검색해 등록한다.
3. 표시되는 **Save protection rules** 등 저장 버튼으로 저장한다.
4. **Prevent self-review**가 있다면, 혼자 운영하며 본인이 시작한 최초 배포를 승인할 경우 켜지 않는다. 켜면 다른 승인 담당자가 필요하다.
5. 배포 브랜치는 4-A와 같이 `main`만 허용한다.
6. 이 환경에는 비밀키를 넣지 않는다.

완료 기준: reviewer 목록에 실제 계정이 보인다. 이름만 만든 빈 환경은 승인 보호가 아니다.
이 승인은 최초 구축, 인증·재화·배포 코드 등 중요한 변경, 롤백 때 필요하다. 모든 일반 업데이트마다 요구하는 것은 아니다.
Required reviewers 자체가 보이지 않으면 여기서 제한 원인을 확인해야 한다. 자동화의 승인 검사를 삭제해서 통과시키지 않는다.

### 4-C. github-pages — 웹사이트 배포용

1. 기존 `github-pages` 환경을 연다. 없을 때만 만든다.
2. 배포 브랜치를 `main`만 허용한다.
3. 일반 웹 배포를 자동으로 하려면 이 환경에 매번 reviewer를 요구하지 않는다. 기존 승인 정책을 유지하면 그 단계는 수동으로 남는다.

## 5. 기존 Supabase 연결값 확인

[Actions Variables 열기](https://github.com/kwonyoung1/pocket-friends/settings/variables/actions).
**Secrets가 아니라 Variables 탭**이다. 기존 이름이 있으면 연필 버튼으로 확인하고, 없으면 **New repository variable**로 만든다.

| Name — 그대로 입력 | Value |
|---|---|
| `SUPABASE_PROJECT_REF` | 현재 게임이 사용하는 기존 Supabase 프로젝트 ID |
| `VITE_CLOUD_ENABLED` | `true` |
| `VITE_SUPABASE_URL` | 기존 `https://프로젝트ID.supabase.co` 주소 |
| `VITE_SUPABASE_ANON_KEY` | 기존 공개 `anon` 또는 publishable 키 |

프로젝트 ID는 기존 Supabase 프로젝트의 Settings → General의 Reference ID 등에서 확인한다. 프로젝트 URL의 `https://`와 `.supabase.co` 사이 값과 같은지 확인한다. 새 프로젝트를 만들지 않는다.

API 키는 기존 프로젝트의 Settings → API Keys에서 확인한다. **anon / public / publishable**만 프런트엔드에 사용한다. **service_role / secret 키는 절대 이 표의 변수에 넣지 않는다.**

추가 확인:

- `VITE_SUPABASE_ANON_KEY`가 `eyJ...`로 시작하는 기존 legacy anon JWT이면 health용 별도 변수를 생략할 수 있다.
- `sb_publishable_...`로 시작하면 **`SUPABASE_HEALTH_ANON_JWT`** 변수를 추가하고, 같은 프로젝트의 **legacy anon 공개 JWT**를 넣는다. publishable 키를 이 변수에 그대로 복사하지 않는다.
- Legacy anon 키를 찾을 수 없다면 JWT 검증을 끄거나 관리자 키로 대체하지 말고 해당 항목이 미완료임을 알려준다.
- 기존 Supabase 서버의 `GAME_ALLOWED_ORIGINS`에 `https://kwonyoung1.github.io`가 허용돼야 한다. `/pocket-friends/` 경로를 origin에 붙이지 않는다. 이미 정상인 값을 초기화하지 않는다.

## 6. 자동화 스위치 켜기

2~5번을 저장한 뒤 같은 [Actions Variables](https://github.com/kwonyoung1/pocket-friends/settings/variables/actions)에서 다음 세 개를 추가한다. Name과 Value는 별도 칸이다.

| Name | Value |
|---|---|
| `AUTO_PR_ENABLED` | `true` |
| `AUTO_MERGE_ENABLED` | `true` |
| `AUTO_SERVER_DEPLOY_ENABLED` | `true` |

소문자 `true`만 입력한다. 따옴표는 넣지 않는다.
`TRUSTED_CODEX_ACTORS`는 처음에는 만들지 않아도 된다. 기본으로 저장소 소유자를 신뢰한다. 실제 Codex 작업이 다른 App/bot 계정으로 push되어 차단될 때 정확한 계정을 확인한 후 추가한다. 임의의 계정이나 `*`를 넣지 않는다.

이 스위치는 검사 실패·리뷰 대기·위험한 변경의 승인을 무시하지 않는다.

## 7. Pages 설정 확인

1. [Pages 설정 열기](https://github.com/kwonyoung1/pocket-friends/settings/pages).
2. **Build and deployment → Source**가 **GitHub Actions**인지 확인한다.
3. 이미 맞으면 그대로 둔다. 다르면 변경하고 표시되는 저장 버튼을 누른다.

## 8. 최초 배포 한 번 확인

코드는 이미 병합했으므로 PR을 다시 만들거나 다시 병합할 필요는 없다.

1. [Test and deploy Pocket Friends](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml)를 연다.
2. 자동화 코드가 main에 병합되어 시작된 실행을 연다.
3. 설정 전 시작되어 실패한 실행이면 원인을 확인하고, 위 설정을 마친 뒤 **Re-run all jobs**로 한 번 다시 실행한다. 실행 자체가 없으면 최초 1회만 **Run workflow → main → Run workflow**를 사용한다.
4. **Review deployments**가 표시되면 `release-approval`과 배포 내용을 확인하고 **Approve and deploy**를 누른다.
5. `build`, 필요한 `backend`, `backend-gate`, `deploy`의 결과를 확인한다. 서버 변경이 없을 때 backend가 생략되는 것은 정상일 수 있다.
6. `deploy` 안의 사이트 버전 및 모바일 실행 확인까지 통과해야 성공이다. `build`만 초록색이라고 배포 완료는 아니다.

실패 메시지가 `approval-config`의 환경 조회 403이면, 일반 API 차단과 별개로 환경 설정 조회 권한이 부족한 경우가 있다. [기존 상세 안내서의 마지막 항목](AUTO_DEPLOY_SETUP.md#환경-보호-조회만-403인-경우)을 따른다. **모든 사용자에게 새 PAT가 필수인 것은 아니다.** 토큰을 만들기 전에 실패 단계와 메시지부터 확인한다.

## 9. 자동화 전체 시험 한 번 실행

최초 배포 성공 후 [Automation smoke experiment](https://github.com/kwonyoung1/pocket-friends/actions/workflows/automation-smoke.yml) → **Run workflow → main → Run workflow**.

이 시험은 게임 내용을 바꾸지 않는 문서 변경을 만든다. 그 뒤 PR 생성 → 검사 → 조건부 자동 병합 → main 배포가 이어지는지 확인한다. 첫 smoke 실행 하나가 초록색인 것만으로 끝은 아니다. 생성된 PR의 **Merged** 상태와 후속 main 배포의 실제 사이트 검사까지 성공해야 한다.

이것까지 통과하면 이후 일반 변경에서 PR 생성·병합·Run workflow를 반복해서 누르는 작업을 줄일 수 있다. 중요한 변경의 승인과 만료된 토큰 갱신은 남는다.

## Codex 연결은 별도로 확인할 사항

위 설정은 GitHub Actions 내부 자동화에 관한 것이다. Codex에서 직접 PR/실행 상태를 읽을 API 연결도 필요하다.
[Installed GitHub Apps](https://github.com/settings/installations)에서 사용하는 Codex 앱에 이 저장소 접근이 있는지 확인한다. 앱이 여러 개라면 이름을 추측해 다른 앱을 변경하지 않는다.

이전 Codex 환경은 Git push는 되지만 API는 403이었다. 저장소의 Actions 권한을 켰다고 이 네트워크 제한까지 해결되는 것은 아니다. 설정 후 Codex에 “최초 설정 완료했으니 API 연결과 자동화 시험 결과 확인해줘”라고 요청한다. 토큰은 채팅에 보내지 않는다.

## 마지막 체크

- [ ] Actions 쓰기 권한·PR 생성 허용 저장
- [ ] main 보호: PR + build + 최신 브랜치 필수
- [ ] cloud-backend: main 제한 + 올바른 access token
- [ ] release-approval: main 제한 + 실제 reviewer
- [ ] github-pages: main 제한
- [ ] 기존 Supabase 공개 연결값 및 health JWT 확인
- [ ] AUTO_* 세 변수 true
- [ ] Pages Source GitHub Actions
- [ ] 최초 운영 배포의 실제 사이트 검사 통과
- [ ] smoke PR 자동 병합과 후속 배포 통과

문제가 있으면 비밀값을 가린 실패 단계·오류 문구를 공유한다. 설정 완료와 운영 검증 완료는 위 체크에 근거해 따로 보고한다.
