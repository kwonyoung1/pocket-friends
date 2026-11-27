# 별빛 아레나 VFX 기술 검토 — 2026-11-27

## 확인한 자료와 확인하지 못한 자료

공식 사이트에 실제 접속을 시도했으나 이 실행 환경의 프록시가 아래 모든 사이트에 CONNECT 403을 반환했다. 영상·게임 플레이를 직접 분석했다고 주장하지 않는다. 게임별 시작/발동/명중/카메라/종료 시간을 실측하거나 상업용 그래픽을 추출하지 않았다.

| 요청된 참고 게임 | 시도한 공식 주소 | 결과 |
|---|---|---|
|에픽세븐|https://epic7.onstove.com/en|403, 영상 미확인|
|서머너즈 워|https://summonerswar.com/en/skyarena|403, 영상 미확인|
|옥토패스 트래블러 II|https://octopathtraveler2.square-enix-games.com/en-us/|403, 영상 미확인|
|붕괴: 스타레일|https://hsr.hoyoverse.com/en-us/|403, 영상 미확인|
|브라운더스트2|https://www.browndust2.com/en-us/|403, 영상 미확인|
|파이널 판타지|https://na.finalfantasy.com/|403, 영상 미확인|

요청서가 제시한 컷인·빠른 접근·타격 홀드·원소별 실루엣·도트/배경 깊이·짧은 잔여 효과를 설계 입력으로 사용했다. 이는 직접 확인한 각 게임의 구현이나 연출 길이에 대한 조사 결과와 구분한다. 공식 사이트와 기술 문서 열람이 가능한 환경에서 영상의 타이밍/접근성을 추가 비교할 여지가 남아 있다.

## 실제 확인한 외부 기술

npm 공식 배포 메타데이터와 현재 설치된 소스/타입/README/라이선스를 읽었다. 라이브 문서 사이트는 대부분403이라 미확인으로 기록한다. 아래 배포 압축 해제 크기는 브라우저 번들 크기가 아니다.

|기술|실제 확인|라이선스·사용 조건|판단·실제 적용|
|---|---|---|---|
|PixiJS|설치8.22.0, npm 최신8.23.0; `ParticleContainer.d.ts`, `Particle.d.ts`, 소스|MIT, 저작권 고지 유지; 무료·상업 사용 가능|설치 버전 유지. v8 네이티브 ParticleContainer/Particle를 새로 전투에 통합. 공통 texture source, 동적 position/rotation/vertex/color/UV, GPU batching 활용|
|@pixi/particle-emitter|npm5.0.10 메타데이터 peerDependencies|MIT. `@pixi/* >=6.0.4 <8.0.0` 필요|현재8.22와 호환되지 않아 설치하지 않음. 구버전 Pixi 중복 설치 대신 위 v8 기본 파티클 사용|
|GSAP|설치3.15.1 소스·README·npm metadata|Standard no-charge license. 설치 README는 무료 상업 사용을 명시. MIT라고 부르지 않음|기존 의존성 재사용. 전투에는 새 paused timeline을 통합해 Pixi 게임 시계로만 totalTime을 진행. 숨김/2배속/종료에 맞춰 전투 소유 timeline만 정리|
|Phaser|npm 최신4.2.1, MIT, 배포 압축 해제 약112.5MB|무료·상업 사용 가능, 라이선스 고지 필요|실제 독립 기능 추출·모바일 런타임 성능은 미실측. Pixi 렌더러·입력·카메라와 중복되어 도입하지 않음. 이 수치를 런타임 번들 크기로 사용하지 않음|
|Rive canvas runtime|npm @rive-app/canvas2.55.1, MIT, 배포 압축 해제 약6.64MB|런타임 메타데이터만 확인. 에디터 무료 내보내기·플랜 조건은 공식 문서403으로 미확인|제작된 .riv도 없고 편집기 조건을 확인하지 못했으므로 도입하지 않음. 유료 에셋·구독·스플래시 없음|

메타데이터: [emitter](https://registry.npmjs.org/@pixi%2Fparticle-emitter/latest), [Pixi](https://registry.npmjs.org/pixi.js/latest), [GSAP](https://registry.npmjs.org/gsap/latest), [Phaser](https://registry.npmjs.org/phaser/latest), [Rive](https://registry.npmjs.org/@rive-app%2Fcanvas/latest).

모바일 호환은 이 프로젝트의 WebGL Chromium 모바일 에뮬레이션으로 확인한다. iOS Safari/Android 실기기·각 후보 엔진의 성능은 별도로 측정하지 않았다. 다른 엔진을 설치했다거나 무료 에셋을 가져왔다고 보고하지 않는다. 현재 의존성 파일은 변경하지 않았다.

## 독창적 에셋과 연출 설계

- 원본 캐릭터 카드/도트/배경은 그대로 재사용한다. 다른 게임 영상·이미지·코드는 복제하지 않았다.
- 불꽃·얼음·별·연무·잎·돌·물방울·깃털·검기·달·꽃잎·부드러운 발광, 12개 모티프를 Canvas2D로 직접 그려 한 장의384×32 atlas로 만든다. 약48KiB RGBA 원본 기준이며 GPU 부가 메모리는 별도다. 외부 다운로드 없이 Texture를 한 번 만들고 풀링된 Particle에 공유한다.
- 외부 에셋 파일이나 신규 PNG 원화를 만든 것은 아니다. 곡선 검기/날개/결정/연금술/성운 등 주요 실루엣은 Pixi Graphics, 이동 입자는 atlas+ParticleContainer, 타이밍은 GSAP를 결합한다.
- 공통 순서는 준비 → 투사체/접근 → 실제 타격별 명중 → 잔여 효과 → 원위치/카메라 복귀다. 연출 변형은 스킬 style·속성·고유ID·실제 희귀도·성급을 사용한다.
- 일반 공격은 짧게, 다단/광역/필살기는 타격 수만큼 확장한다. 시간은 게임 시계로 진행하며2배속이 같은 결과를 더 빨리 재생한다. 프레임 지연·캡처 일시정지는 실제 벽시계 길이에 영향을 준다.

유지보수 상태는 현재 npm 배포 버전과 설치 소스까지 확인했다. GitHub 이슈·커밋 활동과 후보별 실기기 성능은 직접 확인하지 못했으므로 활동이 활발하다거나 모바일 성능이 검증됐다고 주장하지 않는다. Pixi/GSAP는 기존 프로젝트에 있어 통합 부담이 작고, Phaser는 렌더러 중복, Rive는 추가 제작 자산과 런타임이 필요하다.
