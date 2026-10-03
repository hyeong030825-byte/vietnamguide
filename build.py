#!/usr/bin/env python3
"""베트남 여행 스마트 가이드 빌드 스크립트

    python3 build.py

  site/index.html          Netlify가 공개하는 파일 (저장소에 포함)
  build/claude-page.html   Claude 페이지(아티팩트)용 사본 (저장소에는 올리지 않음)

src/page.html   화면 구조·문구·데이터·스크립트. 수정은 대부분 여기서 합니다.
src/input.css   색상 토큰과 공통 스타일
src/icons.json  페이지에 쓰인 아이콘 SVG 캐시 (빌드할 때 자동 갱신)
"""
import datetime
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent
# 공개 주소. 도메인을 사서 연결하면 여기만 바꾸고 다시 빌드하세요.
SITE_URL = "https://vietnamguide.pages.dev"
# 구글 검색결과에 보일 사이트 이름과 별칭 (홈페이지의 WebSite 구조화 데이터·og:site_name).
# 이게 없으면 구글이 pages.dev 주소의 사이트 이름을 'Cloudflare'로 표시합니다.
SITE_NAME = "베트남 여행 스마트 가이드"
SITE_ALT_NAMES = ["베트남 스마트 가이드"]
SRC = ROOT / "src" / "page.html"
CSS_IN = ROOT / "src" / "input.css"
ICON_CACHE = ROOT / "src" / "icons.json"
TW = ROOT / "bin" / "tailwindcss"
TW_URL = "https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.17/tailwindcss-linux-x64"
RI_JS = pathlib.Path("/opt/npm-tools/node_modules/react-icons/ri/index.js")
FA_DIR = pathlib.Path("/opt/npm-tools/node_modules/@fortawesome/fontawesome-free/svgs/solid")
SITE = ROOT / "site"
BUILD = ROOT / "build"

HEAD_META = """<meta charset="UTF-8">
<link rel="canonical" href="__SITE_URL__/">
<meta name="google-site-verification" content="eFjrRy1QDJ2rNgtwGZyg4DaRtowQSRaqH0nd9Dwhxqw" />
<meta property="og:url" content="__SITE_URL__/">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#100D0C">
<meta name="keywords" content="베트남 여행, 베트남 여행 준비물, 베트남 무비자, 베트남 회화, 베트남 동 환율 계산기, 베트남 음식 메뉴판, 베트남 에티켓">
<meta property="og:type" content="website">
<meta property="og:site_name" content="__SITE_NAME__">
<meta property="og:title" content="베트남 여행 스마트 가이드 | 회화·환율·메뉴판·에티켓">
<meta property="og:description" content="현지에서 바로 쓰는 단 한 권의 가이드. 회화, 환율 계산, 메뉴판 해독, 매너·안전 팁까지.">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="베트남 여행 스마트 가이드">
<meta name="twitter:description" content="회화·환율·메뉴판·에티켓을 한눈에. 현지에서 바로 쓰는 실전 가이드.">
"""


def site_name_jsonld():
    """Google site name: https://developers.google.com/search/docs/appearance/site-names"""
    data = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": SITE_NAME,
        # 마지막 별칭은 도메인(소문자): 이름이 채택되지 않을 때 'Cloudflare' 대신 쓰이도록.
        "alternateName": SITE_ALT_NAMES + [SITE_URL.split("://", 1)[1].lower()],
        "url": SITE_URL + "/",
        "inLanguage": "ko-KR",
    }
    return ('<script type="application/ld+json">' +
            json.dumps(data, ensure_ascii=False).replace("</", "<\\/") + "</script>\n")


def ensure_tailwind():
    if not TW.exists():
        TW.parent.mkdir(exist_ok=True)
        subprocess.run(["curl", "-sSL", "-o", str(TW), TW_URL], check=True)
        TW.chmod(0o755)


def kebab(k):
    return re.sub(r"([A-Z])", lambda m: "-" + m.group(1).lower(), k)


def render(node):
    attrs = "".join(f' {kebab(k)}="{v}"' for k, v in node.get("attr", {}).items())
    kids = "".join(render(c) for c in node.get("child", []))
    return f"<{node['tag']}{attrs}>{kids}</{node['tag']}>" if kids else f"<{node['tag']}{attrs}/>"


_ri_src = None


