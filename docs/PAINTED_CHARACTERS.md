# 실제 PNG/WebP 캐릭터 교체 보고

> 이전 페인팅 원화 제작 기록입니다. 동물은 [4족 보행·수채화 업데이트](WOODLAND_ANIMALS.md)로 교체했고 사람 원화는 그대로 유지합니다.

## 실제 제작과 적용

기준 main은 `91c4153`입니다. 기존 리디자인 브랜치 `feat/illustrated-character-redesign`에서 SVG 버전을 새 페인팅 원화로 교체했습니다. 요청에 기재한 참고 PNG 3장이나 별도 ZIP은 작업 폴더에 없었습니다. 기존 사람 `boy.png`, `girl.png`는 직접 확인해 짧게 올라간 갈색 머리/회색 니트, 긴 갈색 머리/앞머리/검은 재킷, 청바지/흰 운동화 특징을 생성 참고로 사용했습니다.

실제로 image_gen을 호출해 같은 화풍의 새 원화를 생성했습니다. 손으로 그린 그림이나 원본 사진에서 없는 자세를 추출한 결과라고 주장하지 않습니다. 동물은 털 결과 눈 하이라이트, 사람은 머리카락·니트·재킷·청바지 명암이 있는 래스터입니다. 기본 도형 SVG를 다시 채색한 결과가 아닙니다.

|종류|실제 적용 폴더|기본 PNG + 게임용 프레임|
|---|---|---|
|고양이|`src/assets/characters/cat/`|`idle.png`, `idle/happy/closed/walk-a/walk-b/sleep.webp`|
|토끼|`src/assets/characters/bunny/`|동일한 실제 7개 파일|
|강아지|`src/assets/characters/dog/`|동일한 실제 7개 파일|
|곰|`src/assets/characters/bear/`|동일한 실제 7개 파일|
|여우|`src/assets/characters/fox/`|동일한 실제 7개 파일|
|남자|`src/assets/characters/boy/`|동일한 실제 7개 파일|
|여자|`src/assets/characters/girl/`|동일한 실제 7개 파일|

총 7개 기본 PNG와 42개 WebP는 전부 512×512이며 투명 여백을 가집니다. 생성 원본 21개 PNG는 `art-source/characters/`에 보관했습니다. 캐릭터 시트의 유사한 걷기 두 칸을 사용하지 않고 별도 제작한 벌린 걸음/무릎 든 걸음을 사용합니다. 출처와 이용 조건은 [원화 출처 및 라이선스](../art-source/characters/LICENSE.md)에 명시했습니다. 외부 유료/무료 스톡을 혼합하지 않았습니다.

## 렌더링과 데이터

- `src/Character.tsx`는 **사용자 사진을 우선**하고, 사진 없는 동물만 `PaintedSprite`로 보냅니다.
- `src/humans/HumanSprite.tsx`는 기존 ID/포즈 판단을 그대로 사용하면서 같은 새 렌더러를 사용합니다.
- `src/art/PaintedSprite.tsx`, `paintedManifest.ts`, `painted.css`가 실제 WebP와 상태를 연결합니다. 원본 사람 PNG와 이전 SVG는 이력/참고용으로 보존하며 기본 캐릭터 경로에서는 사용하지 않습니다.
- 시각적 크기를 PC 1.35배, 모바일 1.45배로 확대했습니다. 정사각 원화는 비율을 유지하며 발 기준점을 맞췄습니다. 이름표와 말풍선은 독립 요소입니다. 확대 배율은 렌더링 배율이며, 종별 원화 실루엣의 비율 차이까지 동일하다고 주장하지 않습니다.
- 좌표/이동/충돌/드래그 계산, 저장 포맷, Supabase 서버, 보상/탐험/강화, 두 미니게임은 변경하지 않았습니다. 기존의 넓은 방은 가로·세로로 이동해 볼 수 있습니다. 화면에 한 번에 모든 친구가 나오도록 좌표를 초기화하지 않습니다.
- 기존 색상 필드는 보존합니다. 크림 고양이/진한 곰/보라 토끼/흰 강아지는 알려진 기존 팔레트에 맞춘 표시 필터를 사용합니다. 모든 임의의 사용자 지정 색을 정확하게 래스터에 재착색하는 시스템은 아닙니다. 사람과 개인 사진에는 팔레트 필터를 적용하지 않습니다.

## 동작별 구현 범위와 한계

|동작|실제 구현|
|---|---|
|기본 대기|새 기본 원화, 기존 개별 리듬의 아주 작은 균일 호흡 확대. 얼굴 비균일 변형 없음|
|눈 깜빡임|새 감은 눈 프레임과 기본 프레임 전환. 기존 불규칙 타이머 사용|
|웃음·기쁨|새 웃는 원화, 기존 하트/점프·교감·레벨업 연결|
|걷기|다리 자세가 다른 두 실제 원화의 0.88초 주기 교대, 기존 방향 반전. 다중 관절/완전한 8프레임 보행은 아님|
|갸웃·주변 보기|미세한 전신 기울기. 눈동자/머리를 독립적으로 회전하는 부위 레이어는 없음|
|졸림·휴식|감은 눈의 선 자세를 사용. 별도 앉은 자세는 아직 없음|
|수면|새로 제작한 누운 원화, 사람은 베개/담요, 기존 Zzz. 서 있는 이미지를 찌그러뜨리지 않음|
|먹이|기존 실제 음식 사용 성공/타이머와 음식·표정·하트 반응 유지. 독립 입 레이어의 정교한 씹기는 미구현|
|놀이|실제 장난감별 아이콘/반응과 웃음/기존 하트. 팔·꼬리를 따로 움직이는 신규 레이어는 없음|
|놀람|기존 느낌표와 상태 판단 유지. 별도 놀란 얼굴 원화는 없음|
|귀·꼬리/하품|독립 부위 애니메이션과 새 하품 입 원화는 미구현|

