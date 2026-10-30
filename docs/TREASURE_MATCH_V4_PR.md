# 보물 3매치 v4: 3초 콤보·고난도·검증 코인 보상

직접 콤보를 조작 가능한 3초로 바꾸고, 요청서의 점수 구간과 Lv.1~7 시간 소모 ×1~3을 적용했습니다. 최고 콤보·최장 실제 유지 시간·이어간 직접 교환 수를 기록하며 기존 점수 배율 ×8 상한과 30개 스테이지를 보존합니다.

공유 월드의 도전은 서버 발급 시드와 교환 기록을 같은 엔진으로 재생한 뒤에만 코인을 지급합니다. 별도 treasure Edge Function과 추가 SQL이 최신 월드의 코인 덧셈·지급 영수증을 원자적으로 처리합니다. 중도 종료/연습/과거 로컬 기록은 지급하지 않으며, 분할 검증·재시도·응답 유실·동시 요청의 중복 지급을 방지합니다. 기존 CloudClient·game 서버·사천성·영단어는 변경하지 않습니다.

공유 SVG의 면·반사·깊이·하이라이트를 개선하고 마우스/터치를 따라 움직이는 transform 드래그·대상 강조·기울기·취소 정리를 추가했습니다. 큰 3초 콤보 HUD·난이도 경고·확정 보상 카운트업을 제공합니다.

검증: 단위 419개·전체 브라우저 160개·클라우드 50개·최종 기능 30개·양 기기 보상 2개·실제 5분 실측 2개와 빌드/Deno 검사 통과. 상세 수치와 환경 한계는 [검증 보고서](https://github.com/kwonyoung1/pocket-friends/blob/feat/treasure-match-v4-rewards/docs/TREASURE_MATCH_V4_VERIFICATION.md)에 있습니다. 서버가 가능한 보드/시간을 검증하며 자동화 봇 판별을 보장하지는 않습니다. 보상 검증은 성공 3~2,000회·12시간 이내의 정상 종료 판으로 제한하고 UI/사용법에 공개했습니다.

배포: 신규 `202610300001_treasure_rewards.sql` 적용 → 검사 성공 후 PR 병합 → 새 **Deploy Treasure rewards (manual)**을 main으로 실행 → 자동 웹사이트 **Test and deploy Pocket Friends**의 build/deploy 성공 확인. 기존 game 서버 배포는 불필요합니다. [누를 버튼별 안내](https://github.com/kwonyoung1/pocket-friends/blob/feat/treasure-match-v4-rewards/docs/TREASURE_MATCH_V4_DEPLOY.md)
