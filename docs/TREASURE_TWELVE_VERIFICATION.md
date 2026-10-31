# 검증 결과

기준 main: db85463 (PR #21 병합). 기능 브랜치: feat/treasure-twelve-levels.

## 실행 결과

- `npm test -- src/match3 src/care/bulk.test.ts`: **190개 통과**, 약8초. 12단계 색상/경계/최소2교환, x16·소수시간·시계 분리, headless/visual 일치, 이전4/5 기록 동일성, compact 기록, 보상 지급/변조/동시재시도/롤백/다른 월드 필드 보존, 일괄 돌봄 포함.
- `tests/match3-twelve.spec.ts`, `tests/match3-v4.spec.ts`, `tests/fast-challenge.spec.ts`: PC/모바일 **10개 고유 검사 최종 통과**. Lv12 표시/시계/일시정지/최고단계·이펙트 저장, 대표 대량 폭발·상한/종료 정리, reduced-motion, 마우스·실제 Chromium 터치 입력/취소 포함. Lv12 검사와 대표 측정은 마지막1worker 실행에서 확인.
- `npm run test:cloud -- cloud-tests/treasure-v4.spec.ts cloud-tests/bulk-care.spec.ts`: **4개 통과**, 약52초. 응답 유실 후 새로고침·재시도 1회 지급, 다른 기기 코인 반영, 미니게임 종료 후 월드 복귀, 일괄 돌봄 회귀.
- Deno2.9.6 `check --no-config --node-modules-dir=none --lock=supabase/functions/deno.lock --frozen` game/treasure: 통과.
- `npm run build`: TypeScript/프로덕션 빌드/영단어 정답 묶음 제외 검사 통과. 기존 메인 청크500KB 경고는 남아 있으며 빌드 오류가 아닙니다.
- `git diff --check`: 통과. 사천성·영단어·월드 동기화·돌봄 제품 파일 및 기존 Pages 워크플로 변경 없음.

전체 관련 없는 E2E나 장시간 soak는 반복하지 않았습니다. 운영 Supabase 인증정보를 사용한 실서비스 테스트/SQL 실행/배포는 수행하지 않았습니다. 클라우드 브라우저 검사는 네트워크 fixture, 정산 단위 검사는 실제 SQL을 실행하는 PGlite(PostgreSQL 호환 엔진) 기반입니다.

## 성능 실측

Chromium 단일 worker, 개발 서버, stage30 대표10연쇄. 측정 구간에서 스크린샷 제외. 측정은 1개 표본/환경이며 서로 다른 물리 기기의 비교가 아닙니다.

| 환경 | 측정 길이 | RAF FPS | 프레임 p95 | 50ms 초과 Long Task |
|---|---:|---:|---:|---:|
|PC 1440×1100|2.17초|54.96|33.3ms|0|
|iPhone13 터치 에뮬레이션|2.10초|58.61|16.8ms|0|

PC 60FPS 목표에 근접했지만 모든 상황에서60FPS를 보장하지 않습니다. 실제 휴대폰·저사양 장시간 플레이는 별도 확인이 필요합니다. 느려지면 장식 입자 자동 감축 또는 부드럽게 설정을 사용합니다. [원시 수치](TREASURE_TWELVE_METRICS.json).

Canvas1장, 재사용 입자160개/충격파32개 풀, 광선96개 상한, DPR최대2. 강도에 따라100/60/30%, 터치기기 기본 상한96. 렌더 루프는 점수를 변경하거나 서버 요청하지 않습니다. 파티클용 React 노드를 생성하지 않고 기존 보드/시계 구독 분리를 유지합니다. 새 패키지/외부 이미지/외부 CDN 0개.

## 화면 및 변경 파일

[PC 화면](screenshots/treasure-twelve-desktop.png) · [모바일 화면](screenshots/treasure-twelve-mobile.png)

- 규칙: `config.ts`, `rules.ts`, `clock.ts`, `engine.ts`.
- 화면: `Effects.tsx`, `GemArt.tsx`, `Hud.tsx`, `ModeSelect.tsx`, `Panel.tsx`, `styles.css`.
- 보상/기록: `controller.ts`, `records.ts`, `replay.ts`, `rewardClient.ts`, `rewardServer.ts`.
- SQL: `202610310002_treasure_rules6.sql` (시작 함수만, 기존 데이터 DML 없음).
- 신규/회귀 테스트: `twelve.test.ts`, `effects.test.ts`, `rewardServer.test.ts`, `clock.test.ts`, `fast.test.ts`, `match3-twelve.spec.ts`, `match3-fixtures.ts`, `match3-v4-log.ts`, 과거main에서 생성한 `match3-v5-golden.json`, 테스트용 `cloud-tests/fixture.ts`.

기존 코인 공식과 게임 점수 배율, 특수 제거/생성 조건, 사천성/영단어, 육성 데이터 및 저장키를 유지합니다. 기존 지급행은 삭제하지 않으며 재정산은 같은 영수증을 반환합니다. 규칙4/5 미지급 판과 새 규칙6 판을 구분해 검증합니다.
