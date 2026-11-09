> 후속 업데이트: 실제 게임 적용 내용과 최신 배포 절차는 [MODERN_EFFECTS_DEPLOY.md](MODERN_EFFECTS_DEPLOY.md)를 참고하세요. 아래 내용은 독립 시제품 개발 당시의 검토 기록입니다.

# 실제 게임 적용 시 검토할 파일 — 이번에는 수정하지 않음

권장 도입은 **기존 DOM/SVG 입력 보드를 유지하고 Pixi를 고품질 이펙트 오버레이로 사용**하는 방식입니다. lab는 비교를 위해 새 보석까지 Sprite로 그렸지만, 실제 게임에 전체 Sprite 보드를 바로 교체하면 접근성/클릭 영역/애니메이션 수명까지 다시 검증해야 합니다. 현재 소프트웨어 WebGL 결과가 더 느려 운영 기본 전환은 보류합니다.

|파일|향후 필요한 표시 계층 변경|
|---|---|
|`src/match3/Effects.tsx`|현재 props(frame/paused/reduced/intensity)를 유지하는 Canvas/Pixi 어댑터. GPU 미지원/낮은 강도에서는 기존 Painter 사용|
|새 `src/match3/PixiEffects.ts`|lab `ModernPainter`에서 **이펙트 전용** 부분을 분리. 보석 보드 재배치/실험 점수 생성 부분은 옮기지 않음|
|`src/match3/Panel.tsx`|선택 렌더러 마운트·언마운트/포인터 잔상 연결·점수 표시 GSAP. 기존 드래그 판정/교환 요청은 유지|
|`src/match3/GemArt.tsx`|새 SVG7장 채택 시 보석 그림만 교체. Gem ID/색상/특수 종류/접근성 표시는 유지|
|`src/match3/Hud.tsx`|확정된 combo/score 값으로 표시 타임라인만 구동. 오래된 타임라인 취소 및 일시정지/감소 모션 전달|
|`src/match3/styles.css`|오버레이 레이어/포인터 통과/글자 배치/광택과 접근성 처리. 게임 전역 CSS와 분리|
|`src/match3/records.ts` (옵션)|렌더러 선택을 저장할 경우에만 새 선택 필드의 기본값Canvas·이전 저장 호환 처리|
|`public/...` 및 라이선스 고지|채택한 SVG/자체 텍스처 생성 코드와 Pixi/GSAP 고지의 경로를 운영 진입점에 맞춰 배치|

`engine.ts`, `rules.ts`, `clock.ts`, `replay.ts`, `rewardClient.ts`, `rewardServer.ts`, 사천성, Supabase 함수/SQL 및 코인 명령은 표시 교체를 위해 바꿀 필요가 없습니다. 프레임의 제거 위치/특수 from/targets/확정 점수만 읽고, 이펙트 완료 이벤트로 점수나 코인을 추가하지 않습니다. 긴 연쇄의 표시 프레임 병합에는 실제 제거 위치와 광선 표적이 맞는지 별도 검증이 필요합니다.

실기기 확인 후에도 Canvas 기본 + 선택적 GPU 고품질을 권합니다. 최소 검증은 각 특수 범위, 중복 점수 없음, 원래 클릭/터치 영역, 백그라운드/팝업/종료 시 정리, 기존 서버 보상 재생 일치, 저사양/감소 모션 폴백입니다. 이번 브랜치는 이 운영 적용을 수행하지 않았습니다.
