탐험 지역이 기존 Lv.15 정원 이후로 확장되지 않고, 보석을 배치하거나 가구를 겹쳐 꾸밀 수 없었습니다. Lv.20/25/30 상위 지역과 전용 보물 9종·장비 20종을 추가하고, 3슬롯 장비 효과를 탐험 출발 시 확정합니다. 보석 배치와 네 가지 레이어 조정, 겹친 아이템 목록 선택을 지원합니다.

기존 캐릭터·사진·코인·가구 좌표·진행 중인 탐험 결과는 보존합니다. 장비는 개체 ID와 소유/슬롯을 서버에서 검증하고, 기존 Postgres CAS·영수증으로 동시 착용과 보석 중복 배치/회수를 막습니다. SQL 추가 없이 기존 프로젝트를 사용하며 새 클라이언트 적용 후 이전 화면의 쓰기를 거절합니다.

배포는 기능 브랜치의 Deploy cloud backend (manual) 성공 후 병합, 기존 Pages 자동 배포 순서입니다. 상세 사용법·설정은 docs/EQUIPMENT_GEMS_UPDATE.md, 클릭 순서는 docs/EQUIPMENT_GEMS_DEPLOY.md, 검증 근거는 docs/EQUIPMENT_GEMS_VERIFICATION.md에 있습니다.

검증 완료: 단위 214개, PC·모바일 게임 122개, 클라우드 42개 통과. TypeScript/Vite 및 정답 데이터 번들 제외, Deno frozen lockfile 검사도 통과했습니다. 기존 큰 청크 경고는 남습니다.
