# 인수인계: 새 Claude 계정에서 이어서 작업하기

2026-11-19에 썼어요. 이 사이트는 2026년 10월부터 한 Claude 계정에서 대화로 만들어 왔는데, 앞으로는 다른 Claude 계정에서 작업해요. 예전 대화 기록은 옮길 수 없어서, 이어서 작업하는 데 필요한 것을 이 문서와 [README.md](README.md)에 모아 뒀어요.

- 사이트: https://vietnamguide.pages.dev
- 저장소: https://github.com/hyeong030825-byte/vietnamguide (`main` 브랜치에 올리면 Cloudflare Pages가 1~2분 안에 자동 배포)
- 자세한 구조·데이터 위치·서버 설정: [README.md](README.md) (맨 아래 "Notes for Claude"까지)
- 스토어 앱: [app/README.md](app/README.md), 출시 순서는 [docs/app-store-guide.md](docs/app-store-guide.md)

## 1. 새 계정에서 처음 할 일 (사람이 할 일)

1. **GitHub 연결.** 새 Claude 계정에서 GitHub를 연결하고, GitHub의 Claude 앱 권한에 `vietnamguide` 저장소가 들어 있는지 확인해요. GitHub 쪽 설정은 계정과 상관없이 그대로라서, 같은 GitHub 계정으로 로그인하면 돼요.
2. **첫 대화에 이렇게 보내기.**
   > hyeong030825-byte/vietnamguide 저장소를 연결하고 HANDOFF.md와 README.md를 먼저 읽은 뒤 이어서 작업해줘.
3. **메모리 옮기기 (선택).** 예전 계정의 설정 → 메모리에서 내용을 복사해 두고, 새 계정의 같은 곳에서 가져오기로 붙여 넣어요.
4. **커넥터 다시 연결 (필요할 때만).** Canva·구글 드라이브 같은 커넥터는 계정마다 따로라서 새 계정에서 다시 연결해야 해요. 예전 계정에 이름이 `github`인 사용자 지정 커넥터가 있었는데, 주소가 잘못 들어가(GitHub 프로필 설정 화면 주소) 동작하지 않았어요. 새 계정에는 만들 필요 없어요. GitHub는 1번으로 충분해요.
5. **Claude 미리보기 페이지와 환율 예약 작업 (선택).** 아래 4번을 보고 새 계정의 Claude에게 다시 만들어 달라고 하면 돼요. 공개 사이트에는 필요 없어요.

## 2. 계정을 바꿔도 그대로인 것

Claude 계정이 아니라 다른 서비스에 있어서 아무것도 하지 않아도 계속 동작해요.

| 무엇 | 어디에 |
| --- | --- |
| 사이트 코드, 앱 코드, 이 문서 | GitHub 저장소 |
| 공개 사이트, 로그인·후기 서버, 회원·후기 데이터(D1), 로그인 키 | Cloudflare Pages 프로젝트 `vietnamguide` |
| 앱 빌드와 서명 비밀값 | GitHub Actions, 저장소 Settings → Secrets |
| 방문 통계 | Cloudflare Web Analytics |
| 검색 등록 | 구글 서치 콘솔, 네이버 서치어드바이저 (`build.py`의 `HEAD_META` 태그) |
| 공개 연락처 | vietnamguide708@gmail.com |
| 안드로이드 업로드 키 파일 | 사용자가 따로 보관 (`.jks`, `github-secrets-android.txt`) |

## 3. 예전 계정에만 있던 것

| 무엇 | 어떻게 했나 |
| --- | --- |
| 대화 기록 | 옮길 수 없어요. 이 문서와 README가 대신해요 |
| "베트남 가이드 앱 출시 가이드" 문서 (Claude 문서) | 내용을 [docs/app-store-guide.md](docs/app-store-guide.md)로 옮겼어요 |
| Claude 미리보기 페이지 (사이트를 Claude 안에서 보는 아티팩트) | `build/claude-page.html`을 올린 것이라 언제든 다시 만들 수 있어요 (아래 4번) |
| 예약 작업 "베트남 가이드 환율 갱신" (매일 8:49, 16:49 서울 시간) | 미리보기 페이지의 환율만 고쳐요. 공개 사이트는 열 때마다 환율 API를 직접 불러서 상관없어요. 새로 만드는 법은 아래 4번 |

