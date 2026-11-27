# 공통 검증 정책

기본값 **AUTO**. `scripts/validation/policy.mjs`가 Codex 로컬 검사와 CI의 공통 기준입니다. 실행할 검사를 줄이는 기능이며, 기존 코드 리뷰/운영 승인이나 서버 보안·보상 검증을 끄는 기능은 아닙니다.

| 요청 | 실제 최소 등급 | 최종 |
|---|---|---|
|AUTO/FAST|허용된 기존 수치·정적 에셋|FAST|
|FAST|새 스킬·전투·UI 제어|STANDARD|
|FAST/STANDARD|서버·저장·재화·자동화·의존성/설정|FULL|
|FULL|어떤 변경이든|FULL|
|무효 요청/불확실한 분석|FULL|FULL|

## 판정 범위

- **FAST:** `src/arena/characters.ts`, `beasts.ts`, `stages.ts`, `enemy-pressure.ts`, `balance.ts`에서 기존 HP/ATK/DEF/SPD 및 허용된 스킬 계수 숫자만 변경한 것이 확인된 경우. 연산자·식별자·스킬 추가를 숫자 변경으로 위장할 수 없습니다. `balance.ts`의 XP/보상 함수는 FAST 대상이 아닙니다. `src/assets`, `src/arena/art`, `public`의 정적 이미지, 이미지 import 경로 교체, 문서, 기존 외부 참조를 유지한 CSS 및 실행 요소가 없는 SVG도 포함합니다.
- **STANDARD:** 알려진 전투/파티/UI/애니메이션 모듈의 일반 로직 변경. 새 스킬·타깃·상태 이상·턴 처리는 관련 아레나 단위 테스트와 브라우저/클라우드 테스트를 선택합니다. 저장 관련 식별자·새 import 등 불확실한 경계가 발견되면 FULL로 올립니다.
- **FULL:** `src/cloud`, Supabase/SQL, 아레나 서버·소유권·성장·에너지·합성·상점·재화·이전 규칙, 자동화/워크플로/빌드 설정/의존성/AGENTS, 삭제·이름 변경·실행 파일·심볼릭 링크·미분류 경로/구문·분석 오류. 테스트 자체를 바꾼 경우도 보수적으로 FULL입니다.

파일 경로만으로 FAST를 주지 않습니다. lexical 비교는 후보 소스를 실행하지 않으며 문자열/정규표현식 안의 숫자를 능력치로 인식하지 않습니다. 지원하지 않는 안전 패턴은 FULL이 될 수 있습니다. 정확한 허용 범위를 넓히려면 정책 테스트와 FULL 검증을 먼저 추가합니다.

## 실행하는 검사

| 검사 | FAST | STANDARD | FULL |
|---|---|---|---|
|단위|관련 묶음, 실행 코드 없는 문서는 생략 사유 기록|관련 묶음|전체|
|TypeScript/Vite|`npm run build` 한 번(내부 tsc 포함)|동일|동일|
|자동화 안전성|생략|변경 경계상 필요하면 FULL 상향|전체|
|Deno|숫자/정적 교체에는 생략|아레나 공용 코드라면 실행|고정 lock 전체 검사|
|브라우저|생략|선택한 기능/기본 실행 검사|기존 전체 E2E|
|클라우드|생략|영향받는 UI/공용 전투 검사|기존 전체 클라우드|
|운영 배포 후|SHA/HTML/JS/읽기 전용 모바일 실행, 필요한 서버 상태 확인|동일|동일|

현재 서버 계산/정식 전투 UI에 영향을 주는 아레나 STANDARD는 `tests/arena.spec.ts`와 `cloud-tests/arena.spec.ts`, `fusion.spec.ts`, `fairy-update.spec.ts`를 선택합니다. `Battle.ts`의 순수 애니메이션 제어와 정적 에셋만 STANDARD로 상향 요청한 경우에는 브라우저 범위를 유지하고 불필요한 클라우드/Deno 검사는 생략합니다. 선택한 이미지 파일은 Sharp로 실제 디코딩하여 누락·손상을 검사하고, 기존 아레나 전용 메타데이터/여백 검사도 유지합니다. 전투 이미지만 바꾸는 FAST는 관련 아레나 단위 검사로 이미지 크기/경로/해시/여백을 검증합니다. 문서만 STANDARD로 요청해도 최소 기본 브라우저 실행 검사를 합니다. FULL의 `npm test`는 runner 과부하를 피하도록 최대 2 worker를 사용합니다.

