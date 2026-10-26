# 베트남 여행 스마트 가이드

실전 회화, 0 떼고 2 나누기 환율 계산기, 고수 빼기 스위치, 문화·에티켓, 긴급 연락처를 담은 한 페이지짜리 여행 가이드 사이트입니다.

## 폴더 구성

| 경로 | 내용 |
| --- | --- |
| `site/index.html` | 실제로 공개되는 파일. Cloudflare Pages가 `site` 폴더를 그대로 올립니다. |
| `site/favicon.*`, `site/*.png` | 사이트 아이콘(브라우저 탭·홈 화면). `tools/make_icons.py`로 다시 만들 수 있어요. |
| `site/img/food/*.webp` | 메뉴판 사진 (640×480). 원본에서 `tools/make_food_photos.py`로 만들어요. 메뉴 id와 파일 이름이 같아야 해요. |
| `site/img/exp/*.webp` | 문화체험 카드 사진 (16:9, 960×540). 파일 이름은 체험 id(예: `lanternboat.webp`)와 같게 하고, `EXP_PHOTOS`에 id를 적어야 보여요. |
| `src/page.html` | 화면 구조, 문구, 회화·메뉴 데이터, 동작 스크립트 (수정은 주로 여기서) |
| `src/input.css` | 색상과 공통 스타일. 어두운 화면(기본)과 밝은 화면 색이 같은 이름의 변수로 두 벌 있어요. |
| `src/icons.json` | 페이지에 쓰인 아이콘 모음 (빌드할 때 자동 갱신) |
| `build.py` | `src`를 합쳐 `site/index.html`을 만드는 스크립트 |
| `site/_headers` | 보안 헤더 설정 (Cloudflare Pages·Netlify 공통) |
| `netlify.toml` | 예전 호스팅(Netlify) 설정 |
| `site/google*.html` | 구글 서치 콘솔 소유 확인 파일. 지우면 소유 확인이 풀려요. |
| `site/sitemap.xml`, `site/robots.txt` | 검색엔진용 파일 (빌드할 때 자동 생성). 도메인을 바꾸면 `build.py`의 `SITE_URL`을 고치세요. |

## 호스팅

공개 주소: https://vietnamguide.pages.dev

Cloudflare Pages(프로젝트 이름 `vietnamguide`)가 이 저장소의 `main` 브랜치를 자동으로 배포합니다. 설정: 빌드 명령 없음, 출력 폴더 `site`.
예전 주소 https://vietnamguides.netlify.app 은 `netlify.toml`의 설정으로 새 주소로 넘어갑니다 (Netlify가 다시 배포될 때 적용).

## 수정하는 방법

**Claude에게 요청하기 (권장)**
Claude와의 대화에서 이 저장소 주소와 함께 바꾸고 싶은 내용을 말하면, Claude가 고친 뒤 저장소에 올리고 Cloudflare Pages가 1~2분 안에 사이트를 자동으로 업데이트합니다.

**GitHub에서 직접 고치기**
`site/index.html`을 GitHub 웹 편집기로 열어 글자를 바꾸고 커밋해도 바로 반영됩니다. 다만 다음에 Claude가 빌드할 때 덮어쓰지 않도록, 직접 고친 내용이 있다면 요청할 때 함께 알려 주세요.

## 문구와 데이터 위치 (`src/page.html`)

