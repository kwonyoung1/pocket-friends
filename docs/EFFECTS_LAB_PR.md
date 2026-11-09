# feat: add isolated Canvas vs PixiJS effects laboratory

별도 `/effects-lab/` Vite HTML 진입점에서 현재 Canvas Painter/GemArt와 PixiJS8.22.0+GSAP3.15.1 시제품을 비교한다. 기존 게임/보상/서버/저장 소스를 수정하지 않는다. 새 SVG7장, 잔상/탄성, 파편/가산 발광/링,16개 제거, 선택 색상 전체 무지개,12콤보 표시를 구현한다.

한 엔진씩 보이게2초 장면 예열+3/6/10초 순차 측정, RAF FPS/p95/긴 작업/입자수/실제 상한과 JSON 내보내기를 제공한다. 실제 소프트웨어 WebGL3회 실측에서는 기존 Canvas가 더 빨라 운영 기본 교체는 보류하며, 고품질 선택지의 실기기 검증을 권고한다. Phaser4.2.1/MIT도 검토했으나 전체 게임 엔진은 도입하지 않는다. Kenney 원본/라이선스는 공식 도메인403으로 확인하지 못해 미포함, 자체 원본은CC0로 명시한다. GSAP는MIT가 아닌 표준 무상 라이선스로 고지/공식 README를 포함한다.

빌드 그래프 감사로 기존 게임 진입점의 Pixi/GSAP/lab 포함을 거절한다. 기존 Pages 워크플로 유지, lab 전용 검증 워크플로 추가. 새 SQL/서버 배포 불필요, 병합 후 기존 Pages 자동 배포로 별도 URL 제공. 전체511단위/프로덕션 PC·모바일6브라우저 검사와 빌드·격리 검사 통과. 자세한 실측/향후 적용 파일 목록: docs/EFFECTS_LAB_REVIEW.md, docs/EFFECTS_LAB_RESULTS.md, docs/EFFECTS_LAB_INTEGRATION.md.
