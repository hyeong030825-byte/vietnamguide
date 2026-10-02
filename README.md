# 베트남 여행 스마트 가이드

실전 회화, 0 떼고 2 나누기 환율 계산기, 고수 빼기 스위치, 문화·에티켓, 긴급 연락처를 담은 한 페이지짜리 여행 가이드 사이트입니다.

## 폴더 구성

| 경로 | 내용 |
| --- | --- |
| `site/index.html` | 실제로 공개되는 파일. Cloudflare Pages가 `site` 폴더를 그대로 올립니다. |
| `site/favicon.*`, `site/*.png` | 사이트 아이콘(브라우저 탭·홈 화면). `tools/make_icons.py`로 다시 만들 수 있어요. |
| `src/page.html` | 화면 구조, 문구, 회화·메뉴 데이터, 동작 스크립트 (수정은 주로 여기서) |
| `src/input.css` | 색상과 공통 스타일 |
| `src/icons.json` | 페이지에 쓰인 아이콘 모음 (빌드할 때 자동 갱신) |
| `build.py` | `src`를 합쳐 `site/index.html`을 만드는 스크립트 |
| `site/_headers` | 보안 헤더 설정 (Cloudflare Pages·Netlify 공통) |
| `netlify.toml` | 예전 호스팅(Netlify) 설정 |
| `site/google*.html` | 구글 서치 콘솔 소유 확인 파일. 지우면 소유 확인이 풀려요. |
| `site/sitemap.xml`, `site/robots.txt` | 검색엔진용 파일 (빌드할 때 자동 생성). 도메인을 바꾸면 `build.py`의 `SITE_URL`을 고치세요. |

## 호스팅

Cloudflare Pages가 이 저장소의 `main` 브랜치를 자동으로 배포합니다. 설정: 빌드 명령 없음, 출력 폴더 `site`.

## 수정하는 방법

**Claude에게 요청하기 (권장)**
Claude와의 대화에서 이 저장소 주소와 함께 바꾸고 싶은 내용을 말하면, Claude가 고친 뒤 저장소에 올리고 Cloudflare Pages가 1~2분 안에 사이트를 자동으로 업데이트합니다.

**GitHub에서 직접 고치기**
`site/index.html`을 GitHub 웹 편집기로 열어 글자를 바꾸고 커밋해도 바로 반영됩니다. 다만 다음에 Claude가 빌드할 때 덮어쓰지 않도록, 직접 고친 내용이 있다면 요청할 때 함께 알려 주세요.

## 문구와 데이터 위치 (`src/page.html`)

- `T` : 버튼·메뉴·안내 문구 (한국어 `ko`, 영어 `en`), 문화 & 에티켓 탭 문장
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
- The Claude page version is written to `build/claude-page.html` (git-ignored). Claude page: https://claude.ai/artifact/CTnwBVkGrjGXhuVpcU2zB3 — publish it with the Artifact tool; it reads the live rate from its db doc `rates/krw_vnd`, refreshed by the scheduled task "베트남 가이드 환율 갱신".
- Original culture & etiquette copy comes from the owner's earlier Readdy site; keep its Korean text unchanged unless asked.