- `T` : 버튼·메뉴·안내 문구 (한국어 `ko`, 영어 `en`), 문화 & 에티켓 문장
- `CITIES` : 문화체험 탭의 도시별 여행 정보 6곳 (다낭·호이안, 나트랑, 푸꾸옥, 하노이·하롱베이, 호치민, 달랏). 가는 법·공항에서 시내·여행 시기·일정·숙소·이동·음식·팁. `aka`는 체험 카드를 찾을 때 쓰는 도시 이름, `k`는 도시 바로가기 검색어예요.
- `GIFT_PHOTOS` : 사진이 있는 기념품 id. 사진은 `site/img/gift/<id>.webp`(16:9, 800x450)이고 `python3 tools/make_gift_photos.py <원본 폴더>`로 만들어요.
- `GIFTS`, `GIFT_CUSTOMS` : 문화체험 탭의 기념품 추천(카테고리 coffee·food·craft, 특산 도시 `city`)과 한국 입국 면세 한도·반입 금지 안내. 가격은 마트·브랜드 매장 기준이에요.
- `EATS` : 도시별 현지인 맛집(길거리 식당). 하노이·호치민·다낭은 미쉐린 가이드 2026 수록 집(`mich`: `bib` 빕 구르망, `sel` 수록)에서, 나머지는 2025~2026년 베트남 여행 기사에서 골랐어요. 영업시간 `hours`·가격 `price`는 출처가 있는 것만 넣고, 없으면 빼 둬요(카드에서 줄이 사라져요). `dish`는 메뉴판(`DISHES`) id로 '메뉴판에서 보기' 링크가 돼요. 북마크는 `r:` 접두어예요.
- `MARKET_PHRASES` : 문화 & 에티켓의 '전통시장 바가지 · 사기 피하는 법' 카드에 나오는 시장 회화(존댓말 em / 반말 tôi). 카드 문구는 `c_mk*` 키예요.
- `SPOTS` : 도시별 유명 관광지 (`city`로 도시를 정해요). 주소 `addr`는 베트남어로, 2025년 7월 행정구역 개편 뒤의 새 동 이름을 확인된 곳만 적었어요. 운영 시간·입장료 `info`는 확인된 것만 넣고 모르면 비워 둬요.
- `EXPERIENCES` : 도시별 체험 카드 (`city`로 도시를 정해요). 가격의 `{krw:150000}`은 실시간 환율로 원화가 표시되는 자리예요. `EXP_PHOTOS`에 사진이 있는 체험 id를 적어요.
- `PREP_ENTRY`, `PREP_BAN`, `PREP_LIFE`, `PREP_MONEY`, `PREP_WEATHER`, `PREP_CHECK` : 여행 준비 탭 (입국 규정, 반입 금지, 생활 정보, 환전·ATM, 날씨, 체크리스트)
- `PHRASES` : 실전 회화 (존댓말/반말, 한글 발음)
- `DISHES`, `WORDS`, `SWITCHES` : 음식 메뉴, 메뉴판 단어, 고수 빼기 스위치
- `MISSIONS`, `CALL_CENTER` : 대사관·총영사관·영사콜센터 연락처
- `DEFAULT_RATE` : 실시간 환율을 못 불러올 때 쓰는 기본 환율 (1,000동당 원)

## 환율

공개 사이트는 열 때마다 공개 환율 API(ExchangeRate-API, 실패 시 Currency API)에서 최신 원/동 환율을 직접 불러옵니다.

---

### Notes for Claude (maintenance)

