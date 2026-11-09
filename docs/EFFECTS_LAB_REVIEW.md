# 이펙트 엔진 검토와 독립 비교 화면

2026-11-09 기준, main `62bc318`에서 분기. **선정한 고품질 시제품은 PixiJS8.22.0 + GSAP3.15.1**입니다. 기존 게임에 적용하지 않고 `/effects-lab/`라는 별도 HTML 진입점으로 만들었습니다. 현재 소프트웨어 WebGL 실측에서는 Canvas가 더 빨라 **운영 기본 렌더러 전환은 보류**하고, 이 페이지에서 실제 GPU 기기를 비교한 뒤 고품질 옵션으로 도입하는 방식을 권합니다.

## 현재 Canvas 분석

실제 `src/match3/Effects.tsx`의 `Painter`를 수정 없이 테스트 화면의 BEFORE에 사용합니다.

- Canvas1장, 입자160개와 링32개를 미리 만들어 재사용합니다. 강도 보통60%/낮음30%, 터치 기본96개, DPR최대2입니다.
- 보드의 `Frame`에서 removed/effects/from/targets를 읽어 색 파편·별·충격파·광선을 표시합니다. 광선 상한96개, 링230ms, 파편260~308ms입니다.
- 원래부터 10/20개 대량 제거와 황금/무지개 콤보 색, 흰 중심 광선을 지원합니다.
- Canvas 경로/삼각형/별을 CPU에서 매 프레임 그립니다. 입자 발급은 풀 검색으로 처리합니다. 느린 프레임이 누적되면 상한32로 줄입니다.
- `ResizeObserver`, RAF 취소, 일시정지와 reduced-motion을 지원합니다. 게임 점수/보상 계산과 분리되어 재사용하기 적합합니다.
- BEFORE의 보석은 기존 `GemSprites/GemArt`도 그대로 사용합니다. 비교용 배경/배치는 별도이며 실제 게임 한 판이나 동일 게임 성능의 재현은 아닙니다. 하단 점수는 두 화면 모두 실험용입니다.

## 후보 검토

|후보|확인한 버전·라이선스|장점|이번 결정|
|---|---|---|---|
|Phaser4|npm latest4.2.1 / MIT|4.x 새 WebGL 렌더러, 내장 Glow/Bloom/ImageLight 등 게임 연출 도구와 씬 관리|기존 React 게임을 유지하면서 이펙트만 비교할 때는 씬/입력/게임 루프까지 도입할 이유가 적어 미설치. 렌더러 교체와 전체 게임 엔진 전환을 분리함|
|PixiJS|8.22.0 / MIT|렌더링 전용 WebGL/WebGPU, 배치 Sprite·가산 혼합·텍스처 풀, React와 별도 수명 관리 가능|선정. WebGL 경로를 고정하고 별도 Canvas에 초기화/정리. 원래 게임에 import하지 않음|
|GSAP|3.15.1 / Standard **no-charge** license|Sprite/DOM 숫자·탄성·연속 타임라인에 적합, React 상태와 분리 가능|선정. 코어만 로컬 번들, 점수 표시·탄성·반응 애니메이션만 처리. MIT가 아님|
|Kenney Particle Pack|공식 다운로드/개별 원본 라이선스 확인 실패|통상 입자 스프라이트 제작 시간을 줄일 수 있음|공식 도메인 접근이 재시도 후에도 proxy403. 개별 원본 파일과 라이선스를 대조하지 못했으므로 팩을 포함하지 않음. 출처 불명 미러도 사용하지 않음|

Phaser4가 아직 미출시라고 가정하지 않았습니다. 실제 npm4.2.1 메타데이터와 공식4.x README/MIT 원문을 확인했습니다. Phaser/다른 미채택 엔진의 실행 성능을 측정했다고 주장하지 않습니다. 실측 대상은 현재 Canvas와 선정한 PixiJS+GSAP 두 화면입니다.

GSAP는 공식 배포 README가 모든 도구의 상업적 이용까지 무료라고 명시하고 패키지 메타데이터가 표준 무상 라이선스를 연결합니다. 정확한 표준 라이선스 웹페이지는 환경에서403으로 열리지 않았다는 사실도 고지합니다. MIT라고 바꾸거나 유료 API를 사용하지 않았습니다. 공식 README와 고지, Pixi 및 새 전이 의존성 라이선스를 `public/effects-lab/licenses/`에 포함하고 lab JS에도 고지를 넣습니다.