## 4. Claude 미리보기 페이지와 환율 예약 작업 다시 만들기

Claude 페이지 안에서는 바깥 환율 API를 부를 수 없어서, 페이지가 자기 데이터베이스의 `rates/krw_vnd` 문서를 읽어요(`src/page.html`의 `window.claude` 부분). 이 문서를 예약 작업이 하루 두 번 채워요.

1. `python3 build.py`를 돌린 뒤 `build/claude-page.html`을 아티팩트로 올려요. 이때 데이터베이스(db) 기능을 켜고, `rates` 컬렉션은 보는 사람 누구나 읽기, 쓰기는 소유자만으로 규칙을 줘요.
2. 예약 작업을 만들어요(서울 시간 하루 두 번). 프롬프트는 아래와 같고, `<새 미리보기 페이지 주소>`만 1번에서 만든 주소로 바꿔요.

```text
Refresh the exchange rates stored in the Vietnam travel guide page <새 미리보기 페이지 주소>. Do only the steps below.

1. Use WebFetch on https://open.er-api.com/v6/latest/USD and read time_last_update_utc plus rates.VND, KRW, EUR, JPY, CNY, TWD, HKD, SGD, THB, AUD, GBP and CAD (each is units per 1 USD). If that fails, use WebFetch on https://www.exchange-rates.org/converter/krw-vnd and read only how many VND 1 KRW buys, plus the date and time (UTC) the page gives for that rate.
2. If step 1 got the USD-based rates: build vndPer (dong per 1 unit) with vndPer.USD = rates.VND and vndPer[X] = rates.VND / rates[X] for every other code listed. Round KRW and JPY to 3 decimals, the rest to 2. Leave out any value outside its band: KRW 10–40, USD 13000–51000, EUR 14500–57000, JPY 82–326, CNY 1950–7700, TWD 400–1590, HKD 1650–6550, SGD 10100–40000, THB 385–1520, AUD 9100–36000, GBP 17200–68000, CAD 9200–36700. Then vndPerKrw = vndPer.KRW.
3. Continue only if vndPerKrw (from step 2, or the exchange-rates.org value) is between 10 and 40. Compute krwPer1000Vnd = 1000 / vndPerKrw, rounded to 2 decimals.
4. Load the ArtifactData tool with ToolSearch (query "select:ArtifactData"). Call it with action "get", url <새 미리보기 페이지 주소>, collection "rates", doc_id "krw_vnd" to read the document and its current version. Then call action "set" on the same url, collection and doc_id, with if_version set to that version (leave if_version out only if the document does not exist), and data: {"krwPer1000Vnd": <number>, "vndPerKrw": <number rounded to 3 decimals>, "vndPer": <the vndPer object from step 2; if only the exchange-rates.org won rate was found, copy the vndPer object from the document you just read unchanged, or leave the field out if it had none>, "asOf": "<the rate's time as ISO 8601 UTC>", "updatedAt": "<current time as ISO 8601 UTC>", "source": "ExchangeRate-API" or "exchange-rates.org" depending on where the won rate came from}.
5. If no trustworthy won rate was found, write nothing.

Finish with one line stating the won rate saved and how many other currencies were saved (or why nothing was saved). Do not change anything else.
```

## 5. 지켜 온 작업 규칙

- **고치는 곳:** `src/page.html`(구조·문구·데이터·스크립트)과 `src/input.css`. 고친 뒤 `python3 build.py`를 돌리고 `src/`, `site/`, `app/www/`를 함께 커밋해요. `site/index.html`을 직접 고치지 않아요.
- **배포 확인:** `main`에 올린 뒤 Cloudflare Pages 체크가 `success`가 될 때까지 확인해요.
  `gh api repos/hyeong030825-byte/vietnamguide/commits/<sha>/check-runs --jq '.check_runs[] | select(.name|test("Cloudflare")) | "\(.status) \(.conclusion)"'`