이 제한들은 부위가 분리되지 않은 생성 래스터를 억지로 늘리거나 자르는 결과를 피한 범위입니다. 사람의 SD 비율 역시 생성 결과의 실제 비율을 유지했으며, 모든 프레임이 정확한 2.5~3등신이라는 검수 결과는 아닙니다. 위 미구현 항목까지 완료했다고 보고하지 않습니다.

## 성능과 접근성

게임용 42개 WebP 총량은 약 1.59 MiB입니다. 큰 원본 PNG 21장은 사이트 빌드에 포함되지 않습니다. 512px PNG 7개는 원화 검수용 URL로 제공되지만 화면은 WebP로 표시하며 검수 속성만으로 PNG 다운로드를 일으키지 않습니다. 필요한 현재 프레임과 다음 걷기/깜빡임 프레임을 사용하고 별도의 Pixi 인스턴스는 만들지 않습니다. 기존 IntersectionObserver와 백그라운드 이벤트, 생활 모션 줄이기, prefers-reduced-motion에서 반복 동작을 멈춥니다. 실제 저사양 휴대전화 GPU/FPS를 측정했다고 주장하지 않습니다.

## 실제 화면

다음은 시안 합성이 아닌 실제 개발 App을 새 로컬 월드로 실행한 브라우저 캡처입니다. 운영 저장 데이터를 읽거나 변경하지 않았습니다.

- [변경 전 SVG 버전 PC](screenshots/redesign-home-desktop.png)
- [변경 후 PC](screenshots/painted-home-desktop.png)
- [변경 후 모바일](screenshots/painted-home-mobile.png)
- [모바일 오른쪽 공간](screenshots/painted-room-right-mobile.png)
- [모바일 돌보기 패널](screenshots/painted-care-mobile.png)
- [실제 렌더러 포즈 검사 갤러리](screenshots/painted-poses-gallery.png): 게임 화면이 아니라 동일 컴포넌트 검사용 화면입니다.

`node scripts/capture-painted-art.mjs`로 개발 App에서 재촬영할 수 있습니다. 갤러리는 프로덕션 빌드 진입점이 아닙니다.

## 검증

최종 검증 결과는 PR 본문과 아래 결과를 함께 확인하세요.

- `npm run check:character-art`: 42개 모두 크기·투명 가장자리·비어 있지 않은 픽셀·해시 검사 통과.
- 관련 단위 테스트: 7파일 83개 통과. 돌보기/특별 지급/가구 배치 및 저장 호환성 확인.
- 클라우드 핵심 회귀: PC·모바일 6개 통과. 두 기기 구매 멱등성, 특별 캐릭터 이름/사진/개별 친밀도, 음식/휴식 동기화 확인. 실제 운영 DB 대상 테스트는 아닙니다.
- 최종 브라우저 검증: PC·모바일 42개 통과 (1.9분). 새 원화 7종의 투명도·색상, 서로 다른 걷기 자세, 실제 장난감 반응, 사용자 사진 등록/크롭, 이름 변경, 드래그/터치, 수면/돌보기/저장 유지 검증.
- `npm run build`: TypeScript 및 Vite 빌드 통과. 영단어 데이터 제외, 이펙트 실험실 격리, 초기 거실의 PixiJS/GSAP 제외 검사 통과.
- 관련 없는 미니게임 전체 테스트는 재실행하지 않았습니다. 운영 배포 후 실제 사용자 데이터로 검증했다고 주장하지 않습니다.

## 병합과 배포 — 서버 배포 불필요

1. [새 PR 만들기](https://github.com/kwonyoung1/pocket-friends/compare/main...feat/illustrated-character-redesign?expand=1)를 엽니다. GitHub 로그인이 되어 있어야 합니다. `base: main`, `compare: feat/illustrated-character-redesign`을 확인하고 **Create pull request**를 누릅니다. 이미 PR이 있다면 그 PR을 엽니다.
2. PR에서 **Checks**가 초록색인지 확인합니다. 실행 중이면 완료까지 기다립니다. 실패했다면 병합하지 말고 실패 단계 로그를 확인합니다.
3. PR **Conversation** 아래의 **Merge pull request → Confirm merge**를 누릅니다. 브랜치 코드가 main에 합쳐지는 단계입니다.
4. [웹사이트 배포 목록](https://github.com/kwonyoung1/pocket-friends/actions/workflows/deploy.yml)을 엽니다. 방금 병합한 **main** 실행이 자동 시작됩니다. **build와 deploy 둘 다 초록색**이 될 때까지 기다립니다. 자동 실행이 있으면 Run workflow를 중복 실행할 필요가 없습니다. 자동 실행이 없다면 **Run workflow → Branch: main → Run workflow**를 한 번 실행합니다.
5. [게임 열기](https://kwonyoung1.github.io/pocket-friends/)에서 PC는 **Ctrl+Shift+R**, 모바일은 탭을 닫았다가 다시 열어 새 원화를 확인합니다. 캐시 확인을 위해 저장 데이터나 사이트 데이터를 삭제하지 마세요.

이번 변경은 프런트엔드 원화/표현이므로 **Deploy cloud backend (manual)** 또는 SQL 실행은 필요하지 않습니다. 서버 규칙·데이터베이스를 배포한 것이 아닙니다. Actions는 GitHub 서버에서 실행되므로 시작 후 PC를 꺼도 됩니다.