확인 출처:

- [Phaser4 공식 README](https://github.com/phaserjs/phaser/blob/master/README.md), [MIT](https://github.com/phaserjs/phaser/blob/master/LICENSE.md), [npm4.2.1](https://www.npmjs.com/package/phaser/v/4.2.1)
- [PixiJS npm8.22.0](https://www.npmjs.com/package/pixi.js/v/8.22.0), [공식 MIT](https://github.com/pixijs/pixijs/blob/dev/LICENSE)
- [GSAP 공식 README](https://github.com/greensock/GSAP/blob/master/README.md), [표준 라이선스](https://gsap.com/standard-license), [npm3.15.1](https://www.npmjs.com/package/gsap/v/3.15.1)
- [Kenney Particle Pack 공식 페이지](https://kenney.nl/assets/particle-pack) — 이 실행 환경에서 접근 차단

## 새 화면에서 구현한 것

1. 원래 형태가 서로 다른6색 보석과 무지개 보석을 새 SVG7장으로 제작: 다면체, 두께, 내부 굴절면, 프리즘 반사, 접지 그림자. 입체감을 그린2D 자산이며 실시간3D 모델은 아닙니다.
2. 마우스/실제 터치 포인터 직접 추종, 작은 기울기, GPU 가산 빛 잔상, 놓을 때 GSAP 탄성 복귀. pointercancel/포커스 이탈/화면 숨김 처리.
3. 보석 팽창·회전 파편·색 스파크·발광·외곽 링을 풀링한 Sprite로 구현.
4. **16개** 동시 제거의 넓은 다중 충격파와 약한 보드 탄성.
5. 무지개 보석에서 선택한 색상의 **전체 위치**로 광선 연결/제거. 색상 선택기로6종을 확인할 수 있음.
6. **12콤보/128,000 실험 점수**의 대형 타이포그래피, 탄성·카운트업·에너지 효과. 새 연출 시 이전 GSAP 타임라인을 정리해 겹치지 않음.

페이지에서 단일/대형/무지개/콤보를 반복하고 나란히/각각 보기를 선택합니다. 기본 초기 상한은 PC160/터치96으로 맞췄으며, 새 엔진만320/터치192로 올리는 고품질 옵션도 있습니다. 새 엔진은 링24개/파편 최대320개를 사용하고 느린 프레임 누적 시64 이하로 줄입니다. 기본 상한이 같아도 실제 파편 개수/링/아트/알파 혼합 작업량은 같지 않습니다. reduced-motion은 새 입자·탄성을 끄고 오래된 Canvas에도 같은 접근성 설정을 전달합니다.

## 에셋/라이선스/서버 격리

- 외부 이미지 다운로드를 가장하지 않았습니다. SVG7장은 이번 실험용으로 직접 제작한 원본이며 CC0로 명시했습니다. 별·파편·발광·링 텍스처4종도 시작 시 자체 Canvas 코드로 한 번 생성합니다.
- Kenney 이미지나 외부 Lottie/유료 에셋은 포함하지 않았습니다. 로컬 SVG와 라이브러리를 빌드에 포함해 런타임 CDN/API 호출이 없습니다.
- 별도 `effects-lab/index.html` + `src/effects-lab/main.tsx`를 Vite 다중 진입점에 추가했습니다. 기존 index.html/App/main/게임 소스는 변경하지 않았습니다.
- 기존 보물3매치, 사천성, Supabase, 코인/저장 코드 변경0건. 게임 진입점에서는 PixiJS/GSAP/lab 코드를 다운로드하지 않는지 **빌드 그래프 검사**가 실패 조건으로 확인합니다.
- 사이트 전체 배포 파일은 lab만큼 늘지만 기존 게임 JS 경로에는 새 엔진이 들어오지 않습니다. lab 전용 도달 가능 JS는 동적 백엔드까지 합산 gzip약211KB(약206KiB). 공통 React/기존 코드 제외이며 초기 네트워크 전송량과 다릅니다. [정확한 빌드 수치](EFFECTS_LAB_BUNDLE.json).

[실측·검증](EFFECTS_LAB_RESULTS.md) · [사용/배포 버튼 안내](EFFECTS_LAB_DEPLOY.md) · [향후 적용 파일](EFFECTS_LAB_INTEGRATION.md)
