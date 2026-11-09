# 비교 화면 열기와 배포

이번 브랜치는 **테스트 페이지 추가**입니다. 기존 게임으로 새 엔진을 전환하지 않습니다. **SQL 실행·Supabase 서버 배포는 필요 없습니다.**

## 로컬 실행

프로젝트에서 `npm ci` 후 `npm run dev`를 실행하고 터미널에 나온 주소 뒤에 `/effects-lab/`를 붙입니다. 예: `http://localhost:5173/effects-lab/`.

1. 대형 폭발/무지개/12콤보 버튼으로 두 화면을 비교합니다.
2. 보석을 누른 채 끌었다 놓아 잔상과 탄성을 비교합니다.
3. 모바일에서는 두 화면이 위아래로 표시됩니다. **비교 화면 → 새 PixiJS만**을 선택하면 조작하기 편합니다.
4. **순차 성능 비교 시작**을 누르면 실제 보드로 스크롤하며 각 엔진을2초 예열 후 설정한3/6/10초씩 측정합니다. 화면을 켜둡니다. 하단 고정 버튼으로 취소할 수 있습니다.
5. **결과 JSON 저장**으로 현재 기기의 측정값을 받습니다. 창을 가리면 측정을 취소합니다. 역순 측정은 `/effects-lab/?order=after-first`에서 할 수 있습니다.
6. 움직임 줄이기는 자동 시스템 설정 또는 체크박스를 사용합니다. WebGL을 쓸 수 없으면 이유를 표시하고 기존 Canvas를 유지하며 새 엔진 성능 수치를 만들지 않습니다.

## GitHub Pages에 별도 주소로 올리기

1. [PR 생성 화면 열기](https://github.com/kwonyoung1/pocket-friends/compare/main...feat/effects-comparison-lab?expand=1).
2. 필요하면 **Sign in**으로 로그인합니다. **base: main**, **compare: feat/effects-comparison-lab**을 확인합니다.
3. **Create pull request** → 제목/본문 입력 → **Create pull request**. [준비한 PR 설명](EFFECTS_LAB_PR.md)을 사용할 수 있습니다.
4. 기존 **Test and deploy Pocket Friends**와 새 **Verify isolated effects lab** 검사가 초록색인지 기다립니다. 새 검사는 테스트 페이지 전용이며 별도 배포 버튼이 아닙니다.
5. PR **Conversation** 아래 **Merge pull request → Confirm merge**를 누릅니다.
6. [웹사이트 배포 확인](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml)에서 최신 **main / Merge pull request ...** 실행을 누릅니다. **build·deploy**가 모두 초록색이면 완료입니다.
7. 병합으로 자동 실행되므로 **Run workflow를 추가로 누르지 않습니다.** 자동 실행이 아예 없을 때만 **Run workflow → main → Run workflow**를 한 번 실행합니다.
8. 배포 후 [이펙트 비교 화면 열기](https://kwonyoung1.github.io/pocket-friends/effects-lab/). 기존 게임 주소는 그대로입니다.

새 페이지 주소는 병합/웹사이트 배포 전에는404일 수 있습니다. `Deploy game update (manual)`과 `Deploy cloud backend (manual)`은 이번 lab를 위해 실행하지 않습니다.

## 검증 명령

- `npm test`: 기존 단위 검사와 lab 검사.
- `npm run build`: 두 HTML 빌드 + 정답 데이터 제외 + 게임 번들에 lab/새 엔진 혼입 금지 검사.
- `npm run test:effects`: PC/터치 화면·연출·격리·수명·순차 측정/취소/JSON 검사.
- `npm run preview -- --port 4178`: 빌드 결과 실행.
- 위 preview가 실행 중일 때 `npm run measure:effects`: 소프트웨어 WebGL로6초×두 엔진×3회×PC/모바일 반복 측정, `docs/EFFECTS_LAB_MEASUREMENTS.json` 저장. 실제 GPU 성능은 페이지를 일반 브라우저로 열어 측정하세요.