def ri_icon(name):
    global _ri_src
    if not RI_JS.exists():
        return None
    if _ri_src is None:
        _ri_src = RI_JS.read_text(encoding="utf-8")
    comp = "Ri" + "".join(p if p.isdigit() else p.capitalize() for p in name.split("-")[1:])
    m = re.search(r"module\.exports\." + comp + r" = function " + comp +
                  r" \(props\) \{\s*return GenIcon\((\{.*?\})\)\(props\);", _ri_src, re.S)
    if not m:
        return None
    tree = json.loads(m.group(1))
    return {"v": tree["attr"].get("viewBox", "0 0 24 24"), "p": "".join(render(c) for c in tree.get("child", []))}


def fa_icon(name):
    f = FA_DIR / (name[3:] + ".svg")
    if not f.exists():
        return None
    s = f.read_text(encoding="utf-8")
    inner = re.search(r"<svg[^>]*>(.*)</svg>", s, re.S).group(1)
    inner = re.sub(r"<!--.*?-->", "", inner, flags=re.S).strip()
    return {"v": re.search(r'viewBox="([^"]+)"', s).group(1), "p": inner, "fa": 1}


def collect_icons(src):
    cache = json.loads(ICON_CACHE.read_text(encoding="utf-8")) if ICON_CACHE.exists() else {}
    names = set(re.findall(r"(?<![\w-])(ri-[a-z0-9]+(?:-[a-z0-9]+)*)", src))
    names |= set(re.findall(r"(?<![\w-])(fa-[a-z0-9]+(?:-[a-z0-9]+)*)", src)) - {"fa-solid"}
    icons, missing = {}, []
    for name in sorted(names):
        d = ri_icon(name) if name.startswith("ri-") else fa_icon(name)
        d = d or cache.get(name)
        if d:
            icons[name] = d
        elif name.startswith(("ri-", "fa-")):
            missing.append(name)
    ICON_CACHE.write_text(json.dumps(icons, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    return icons, missing


def main():
    ensure_tailwind()
    BUILD.mkdir(exist_ok=True)
    SITE.mkdir(exist_ok=True)
    src = SRC.read_text(encoding="utf-8")

    subprocess.run([str(TW), "-c", str(ROOT / "tailwind.config.js"), "-i", str(CSS_IN),
                    "-o", str(BUILD / "tw.css"), "--minify"], check=True, cwd=ROOT, capture_output=True)
    css = (BUILD / "tw.css").read_text(encoding="utf-8")

    icons, missing = collect_icons(src)

    def svg(name):
        d = icons[name]
        return (f'<svg class="ico{" fa" if d.get("fa") else ""}" viewBox="{d["v"]}" '
                f'aria-hidden="true" focusable="false">{d["p"]}</svg>')

    head, script = src.split("<script>", 1)

    def fill(m):
        for c in m.group(1).split():
            if c in icons:
                return f'<i class="{m.group(1)}" aria-hidden="true">{svg(c)}</i>'
        return m.group(0)

    head = re.sub(r'<i class="([^"]*)"></i>', fill, head)
    page = (head + "<script>" + script).replace("/*__TAILWIND__*/", css).replace(
        "/*__ICONS__*/{}", json.dumps(icons, ensure_ascii=False, separators=(",", ":")))

    # Claude page (artifact): body content only; the host adds doctype/head.
    (BUILD / "claude-page.html").write_text(page, encoding="utf-8")

    # Public site: full document.
    cut = page.index('<div id="root">')
    head_part = page[:cut].replace("<title>베트남 여행 스마트 가이드</title>",
                                   "<title>베트남 여행 스마트 가이드 | 회화·환율·메뉴판·에티켓</title>")
    head_meta = HEAD_META.replace("__SITE_URL__", SITE_URL).replace("__SITE_NAME__", SITE_NAME) + site_name_jsonld()
    site = ("<!DOCTYPE html>\n<html lang=\"ko\">\n<head>\n" + head_meta + head_part +
            "</head>\n<body>\n" + page[cut:] + "\n</body>\n</html>\n")
    (SITE / "index.html").write_text(site, encoding="utf-8")

    # Search engines: sitemap + robots
    today = datetime.date.today().isoformat()
    (SITE / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f'  <url>\n    <loc>{SITE_URL}/</loc>\n    <lastmod>{today}</lastmod>\n  </url>\n'
        '</urlset>\n', encoding="utf-8")
    (SITE / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")

    print(f"site/index.html {len(site.encode()) / 1024:.1f} KB · icons {len(icons)}" +
          (f" · MISSING ICONS: {missing}" if missing else ""))


if __name__ == "__main__":
    main()
