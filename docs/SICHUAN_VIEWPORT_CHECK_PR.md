# test: stabilize viewport snapshots for the largest Sichuan board

최대12×10 보드의 화면 회전 검사에서 패 개수 확인과 실제 측정 사이에 DOM이 바뀔 수 있으므로, 글꼴 준비 후 연결된 보드와120개 패가 있는지 한 번의 DOM 읽기에서 확인한다. 첫 패가 없으면 getComputedStyle을 호출하지 않고 준비 조건과 전체 레이아웃 조건을 다시 검사한다. 가로 넘침0, touch-action:none, 최소14px 기준은 그대로 유지한다. 게임 제품 코드·서버·저장 데이터 변경 없음.

CI 캡처의 실패 위치는 DOM evaluate 단계이며 기존 검사는 로컬5회에서는 재현되지 않았다. 보강 후 desktop/mobile 각5회 총10회 통과. npm run build 및 기존 게임 엔진 격리 검사 통과. 전체 무관한 E2E/장시간 soak는 재실행하지 않았음.

이전 lab PR#24는 이미 병합되어 새 수정 PR이 필요하다. 병합 후 기존 Pages main 자동 배포의 build/deploy 성공을 확인한다. 새 SQL이나 서버 배포는 필요 없다.