- **비밀값:** 로그인 키, 앱 서명 키, API 키는 채팅이나 저장소에 절대 적지 않아요. 사용자가 Cloudflare 설정과 GitHub Secrets에 직접 넣어요. Claude는 이름과 넣는 곳만 알려 줘요.
- **개인정보:** 사용자의 개인 이메일 주소는 어디에도 공개하지 않아요. 공개 연락처는 vietnamguide708@gmail.com 하나예요.
- **내용 출처:** 가격·운영 시간·입국 규정·카드 조건처럼 바뀌는 정보는 출처를 확인한 것만 넣고 확인한 날짜를 남겨요(예: `CARD_CHECKED`). 모르면 비워 둬요.
- **참고 사이트:** vietnamguide.co.kr은 구성만 참고했고 글·사진은 가져오지 않아요.
- **제휴 링크:** "신청하기" 같은 제휴·광고 링크는 넣지 않아요.
- **사용자가 보내는 사진:** 분위기 참고용이에요. 저작권을 모르니 사이트에 넣지 않아요. 사이트 사진은 `tools/make_*_photos.py`로 만든 것만 써요.
- **용도:** 학교 과제 평가에 쓰는 사이트예요.
- **말투:** 사용자와는 한국어로, 짧고 쉬운 말로 이야기해요. 화면 문구도 같은 말투(해요체)예요.
- **Claude 클라우드 작업 환경의 제약 (2026년 11월 기준):** npm과 이미지 사이트가 막혀 있어서 앱(Capacitor) 빌드는 GitHub Actions에서 해요. GitHub Secrets API도 막혀 있어서 비밀값 등록은 사용자가 해요. `git clone`/`push`와 `gh api`의 Actions 기록 조회는 돼요.

## 6. 최근 작업 (2026년 10월 말~11월)

- 첫 화면 그림(히어로): 투본강 건너편에서 본 호이안. 밝은 화면은 아침, 어두운 화면은 보름달 밤(등불 배, 강에 띄운 연꽃 촛불). 캔버스로 직접 그리고 움직여요(`buildRiver`, `drawSampan`, `paintFrame`). 예전의 저녁 거리 그림은 커밋 `b1d13fb`(마지막으로 들어 있던 버전)에서 꺼낼 수 있어요.
- 스토어 앱: Capacitor 8, 앱 ID `io.github.hyeong030825.vietnamguide`, 로그인·후기·통계 없는 오프라인 앱. 안드로이드 APK·AAB와 iOS 시뮬레이터 빌드는 성공했어요.
- 공항 그랩 타는 곳 (2026-11-08): 노이바이는 2026-08-03부터 주차장 P1/P7, 다낭은 6~7번 자리, 떤선녓은 주차장.
- 여행 준비 탭을 6개 묶음으로 나눔(`PREP_VIEWS`, `#prep-money` 같은 주소로 바로 열기).
- 후에 도시 가이드 추가(도시 9곳), 트래블카드 비교표(2026-11-06 확인), 지도로 도시 고르기.
- 그 전: 구글·카카오·네이버 선택 로그인, 기기 간 동기화, 여행기·장소 후기·사진·댓글, 회화 112개, 통화 12개 계산기, 방문 통계, 네이버 검색 등록.

## 7. 남은 일

- **스토어 출시:** [docs/app-store-guide.md](docs/app-store-guide.md) 순서대로. 개발자 계정 가입과 비밀값 등록은 사용자가 해야 해요. iOS의 TestFlight 업로드는 애플 비밀값이 아직 없어서 실제로 돌려 보지 못했어요. 처음 돌릴 때 실패하면 Actions 기록을 보고 고쳐요.
- **휴대폰 첫 화면:** 아래쪽 큰 배가 검색창에 많이 가려져요. 더 다듬을 수 있어요.
- **정기 확인:** 트래블카드 조건, 관광지 휴관·운영 시간(README의 Sights 메모), 공항 픽업 규칙처럼 자주 바뀌는 정보.