## Codex에서 사용하는 명령

1. 최신 main 기반 작업 브랜치를 만듭니다.
2. 사용자가 `검증 등급: FAST` 등을 지정한 경우 다음으로 **base에 묶인 요청**을 기록하고 커밋에 포함합니다. 미지정은 AUTO이며 요청 파일을 새로 만들 필요가 없습니다.

```sh
npm run validate:request -- --mode FAST --base origin/main
```

3. 작업 트리와 새 파일을 포함해 로컬 판정합니다. `--out`은 저장소 밖에 둡니다.

```sh
npm run validate:plan -- --base origin/main --out /tmp/pocket-validation-plan.json
npm run validate:run -- --plan /tmp/pocket-validation-plan.json --task unit
npm run build
```

4. 계획의 `required.browser`, `required.cloud`가 true인 경우에만 해당 작업을 실행합니다.

```sh
npm run validate:run -- --plan /tmp/pocket-validation-plan.json --task browser
npm run validate:run -- --plan /tmp/pocket-validation-plan.json --task cloud
```

5. 계획에서 Deno가 필요하면 고정 lock 검사를 실행합니다.

```sh
npx --yes deno check --no-config --node-modules-dir=none --lock=supabase/functions/deno.lock --frozen supabase/functions/game/index.ts supabase/functions/treasure/index.ts
```

전체 장시간 전투 시뮬레이션 도구는 숫자 변경마다 자동 실행하지 않습니다. 이미 통과한 동일 코드/환경 검사는 반복하지 않고, 관련 코드 변경·실패·새로운 우려가 생긴 검사만 다시 실행합니다. 실행 환경이 로컬 git 하위 프로세스를 차단하면 판정은 FULL로 닫힙니다. 임의로 FAST라고 기록하지 말고 실제 diff를 읽을 수 있는 실행 환경에서 판정합니다.

## 사용자 요청 전달

`validation.request.json`의 `requested`와 `base`를 사용합니다. AUTO/FAST/STANDARD/FULL만 허용하며, PR base와 일치하지 않는 새 요청은 FULL입니다. 이전 task에서 물려받아 변경하지 않은 파일은 새 요청으로 사용하지 않습니다. 자동 PR은 이 파일을 **검증 등급 요청** 항목으로 표시합니다. 라벨·본문·커밋 메시지로 판정을 낮추지 않습니다. 수동 Run workflow의 `validation_mode`도 상향에만 사용할 수 있습니다.

## CI의 독립 판정과 기존 필수 검사

- `changes` job은 npm 설치 없이 git diff를 읽습니다. 후보 브랜치의 판정 스크립트를 실행하지 않고 신뢰하는 main/base에서 정책과 CLI를 추출합니다.
- 마지막 `release-proof-<SHA>`가 확인된 내부 main 배포부터 현재 head까지 **미배포 변경도 누적**해서 봅니다. 이전 서버 변경을 다음 이미지 커밋으로 숨겨 FAST 배포할 수 없습니다. 이 증명이나 정책이 없거나 API/분석이 실패하면 FULL입니다. 첫 도입도 FULL입니다.
- PR이 현재 main을 포함하는지 검증하는 기존 조건을 유지합니다. 분석/체크아웃이 실패한 job을 성공으로 처리하지 않습니다.
- FAST의 browser/cloud job은 의도적인 **Skipped**로 남고 사유를 기록합니다. 실행하지 않은 테스트를 통과라고 보고하지 않습니다.
- `build` 필수 상태 검사 이름은 그대로입니다. 필요한 job의 실패·취소·미실행·예상 밖 Skipped는 차단합니다. 정책에서 생략하도록 정한 job만 사유 있는 Skipped가 허용됩니다.
- 기존 `validated-head-<PR head>-base-<main SHA>` 이름과 `head.txt`를 유지합니다. `plan.json`에 정책 해시/선택 범위/요청/최종 등급을, 환경 파일에 실제 Node·OS·소스 tree·lockfile·공개 빌드 구성 해시를 기록합니다.
- trusted Codex 출처, strict branch protection, 리뷰, exact-head merge, 승인 환경, 서버/Pages 발행 및 실사이트 검사 코드는 유지합니다.