- Source of truth is `src/page.html` + `src/input.css`. Run `python3 build.py` after every change, then commit both `src/` and `site/index.html`.
- Before building, check whether `site/index.html` was edited by hand on GitHub (compare it with a fresh build of the current `src`); port any manual edits into `src/page.html` first so they are not overwritten.
- Tailwind v3.4.17 standalone CLI is downloaded to `bin/` on first build (git-ignored). Icons come from react-icons (Remix) / Font Awesome Free when available, else from `src/icons.json`; a new icon name that is in neither source is reported as MISSING.
- Hosting: Cloudflare Pages project `vietnamguide` (https://vietnamguide.pages.dev), output dir `site`, no build command. Netlify (vietnamguides.netlify.app) is retired; its netlify.toml only 301-redirects to the new URL. Netlify free credits ran out in Oct 2026, so avoid relying on it.
- Site name in Google results: `SITE_NAME` / `SITE_ALT_NAMES` in build.py feed `og:site_name` and the home page's `WebSite` JSON-LD. Without it Google labels pages.dev results "Cloudflare". Check the JSON-LD with validator.schema.org (the Rich Results Test does not support site names).
- Google Search Console / Naver: use the HTML meta-tag method (put tags in `HEAD_META` in build.py). Cloudflare Pages 308-redirects `/x.html` to `/x`, so file-based verification can fail.
- The Claude page version is written to `build/claude-page.html` (git-ignored). Claude page: https://claude.ai/artifact/CTnwBVkGrjGXhuVpcU2zB3 — publish it with the Artifact tool; it reads the live rate from its db doc `rates/krw_vnd`, refreshed by the scheduled task "베트남 가이드 환율 갱신".
- Original culture & etiquette copy comes from the owner's earlier Readdy site; keep its Korean text unchanged unless asked.
- Themes (Oct 2026): dark is the default; `<html data-theme="light">` swaps the token values in `src/input.css` (300/400 of the colour scales become darker text inks in light, 500 stays the fill). Elements with class `theme-dark` (hero painting, footer, logo, banknote tiles) keep dark tokens in both themes. A tiny `<script data-boot="theme">` in the head applies the saved theme before first paint; build.py splits on the exact string `<script>`, so any extra head script must carry an attribute.
- 문화체험 views: `state.expView` = 'city' | 'culture' | 'gift'; `#culture` and `#gift` (and `setTab('culture'|'gift')`) open those views. Souvenir prices and Korea import rules were checked Oct 2026; recheck yearly (the 2025 alcohol rule change: 2 L / USD 400, no bottle limit).
- Tabs (Oct 19, 2026): 긴급 상황 holds emergency numbers, missions and SOS phrases only; the hotel/memo notes card (`notesCard()`, ids note-name/note-addr/note-memo) lives at the end of 여행 준비.
- Tabs (Oct 2026): 문화체험 (`exp`) holds two views, 도시별 여행 (`state.expView = 'city'`) and 문화 & 에티켓 (`'culture'`, the old culture tab). `setTab('culture')`, `#culture` and a saved `culture` tab all open the etiquette view, so old links keep working.
- Local eats (`EATS`): prices and hours change often; recheck every few months (Michelin Guide Vietnam is updated each June). Bánh Cuốn Thanh Vân is listed by street only (Hàng Gà) because sources give different house numbers.
- Sights (`SPOTS`): Hồ Chí Minh Mausoleum is closed 4 Sep–2 Nov 2026; VinWonders Nha Trang cable car is closed 26 Oct–10 Nov 2026; Saigon Notre-Dame is still under restoration. Remove or update these notes after the dates pass.
- City facts were checked in Oct 2026. Time-sensitive ones to recheck: Đà Lạt–Incheon flights (expected from Dec 2026), Long Thành airport (opens Dec 2026, international flights move in phases to 2028), Bà Nà Hills and Hòn Thơm cable car 2026 price lists, Phú Quốc VinBus fares, Hanoi Train Street access.

## 검색엔진용 첫 화면 미리 그리기

`python3 build.py`는 마지막에 `tools/prerender.js`(Playwright)로 페이지를 한 번 열어 첫 화면(도시별 여행 · 다낭)을 `site/index.html`의 `<main>` 안에 HTML로 넣어 둬요. 자바스크립트를 실행하지 않는 검색 로봇(네이버 등)도 내용을 읽을 수 있게 하려는 것이고, 실제 방문자 화면은 스크립트가 바로 다시 그려요. Playwright가 없는 환경에서는 이 단계만 건너뛰어요.

## 사이트 소개 · 개인정보처리방침 · 문의 페이지

`src/pages/`의 `about.html`, `privacy.html`, `contact.html`(본문)과 `layout.html`(공통 틀)로 `site/about.html` 등을 만들어요. 제목·설명·수정일은 `build.py`의 `PAGES`에 있어요. 공개 연락처는 vietnamguide708@gmail.com 이에요. 방문 통계·광고·로그인처럼 정보를 모으는 기능을 넣을 때는 `privacy.html`을 먼저 고치고 시행일을 바꿔요.

## 로그인 · 동기화 · 후기 (Cloudflare Pages Functions + D1)

- 서버 코드: `functions/api/*` (Cloudflare Pages가 GitHub에서 자동 배포), 공용 코드 `server/lib.js`, `server/oauth.js`.
- 화면: `src/page.html`의 `login · sync · reviews` 부분. `/api/config`가 `{app: "vietnamguide", providers: [...]}`를 돌려줄 때만 로그인 버튼과 후기 버튼이 보여요. 키를 넣기 전이나 Claude 페이지·파일로 열 때는 숨겨져요.
- Cloudflare 설정 (Workers & Pages → vietnamguide → Settings)
  - Bindings: D1 database, 이름 `DB` → `vietnamguide-db` (표는 처음 요청 때 자동으로 만들어져요)
  - Variables and Secrets (Encrypt): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` / `KAKAO_REST_API_KEY`(+ Client Secret을 켰다면 `KAKAO_CLIENT_SECRET`) / `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` / 관리자 회원 id를 쉼표로 `ADMIN_USER_IDS` (관리자는 남의 후기도 지울 수 있어요. 내 id는 로그인 후 `/api/me`에서 확인)
- 로그인 앱의 Redirect/Callback URL: `https://vietnamguide.pages.dev/api/auth/<google|kakao|naver>/callback`. 도메인을 바꾸면 새 주소를 추가로 등록해요.
- 저장하는 정보: 로그인 서비스 회원 번호, 닉네임, 동기화 기록(북마크·메모·체크리스트·단어장), 후기·신고. 이메일·전화번호는 받지 않아요. 바꾸면 `src/pages/privacy.html`도 같이 고쳐요.
- 로컬 테스트: `node tools/dev_server.mjs 8788` → http://localhost:8788 (D1 대신 node:sqlite, 가짜 구글·카카오·네이버. 코드 값이 그대로 사용자 id가 돼요)
