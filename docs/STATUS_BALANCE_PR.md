시간 경과에 따른 돌봄 부담을 줄이기 위해 포만감을 −27→−9/시간, 청결도를 −18→−9/시간, 기본 행복도를 −13.2→−6.6/시간으로 조정하고 체력 −9.6/시간을 +8/시간으로 바꿉니다. 낮은 포만감·청결도에 따른 행복도 추가 감소도 절반으로 줄입니다. 음식·수동 휴식·수면 추가 회복·목욕·탐험·이모션 기준은 유지합니다.

상태 정산을 하나로 모아 프레임·저장·재접속에서 같은 시간을 중복 계산하지 않습니다. 이전 저장의 미정산 시간은 기존 규칙으로 한 번 처리한 뒤 전환 시점을 기록하므로 새 규칙을 소급하지 않습니다. 새 자연 회복에 과거 감소 상쇄용 수면 +9.6을 더하지 않으며, 새 규칙에 2배 배율을 곱하지 않습니다.

기존 Supabase JSON 월드와 RPC를 유지하며 새 SQL은 없습니다. 클라이언트 버전 10, 서버 시간 정산, 기기 날짜와 독립적인 정기 요청, 입장/복귀 시 정산, 변경 전 로컬 원본 백업을 포함합니다. 기존 데이터와 게임 기능을 초기화하지 않습니다.

[구현·수치·클릭별 배포 안내](https://github.com/kwonyoung1/pocket-friends/blob/feat/gentle-status-balance/docs/STATUS_BALANCE_UPDATE.md) · [검증 결과](https://github.com/kwonyoung1/pocket-friends/blob/feat/gentle-status-balance/docs/STATUS_BALANCE_VERIFICATION.md)

검증: 단위·실제 DB 194개, 전체 PC/모바일 화면 118개, 전체 클라우드 38개가 각각 단일 실행에서 모두 통과했습니다. 최종 빌드·Deno frozen check·diff check도 통과했습니다. 운영 데이터에는 테스트를 실행하지 않았습니다.
