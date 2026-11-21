# 별빛 아레나 통합 검증과 배포 상태

2026-11-21 작업. 배포 대상 브랜치는 `codex/starlight-arena-integration`이며, 코드 검토·검사·병합·배포는 기존 GitHub 자동화로 진행합니다.

## 구현

- 본 게임 메뉴에서 별빛 아레나 진입 / 기존 GameShell을 통한 거실 동결·복귀.
- 보유 친구 5종과 실제 친구별 레벨 읽기. 별도 연습 레벨은 실제 저장에 반영하지 않음.
- 숲 일반전→보스전, COST 편성, 고유 스킬·컷인·결과창.
- 전투 결과창에서도 거실 복귀 버튼에 접근 가능. 종료 시 Pixi ticker와 이미지 리소스 정리.
- 지연 로딩·CSS 범위 격리. 기존 원본 아트와 사용자 사진을 변경하지 않음.
- 연습 전투에 재화/XP/아이템 지급 없음. 새 서버 명령·스키마·보상 규칙·자동화 정책 변경 없음.

## 검증 기록

- 전체 단위 테스트: 47개 파일, 569개 테스트 통과.
- 360×800 / 375×812 / 390×844 / 412×915 모바일 터치 에뮬레이션: 진입·공격·복귀·데이터/거실 스타일 보존 통과.
- COST/해금/컷인/공격 도중 종료/Escape/기존 미니게임 진입 검사 통과.
- 모의 클라우드: 로그인→아레나→거실→재접속, 이름·사진·레벨·XP·코인·아이템 보존, 추가 변경 명령 없음 확인.
- 기존 보물 3매치의 실제 입장·교환·복귀·데이터 보존 회귀 검사 통과.
- 전체 일반전→보스전→승리→거실 복귀 검사 통과.
- 클라우드 강제 로그인 정책을 유지한 정적 배포 빌드에서도 모의 인증→전투→복귀 검사 통과. 운영 URL/인증정보 대신 모의 서버와 공개 테스트 키로 검사했으며 이 테스트 설정은 소스에 저장하지 않음.
- Vite 배포 빌드와 단어 정답 미포함/효과 격리 검사 통과. 첫 거실의 정적 import에 PixiJS/GSAP가 포함되지 않음.
- 모바일 검증은 Chromium 에뮬레이션이며 실제 Android/iOS/Safari 측정과 구분.

검사 초기에 두 Playwright 실행이 같은 결과 폴더를 사용해 기록 저장이 충돌했으며, 별도 출력 폴더에서 재검사했습니다. 전체 전투 시나리오는 승리 창의 복귀 버튼이 가려지는 문제를 발견하여 레이어를 수정했습니다. 단순히 검사 조건을 제거하지 않았습니다.

## 원격 배포 확인의 제약

이 실행 환경에서 `api.github.com` 요청은 Forbidden으로 거부되었고 공개 운영 사이트 연결도 프록시 CONNECT 403으로 차단되었습니다. Git 전송과 GitHub API 권한은 별개입니다. 따라서 Git push/PR 확인, main 병합, GitHub Actions 최종 성공, 운영 URL SHA/로그인 화면 검증을 같은 것으로 취급하지 않습니다.

이 문서는 구현·로컬 검증을 기록하며 운영 완료를 선언하지 않습니다. 원격의 실제 최신 상태는 아래 링크에서 확인해야 합니다.

- [이번 브랜치 PR](https://github.com/kwonyoung1/pocket-friends/pulls?q=is%3Apr+head%3Acodex%2Fstarlight-arena-integration)
- [자동 PR 실행](https://github.com/kwonyoung1/pocket-friends/actions/workflows/auto-pr.yml)
- [테스트 및 배포 실행](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml)
- [운영 버전](https://kwonyoung1.github.io/pocket-friends/version.json)
- [운영 게임](https://kwonyoung1.github.io/pocket-friends/)

**순서대로 누르는 설명:** [배포·플레이 상세 클릭 안내서](STARLIGHT_ARENA_DEPLOY_GUIDE.md).

Edge Function 소스가 바뀌지 않으므로 이 변경을 위해 Supabase 함수를 재배포하거나 토큰을 새로 발급할 필요는 없습니다. CI의 모든 필수 검사와 기존 리뷰/승인 정책을 그대로 유지합니다.
