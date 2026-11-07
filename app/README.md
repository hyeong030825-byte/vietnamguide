# 스토어 앱 (Android · iOS)

웹사이트와 같은 페이지를 [Capacitor](https://capacitorjs.com) 8로 감싼 앱이에요. 맥이나 안드로이드 스튜디오 없이 GitHub Actions가 클라우드에서 빌드해요.

| 경로 | 내용 |
|---|---|
| `www/` | 앱에 들어가는 파일. `python3 build.py`가 `src/page.html`에서 만들어요(직접 고치지 마세요). 글꼴(SIL OFL)과 사진이 들어 있어 인터넷 없이 돌아가요. |
| `capacitor.config.json` | 앱 ID `io.github.hyeong030825.vietnamguide`(스토어에 올린 뒤엔 바꿀 수 없어요), 홈 화면 이름 `베트남 가이드` |
| `assets/` | 아이콘·스플래시 원본. 빌드할 때 `@capacitor/assets`가 크기별로 만들어요. |
| `scripts/prepare-*.sh` | 빌드할 때마다 `android/`, `ios/` 프로젝트를 새로 만들고 버전·세로 화면·아이폰 전용·암호화 신고(없음)를 맞춰요. 두 폴더는 저장소에 올리지 않아요. |
| `store/` | 스토어 스크린샷(앱스토어 6.9인치 1320×2868, 구글 플레이 1080×1920), 플레이 그래픽 이미지 1024×500, 아이콘 512 |

## 앱에서 달라지는 점 (`APP = true`)

- 로그인·여행 후기·방문 통계 없음. 기록은 휴대폰에만 저장돼요.
- 바깥 링크와 사이트 소개·개인정보처리방침·문의는 앱 안 브라우저(`@capacitor/browser`)로 열려요.
- 발음 듣기는 휴대폰 음성(`@capacitor-community/text-to-speech`)을 써요. 안드로이드 WebView에는 웹 음성 기능이 없어서예요.
- 상태 표시줄 아래로 화면이 내려오고, 상태 표시줄 색이 테마를 따라가요.

## 빌드 (GitHub → Actions)

`app/` 아래가 바뀌어 main에 올라가면 자동으로 돌고, Actions 탭에서 **Run workflow**로 직접 돌릴 수도 있어요.

- **App (Android)**: `android-test-apk`(휴대폰에 바로 설치해 보는 테스트용)와 `android-play-bundle`(.aab, 구글 플레이 업로드용)을 만들어요. 아래 비밀값이 있으면 .aab에 업로드 키로 서명해요.
- **App (iOS)**: 비밀값이 없으면 시뮬레이터용으로 컴파일만 확인하고, 있으면 서명해서 App Store Connect(TestFlight)로 바로 올려요.

버전 이름은 `package.json`의 `version`, 빌드 번호는 워크플로 실행 번호예요. 스토어에 새 버전을 낼 때는 `version`을 올리세요(예: 1.0.1).

## 비밀값 (Settings → Secrets and variables → Actions)

| 이름 | 값 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | 업로드 키(.jks)를 base64로 바꾼 글자 |
| `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD` | 업로드 키 비밀번호 |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ASC_KEY_ID`, `ASC_ISSUER_ID` | App Store Connect → 사용자 및 액세스 → 통합 → App Store Connect API의 키 ID와 발급자 ID |
| `ASC_KEY_P8` | 그 키(.p8 파일)를 메모장으로 연 내용 전체(`-----BEGIN PRIVATE KEY-----`부터 끝까지). 키 권한은 **관리자(Admin)** 여야 서명용 인증서를 자동으로 만들 수 있어요. |
| `APPLE_TEAM_ID` | developer.apple.com → Membership의 팀 ID(10자리) |

비밀값은 저장소나 채팅에 적지 말고 GitHub 설정 화면에만 넣으세요. 업로드 키 파일은 따로 안전하게 보관하세요.
