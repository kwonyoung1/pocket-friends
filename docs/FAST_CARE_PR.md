# 빠른 도전·캐릭터 일괄 관리·보상 검증 경량화

새 도전의 제거/특수 기본 점수를 2배로 올리고 /500 기본 코인 보정을 적용했습니다. 3,000~60,000점 단계와 시간 소모 ×1.5~8을 사용하며 연쇄가 끝나면 점수에 맞는 최종 단계로 바로 올라갑니다. 3초 콤보와 스테이지 규칙은 보존합니다.

생활 메뉴에 모두 놀아주기/모두 씻기, 음식 카드에 확인 가능한 일괄 주기를 추가했습니다. 서버가 한 명령에서 각 친구의 기존 제한과 보유 수량을 확인하고 기존 원자적 월드 commit·operation 영수증을 재사용합니다. 사진·월드·사천성·영단어와 기존 동기화 방식은 유지합니다.

보상 재생은 화면용 배열 없이 같은 엔진을 사용하고, 입력 기록은 숫자 튜플로 전송합니다. 최대 256수/250ms 예산으로 나누어 검증하며 기존 v4 세션은 원래 규칙·금액으로 계속 정산합니다. v5를 v4로 위장한 청구는 거절합니다.

검증: 통합 단위 437개, 마지막 보상/새 규칙 관련 19개, 핵심 회귀 8개와 일괄/정산 클라우드 검사 및 빌드·Deno 통과. 100수 표본의 정산 분량은 2회→1회, 같은 기록 본문은 4,262→1,821바이트였습니다. 50판 반응 시간 모델은 요청한 표에서 연출 포함 약 39~56초로 목표보다 짧아 실제 사람 기준 추가 튜닝이 필요할 수 있습니다.

신규 SQL `202610310001_treasure_rules5.sql` 적용 후 병합하고 **Deploy game update (manual)**에서 main을 실행하면 game·treasure가 함께 배포됩니다. 자동 웹사이트 build/deploy 성공도 확인하세요.

[사용법](https://github.com/kwonyoung1/pocket-friends/blob/feat/faster-challenge-bulk-care/docs/FAST_CARE_UPDATE.md) · [검증](https://github.com/kwonyoung1/pocket-friends/blob/feat/faster-challenge-bulk-care/docs/FAST_CARE_VERIFICATION.md) · [배포 버튼 순서](https://github.com/kwonyoung1/pocket-friends/blob/feat/faster-challenge-bulk-care/docs/FAST_CARE_DEPLOY.md)
