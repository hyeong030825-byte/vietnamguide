# 베트남 가이드 앱 출시 가이드

2026-11-08 작성. Claude 문서(아티팩트)로 만들었던 안내를 저장소로 옮겨 온 것이에요. 기술 설명은 [`app/README.md`](../app/README.md)에 있어요.

## 지금 준비된 것

앱은 클라우드 빌드에서 안드로이드·아이폰 모두 성공했어요. 이제 스토어 계정만 만들면 올릴 수 있어요.

| 항목 | 상태 | 어디서 보나요 |
| --- | --- | --- |
| 안드로이드 앱 | 테스트용 APK와 구글 플레이용 번들(.aab)이 자동으로 만들어져요 | [GitHub Actions](https://github.com/hyeong030825-byte/vietnamguide/actions) → App (Android) |
| 아이폰 앱 | Xcode 26.3으로 컴파일까지 확인했어요. 애플 비밀값을 넣으면 TestFlight로 자동으로 올라가요 | [GitHub Actions](https://github.com/hyeong030825-byte/vietnamguide/actions) → App (iOS) |
| 스토어 이미지 | 앱스토어 스크린샷 6장(1320×2868), 플레이 스크린샷 6장(1080×1920), 플레이 그래픽 이미지(1024×500), 아이콘(512×512) | [app/store 폴더](../app/store) |
| 안드로이드 업로드 키 | 만들어 두었어요. 예전 채팅에서 파일 두 개로 받았어요 | github-secrets-android.txt, vietnamguide-upload-key.jks |
| 개인정보처리방침 | 앱 내용을 추가했어요(2026년 11월 8일 개정) | [vietnamguide.pages.dev/privacy](https://vietnamguide.pages.dev/privacy) |

- 스토어 이름: 베트남 여행 스마트 가이드
- 홈 화면 이름: 베트남 가이드
- 앱 ID: io.github.hyeong030825.vietnamguide (스토어에 올린 뒤에는 바꿀 수 없어요)
- 첫 버전: 1.0.0

앱은 웹사이트와 같은 내용을 휴대폰에 담아 **인터넷 없이도** 돌아가요. 로그인·여행 후기·방문 통계는 빼서 애플의 'Apple로 로그인' 의무와 사용자 글 관리 의무를 피했어요. 발음 듣기는 휴대폰 음성을 쓰고, 바깥 링크는 앱 안 브라우저로 열려요.

## 1단계: 스토어 계정 만들기 (지금 바로)

두 계정 모두 본인 명의로 직접 가입해야 하고, 승인까지 며칠씩 걸려요. 그래서 가장 먼저 신청해 두세요.

|  | 애플 (App Store) | 구글 (Google Play) |
| --- | --- | --- |
| 가입하는 곳 | [Apple Developer Program](https://developer.apple.com/programs/enroll/) → Enroll | [Google Play Console](https://play.google.com/console/signup) |
| 비용 | 연 99달러(해마다 갱신) | 한 번만 25달러 |
| 필요한 것 | 2단계 인증을 켜 둔 Apple ID, 성인 본인 명의 | 구글 계정, 신분증 인증. 안드로이드 휴대폰으로 기기 인증을 요구할 수 있어요 |
| 승인까지 | 보통 1~2일 | 신분 확인 며칠 |
| 고를 것 | 개인(Individual). 스토어에 판매자로 본인 이름이 보여요 | 개인 계정. 새 개인 계정은 비공개 테스트를 거쳐야 출시돼요(2단계) |

가입을 기다리는 동안 비공개 테스트에 참여할 **친구 12명의 구글 계정(Gmail 주소)** 을 모아 두세요. 안드로이드 휴대폰을 쓰는 친구여야 해요.

## 2단계: 안드로이드 (구글 플레이)

구글 플레이는 14일 비공개 테스트 때문에 정식 출시까지 빨라도 3주쯤 걸려요.

1. **업로드 키를 GitHub에 넣기.** [저장소 비밀값 설정](https://github.com/hyeong030825-byte/vietnamguide/settings/secrets/actions) → New repository secret. 채팅으로 받은 github-secrets-android.txt의 4줄을 하나씩 넣어요(Name은 왼쪽, Secret은 `=` 뒤 전부). .jks와 .txt 파일은 다른 사람에게 보내지 말고 안전한 곳에 따로 보관하세요.
2. **다시 빌드하기.** [Actions](https://github.com/hyeong030825-byte/vietnamguide/actions) → App (Android) → Run workflow. 5~10분 뒤 실행 화면 아래 Artifacts에서 `android-play-bundle`을 받아 압축을 풀면 플레이에 올릴 .aab 파일이 나와요.
3. **(선택) 내 폰에서 먼저 써 보기.** 같은 곳의 `android-test-apk`를 받아 안드로이드 폰에 설치해요. '출처를 알 수 없는 앱 설치'를 허용해야 해요. 지금도 받을 수 있어요.
4. **플레이 콘솔에서 앱 만들기.** 앱 만들기 → 이름 '베트남 여행 스마트 가이드', 기본 언어 한국어, 앱, 무료.
5. **앱 설정 채우기.** 대시보드의 설정 항목(개인정보처리방침, 앱 액세스, 광고, 콘텐츠 등급, 타겟층, 데이터 보안, 금융 기능 등)을 아래 '심사 질문 답변'대로 채워요.
6. **스토어 등록정보.** 간단한 설명·자세한 설명은 아래 문구를 붙여넣고, 아이콘 `play-icon-512.png`, 그래픽 이미지 `play-feature-graphic.png`, 휴대전화 스크린샷 `play-1`~`play-6`을 올려요(모두 app/store 폴더).
7. **비공개 테스트 만들기.** 테스트 및 출시 → 비공개 테스트 → 테스터 목록에 친구 12명의 이메일 추가 → 새 버전 만들기 → .aab 업로드. 'Play 앱 서명'은 구글이 관리하는 기본값 그대로 두세요.
8. **테스터 참여.** 검토가 끝나면 나오는 참여 링크를 친구들에게 보내요. 12명 이상이 **14일 동안 계속** 참여 상태여야 해요. 중간에 빠졌다 다시 들어오면 그 사람은 14일을 다시 세요.
9. **정식 출시 신청.** 14일이 지나면 대시보드에서 프로덕션 액세스를 신청해요. 테스트로 무엇을 확인했는지 묻는 질문에 답하고, 승인되면 프로덕션 트랙으로 출시해요.

출처: [새 개인 개발자 계정의 테스트 요건 (Play 고객센터)](https://support.google.com/googleplay/android-developer/answer/14151465) · [타겟 API 요건: 2026년 8월 31일부터 Android 16 (API 36)](https://developer.android.com/google/play/requirements/target-sdk). 앱은 API 36을 타겟으로 빌드돼요.

## 3단계: 아이폰 (App Store)

맥이 없어도 돼요. GitHub가 클라우드 맥에서 서명해 TestFlight로 올려 주니, 비밀값 4개만 넣으면 돼요.

1. **번들 ID 등록.** [Identifiers](https://developer.apple.com/account/resources/identifiers/list) → + → App IDs → App → Description `Vietnam Guide`, Bundle ID는 Explicit로 `io.github.hyeong030825.vietnamguide`. 추가 기능은 고르지 않아요.
2. **App Store Connect에 앱 만들기.** [App Store Connect](https://appstoreconnect.apple.com) → 앱 → + 신규 앱 → iOS, 이름 '베트남 여행 스마트 가이드', 기본 언어 한국어, 방금 등록한 번들 ID, SKU `vietnamguide`.
3. **API 키 만들기.** 사용자 및 액세스 → 통합 → App Store Connect API → 팀 키. 처음이면 '액세스 요청'부터 눌러요. + → 이름 `GitHub`, 액세스 **관리자(Admin)** → 만든 뒤 **키 다운로드**(.p8 파일, 한 번만 받을 수 있어요). 같은 화면에서 키 ID와 발급자 ID(Issuer ID)를 확인해요.
4. **팀 ID 확인.** [Membership details](https://developer.apple.com/account#MembershipDetailsCard)의 Team ID(10자리).
5. **GitHub 비밀값 4개 넣기.** [저장소 비밀값 설정](https://github.com/hyeong030825-byte/vietnamguide/settings/secrets/actions)에서 아래 표대로 만들어요. 채팅이나 다른 곳에는 적지 마세요.
6. **빌드하고 올리기.** [Actions](https://github.com/hyeong030825-byte/vietnamguide/actions) → App (iOS) → Run workflow. 15~25분 뒤 성공하면 App Store Connect의 TestFlight 탭에 빌드가 나타나요(처리에 10~30분). 실패하면 실행 화면 링크를 Claude에게 알려 주세요.
7. **내 아이폰에서 써 보기.** 아이폰에 TestFlight 앱을 설치하고, TestFlight 탭의 내부 테스트 그룹에 본인을 넣어 초대를 수락해요.
8. **심사 제출.** 앱 화면에서 6.9인치 스크린샷 칸에 `ios-1`~`ios-6`, 부제·설명·키워드·URL(아래 문구), 앱 개인정보, 연령 등급, 가격(무료), 빌드를 넣고 심사에 제출해요. 보통 하루 안팎, 길면 며칠 걸려요.
9. **반려되면.** 반려 사유를 그대로 Claude에게 보내 주세요. 웹사이트를 감싼 앱이라는 이유(가이드라인 4.2)로 반려될 수 있어서, 인터넷 없이 동작하는 점과 휴대폰 음성 발음 듣기를 심사 메모에 적어 뒀어요.

| 비밀값 이름 (Name) | 넣을 값 (Secret) |
| --- | --- |
| `ASC_KEY_ID` | 3번의 키 ID |
| `ASC_ISSUER_ID` | 3번의 발급자 ID |
| `ASC_KEY_P8` | .p8 파일을 메모장으로 열어 `-----BEGIN PRIVATE KEY-----`부터 끝줄까지 전부 |
| `APPLE_TEAM_ID` | 4번의 팀 ID |

## 스토어 등록 문구 (복사해서 쓰기)

두 스토어에 같은 문구를 쓰면 돼요. 글자 수는 스토어 제한 안에 맞췄어요.

| 칸 | 넣을 내용 |
| --- | --- |
| 앱 이름 (두 스토어, 30자) | 베트남 여행 스마트 가이드 |
| 부제 (앱스토어, 30자) | 회화·동 계산·메뉴판·도시 가이드 |
| 프로모션 텍스트 (앱스토어, 170자) | 인터넷이 안 돼도 괜찮아요. 112개 실전 회화와 발음 듣기, 동 계산기, '고수 빼기' 주문 화면, 9개 도시 가이드를 한 앱에 담았어요. |
| 간단한 설명 (구글 플레이, 80자) | 회화·발음 듣기, 동 계산기, 메뉴판, 9개 도시 가이드를 인터넷 없이 쓰는 베트남 여행 앱 |
| 키워드 (앱스토어, 100자) | 회화,환율,계산기,다낭,호이안,후에,나트랑,푸꾸옥,하노이,하롱베이,호치민,달랏,메뉴판,고수,그랩,베트남어,발음 |
| 카테고리 | 앱스토어: 여행 (보조: 참고) · 플레이: 여행 및 지역정보 |
| 지원 URL | https://vietnamguide.pages.dev/contact |
| 마케팅 URL (앱스토어) | https://vietnamguide.pages.dev |
| 개인정보처리방침 URL | https://vietnamguide.pages.dev/privacy |
| 연락처 이메일 (플레이, 공개됨) | vietnamguide708@gmail.com |
| 저작권 (앱스토어) | 2026 본인 이름 |
| 가격 | 무료, 광고·인앱 결제 없음 |

설명 (앱스토어 '설명', 플레이 '자세한 설명'):

```
베트남 여행 스마트 가이드는 베트남을 여행하는 한국인을 위한 실전 도우미예요. 한 번 설치하면 인터넷이 없어도 회화, 계산기, 메뉴판, 도시 정보를 볼 수 있어요.

■ 말은 통하게: 상황별 실전 회화
· 식당, 시장, 택시, 숙소, 긴급 상황까지 112개 문장
· 버튼 하나로 베트남어 발음 듣기, 천천히 듣기
· 존댓말·반말 골라 보기, 한글 발음 표기

■ 계산은 신속하게: 동 계산기
· 동을 원으로 바로 계산, '0 하나 떼고 2로 나누기' 간편 계산
· 달러·엔·유로 등 12개 통화
· 헷갈리는 지폐 구분과 돈 부르는 말

■ 메뉴판 앞에서도: 음식·주문
· 쌀국수, 분짜, 반미 등 대표 음식 설명
· '고수 빼 주세요' 같은 요청을 화면으로 보여 주기

■ 9개 도시 가이드
· 다낭, 호이안, 후에, 나트랑, 푸꾸옥, 하노이, 하롱베이, 호치민, 달랏
· 지도에서 도시를 고르면 가는 법, 날씨, 명소, 현지 맛집, 체험까지
· 택시 기사님께 주소를 크게 보여 주는 기능

■ 여행은 안전하게
· 경찰·소방·구급 번호와 영사안전콜센터, 대사관·총영사관 연락처
· 위급할 때 쓰는 베트남어 문장

■ 출발 전 준비
· 입국 규정, 반입 금지 품목, 지역별 날씨와 옷차림
· 준비물 체크리스트, 트래블카드 비교표

로그인이나 회원가입 없이 바로 쓸 수 있고, 북마크·메모·체크리스트는 휴대폰 안에만 저장돼요. 웹사이트(vietnamguide.pages.dev)에서도 같은 정보를 볼 수 있어요.
```

## 심사 질문 답변

앱은 아무 정보도 모으지 않고 로그인도 없어서, 대부분 '없음'으로 답하면 돼요.

| 질문 | 스토어 | 답 |
| --- | --- | --- |
| 앱 개인정보 (데이터 수집) | 앱스토어 | 데이터를 수집하지 않음 |
| 데이터 보안 | 플레이 | 사용자 데이터를 수집하거나 공유하지 않음 |
| 앱 액세스 | 플레이 | 모든 기능을 특별한 액세스 없이 사용 가능 |
| 광고 | 플레이 | 광고 없음 |
| 콘텐츠 등급 설문 | 플레이 | 카테고리 '참고, 뉴스 또는 교육'. 폭력·선정성·도박·사용자 간 소통·위치 공유 모두 아니요 |
| 연령 등급 | 앱스토어 | 모든 항목 없음. 무제한 웹 액세스도 아니요(정해진 링크만 열어요) |
| 타겟층 | 플레이 | 13~15세, 16~17세, 18세 이상. 13세 미만을 고르면 가족 정책 심사가 더 붙어요 |
| 금융 기능 | 플레이 | 제공하지 않음 (트래블카드 비교는 정보 안내만 해요) |
| 건강 앱, 정부 앱 | 플레이 | 해당 없음 |
| 제3자 콘텐츠 권리 | 앱스토어 | 메뉴·기념품 사진을 직접 찍었거나 사용 허락을 받았으면 권리가 있다고 답해요. 출처가 불분명한 사진이 있으면 먼저 확인하세요 |
| 암호화(수출 규정) | 앱스토어 | 앱에 '표준 암호화만 사용'으로 설정해 두어서 보통 묻지 않아요. 물으면 '없음' |
| 심사용 로그인 정보 | 둘 다 | 필요 없음 (로그인 기능 없음) |

심사 메모 (앱스토어 App Review 정보 → 메모, 영어로):

```
No account is needed; every feature works without login. The app works offline: travel phrases read aloud with the system's Vietnamese voice, a dong currency calculator (live rates when online), a menu decoder, nine city guides with an offline map, emergency numbers and a packing checklist. Outside links (maps, sources) open in an in-app Safari view. The app collects no data; bookmarks and notes stay on the device.
```

## 예상 일정과 주의할 점

두 계정을 같은 날 신청하면 아이폰은 1주 안팎, 안드로이드는 3~4주 뒤에 스토어에 올라가요.

| 단계 | 아이폰 | 안드로이드 |
| --- | --- | --- |
| 개발자 계정 승인 | 1~2일 | 며칠 (신분 확인) |
| 빌드 업로드 | TestFlight로 자동 (비밀값 4개 넣은 뒤) | .aab를 비공개 테스트에 업로드 |
| 테스트 | TestFlight로 바로 | 테스터 12명이 14일 동안 참여 |
| 심사·출시 | 보통 하루 안팎 | 프로덕션 액세스 신청 후 심사 |

심사가 끝날 때까지 기다리지 않아도 돼요. 테스트용 APK와 TestFlight로 발표 때 실제 앱을 보여 줄 수 있어요.

- **비밀값 보관:** 업로드 키(.jks)와 애플 API 키(.p8)는 저장소나 채팅에 올리지 마세요. 업로드 키를 잃어버리면 구글에 업로드 키 재설정을 요청해야 해요.
- **바꿀 수 없는 것:** 앱 ID(io.github.hyeong030825.vietnamguide)는 스토어에 올린 뒤 못 바꿔요. 앱 이름과 아이콘은 나중에 바꿀 수 있어요.
- **애플 회비:** 매년 내야 앱이 앱스토어에 남아요.
- **내용 고치기:** 앱에는 웹사이트 내용이 담겨 있어서, 사이트를 고치면 앱은 새 버전을 내야 반영돼요. 트래블카드 표처럼 자주 바뀌는 정보는 특히 신경 써 주세요.

새 버전을 내는 법:

1. Claude에게 고칠 내용과 함께 새 버전을 말해 주세요. app/package.json의 version을 1.0.1처럼 올려요.
2. 저장소에 올라가면 두 앱이 자동으로 다시 빌드돼요.
3. 안드로이드는 새 .aab를 플레이 콘솔에 올리고, 아이폰은 TestFlight에 올라온 빌드로 App Store Connect에서 새 버전을 제출해요.

출처: [Apple Developer Program 가입](https://developer.apple.com/programs/enroll/) · [Play 테스트 요건](https://support.google.com/googleplay/android-developer/answer/14151465) · [Play 타겟 API 요건](https://developer.android.com/google/play/requirements/target-sdk)