## 캐시와 재사용의 한계

각 job은 별도 머신이므로 `node_modules`를 다른 job에 있다고 가정하지 않습니다. 필요한 job마다 `npm ci`를 한 번 실행하고 npm 다운로드 캐시를 씁니다. FAST에서는 browser/cloud job 자체가 없어 그 설치도 하지 않습니다. Playwright 캐시는 실제 Playwright 버전·OS·아키텍처로 구분해 관계없는 npm 변경의 캐시 무효화를 줄입니다. OS 의존성 설치와 실행 probe는 유지하고, 손상된 Chromium 캐시는 한 번만 재설치한 후 다시 검증합니다. 재실패는 그대로 실패입니다.

PR 검사 결과를 main 검사 전체 대신 사용하는 자동 재사용은 이번에 활성화하지 않습니다. head/base 검증 아티팩트와 배포 승인 증명은 유지하지만, PR/main의 빌드 환경(특히 cloud 활성화)이 다를 수 있고 실제 동일 tree/lock/environment를 보장하는 재사용 증명이 아직 없기 때문입니다. main에서도 판정된 등급의 검사를 실행하고 새 사이트를 반드시 빌드합니다. 향후 재사용을 추가하려면 별도 FULL 검증이 필요합니다.

[클릭 배포 안내](VALIDATION_DEPLOY_GUIDE.md).

## FULL 테스트의 불필요한 프레임 반복 줄이기

경과 시간/최종 저장 상태만 검증하는 12~31초 구간은 `clock.fastForward`로 이동한 뒤 필요한 짧은 실제 프레임을 처리합니다. 30초치 소프트웨어 GPU 프레임을 재생하는 것을 검증 조건으로 쓰지 않습니다. 입력·연속 타격·애니메이션을 검증하는 구간의 짧은 `runFor`는 유지합니다. 보상 서버의 분할 `pending` 응답은 제한된 재시도 안에서 최종 지급을 확인하며, 중복 지급·데이터 보존 assertion은 그대로입니다. 시계 fixture는 설치 시각과 정지 시각 사이에 여유를 두되 관찰하는 테스트 시각은 정확히 유지합니다.

## 수련탑 이후 FULL의 기능별 실행 범위

이번 사용자 요구사항에 따라 **검증 강도와 브라우저 실행 범위**를 분리한다. 전체 단위·자동화·정책·Deno·빌드, 필수 job 성공 확인, trusted base/head, validated-head, 서버 승인 및 운영 스모크를 유지한다. `AGENTS.md`는 변경하지 않는다.

신뢰된 main/base의 `impactScope`는 아레나/수련탑 내부만 변경되면 아레나 관련 브라우저·클라우드 테스트를 모두 선택한다. match3 또는 사천성 내부만 변경되면 해당 기능을 선택한다. 공통 저장/인증/디스패처, 워크플로/정책/도구/의존성, 알 수 없는 파일·동적 import, 새로운 기능 외부 의존성, 전역 CSS, 혼합 기능, 삭제/심볼릭 링크, 분석 실패는 전체 검사로 복귀한다. 선택자와 이유는 base/head/정책 해시와 함께 남으며 FULL에서도 해시 검증을 요구한다. FULL의 필수 browser/cloud job은 생략하거나 성공으로 가장하지 않는다.

**정책을 바꾸는 첫 PR 자체는 기존 trusted main/base가 전체 CI를 요구한다. 이를 후보 브랜치 정책으로 우회하지 않는다.** 병합 후 수련탑만 바꾸는 후속 PR부터 기능 선택이 자동 적용된다. 이번 로컬 개발은 사용자 지시대로 수련탑·아레나 및 공통 디스패처의 무결성을 집중 검사하며 무관한 미니게임 E2E를 반복하지 않는다. 원격 CI는 독립적으로 기존 필수 검사를 유지한다.
