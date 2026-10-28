#!/usr/bin/env python3
"""베트남 여행 스마트 가이드 빌드 스크립트

    python3 build.py

  site/index.html          Cloudflare Pages가 공개하는 파일 (저장소에 포함, 첫 화면은 미리 그려 둠)
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

# ---- Switches for things that change the privacy policy ----
# "" = not used. "YYYY-MM-DD" = in use from that day. Turning one on adds its ready-made text in src/pages/*.html
# (blocks between <!--if:name--> and <!--end-->; "!name" = while off, "a&b" / "a|b" = both / either), a line in the
# change history and a new revision date. A date after the build day shows an "예정된 변경" notice instead, and the
# matching script is only added from that day, so the site never runs something the policy doesn't describe yet.
POLICY = {
    "analytics": "2026-10-28",  # Cloudflare Web Analytics: visit counts without cookies
    "ads": "",        # Google AdSense
    "affiliate": "",  # booking links that pay a commission
}
POLICY_LABEL = {  # each ends in a vowel, so the notice can say "…를 시작해요"
    "analytics": "방문 통계(Cloudflare Web Analytics)",
    "ads": "광고(Google 애드센스)",
    "affiliate": "숙소·투어 제휴 링크",
}
POLICY_HISTORY = {
    "analytics": "방문 통계(Cloudflare Web Analytics)를 시작하면서 3번 외부 서비스에 내용을 추가했어요.",
    "ads": "광고(Google 애드센스)를 시작하면서 3번 외부 서비스, 5번 쿠키와 맞춤 광고(행태정보), 맞춤 광고 끄는 방법을 추가했어요.",
    "affiliate": "숙소·투어 제휴 링크를 넣으면서 3번 외부 서비스에 내용을 추가했어요.",
}
# Cloudflare → Web Analytics → this site → the token in the JS snippet. Leave "" if the Pages project's own
# "Web Analytics → Enable" switch adds the script (POLICY["analytics"] still has to be set in that case).
CF_ANALYTICS_TOKEN = "e6556d397a5344ed916380f7d1abe626"  # public: it is in every page's HTML
ADSENSE_CLIENT = ""  # "ca-pub-0000000000000000" from AdSense; also writes site/ads.txt
PRIVACY_STARTED, PRIVACY_REVISED = "2026-10-22", "2026-10-27"  # when privacy.html itself last changed
ABOUT_REVISED = "2026-10-27"

# about / privacy / contact: (slug, title, description, date line); bodies in src/pages/<slug>.html
# The about / privacy date lines depend on POLICY and are filled in by page_dates().
PAGES = [
    ("about", "사이트 소개", "베트남 여행 스마트 가이드가 어떤 사이트인지, 어떤 정보를 어떻게 확인해서 담는지 소개해요.",
     None),
    ("privacy", "개인정보처리방침", "베트남 여행 스마트 가이드의 개인정보처리방침이에요. 로그인은 선택이고, 로그인하면 회원 번호와 동기화할 기록, 직접 쓴 후기·여행기와 사진만 저장해요. 사진의 위치 정보는 지워요.",
     None),
    ("contact", "문의", "잘못된 정보 제보, 기능 제안, 제휴 문의는 이메일이나 인스타그램 DM으로 보내 주세요.",
     "최종 수정 2026년 10월 22일"),
]

HEAD_META = """<meta charset="UTF-8">
<link rel="canonical" href="__SITE_URL__/">
<meta name="google-site-verification" content="eFjrRy1QDJ2rNgtwGZyg4DaRtowQSRaqH0nd9Dwhxqw" />
<meta property="og:url" content="__SITE_URL__/">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#100D0C">
<meta name="keywords" content="베트남 여행, 베트남 관광지 주소, 베트남 현지인 맛집, 베트남 길거리 음식, 다낭 호이안 문화체험, 호이안 소원배, 호이안 바구니배, 나트랑 여행, 푸꾸옥 여행, 하노이 여행, 하롱베이 투어, 호치민 여행, 달랏 여행, 베트남 여행 준비물, 베트남 무비자, 베트남 회화, 베트남 동 환율 계산기, 베트남 음식 메뉴판, 베트남 에티켓, 베트남 시장 흥정">
<meta property="og:type" content="website">
<meta property="og:site_name" content="__SITE_NAME__">
<meta property="og:title" content="베트남 여행 스마트 가이드 | 회화·환율·메뉴판·에티켓">
<meta property="og:description" content="현지에서 바로 쓰는 단 한 권의 가이드. 도시별 여행 정보와 현지인 맛집, 문화체험, 회화, 환율 계산, 메뉴판 해독, 매너·안전 팁까지.">
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


def prerender(path):
    """First screen as static HTML (tools/prerender.js, headless Chromium). None if it cannot run."""
    try:
        r = subprocess.run(["node", str(ROOT / "tools" / "prerender.js"), str(path)],
                           capture_output=True, text=True, timeout=120, cwd=ROOT)
    except (OSError, subprocess.TimeoutExpired) as e:
        print(f"prerender skipped: {e}")
        return None
    if r.returncode != 0 or "<section" not in r.stdout:
        print("prerender skipped: " + (r.stderr.strip() or "no output")[:300])
        return None
    return r.stdout


def kdate(iso):
    y, m, d = (int(x) for x in iso.split("-"))
    return f"{y}년 {m}월 {d}일"


def policy_check(today):
    """Stop the build if a switch is malformed or a script would run without its policy text."""
    for name, day in POLICY.items():
        if day:
            datetime.date.fromisoformat(day)
    if CF_ANALYTICS_TOKEN and not POLICY["analytics"]:
        raise SystemExit('CF_ANALYTICS_TOKEN is set but POLICY["analytics"] is off: set its start date first.')
    if ADSENSE_CLIENT and not POLICY["ads"]:
        raise SystemExit('ADSENSE_CLIENT is set but POLICY["ads"] is off: set its start date first.')
    if ADSENSE_CLIENT and not re.fullmatch(r"ca-pub-\d{16}", ADSENSE_CLIENT):
        raise SystemExit('ADSENSE_CLIENT should look like "ca-pub-0000000000000000".')
    if POLICY["ads"] and POLICY["ads"] <= today and not ADSENSE_CLIENT:
        print('note: POLICY["ads"] is on but ADSENSE_CLIENT is empty, so no ad script is added.')


def page_dates(today):
    """Date lines for the about / privacy pages: the text's own date or the latest switch already in effect."""
    live = [day for day in POLICY.values() if day and day <= today]
    about_live = [POLICY[k] for k in ("ads", "affiliate") if POLICY[k] and POLICY[k] <= today]
    return {
        "about": f"최종 수정 {kdate(max([ABOUT_REVISED] + about_live))}",
        "privacy": f"시행일 {kdate(PRIVACY_STARTED)} · 최종 개정 {kdate(max([PRIVACY_REVISED] + live))}",
    }


def apply_policy(text, today, live_only=False):
    """Keep or drop the <!--if:…--> blocks, fill {{since:name}}, the change notice and the history lines.
    live_only: a switch dated after today counts as off (pages other than the policy, which announces it early)."""
    def cond(expr):
        if "|" in expr:
            return any(cond(e) for e in expr.split("|"))
        if "&" in expr:
            return all(cond(e) for e in expr.split("&"))
        name = expr.lstrip("!")
        if name not in POLICY:
            raise SystemExit(f"unknown policy switch in src/pages: {name}")
        on = bool(POLICY[name]) and not (live_only and POLICY[name] > today)
        return on != expr.startswith("!")

    def block(m):
        lead, expr, body, tail = m.group(1), m.group(2), m.group(3), m.group(4)
        if cond(expr):
            return (lead or "") + body + (tail or "")
        return "" if lead is not None and tail else (lead or "")  # a block on its own line leaves no blank line

    text = re.sub(r"(^[ \t]*)?<!--if:([!\w&|]+)-->(.*?)<!--end-->([ \t]*\n)?", block, text, flags=re.S | re.M)
    if "<!--if:" in text or "<!--end-->" in text:
        raise SystemExit("unmatched <!--if:…--> / <!--end--> in src/pages (blocks can't be nested)")
    text = re.sub(r"\{\{since:(\w+)\}\}", lambda m: f"({kdate(POLICY[m.group(1)])}부터)" if POLICY[m.group(1)] else "", text)

    soon = sorted((day, name) for name, day in POLICY.items() if day and day > today)
    notice = ""
    if soon:
        items = "".join(f"<li>{kdate(day)}부터 {POLICY_LABEL[name]}를 시작해요.</li>" for day, name in soon)
        notice = ('<div class="note-box">\n  <p><strong>예정된 변경</strong></p>\n  <ul>' + items + "</ul>\n"
                  "  <p>바뀌는 내용은 아래 해당 항목에 시작 날짜와 함께 미리 적어 두었어요.</p>\n</div>\n")
    text = text.replace("{{POLICY_NOTICE}}\n", notice)
    history = "".join(f"  <li>{kdate(day)}: {POLICY_HISTORY[name]}</li>\n"
                      for day, name in sorted(((d, n) for n, d in POLICY.items() if d), reverse=True))
    return text.replace("{{POLICY_HISTORY}}\n", history)


def site_scripts(today):
    """Third-party scripts for the public site, only once their policy switch is in effect."""
    tags = ""
    if CF_ANALYTICS_TOKEN and POLICY["analytics"] and POLICY["analytics"] <= today:
        tags += ("<script defer src=\"https://static.cloudflareinsights.com/beacon.min.js\" "
                 f"data-cf-beacon='{{\"token\": \"{CF_ANALYTICS_TOKEN}\"}}'></script>\n")
    if ADSENSE_CLIENT and POLICY["ads"] and POLICY["ads"] <= today:
        tags += (f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADSENSE_CLIENT}" '
                 'crossorigin="anonymous"></script>\n')
    return tags


def page_links(for_site):
    """Where the footer links point: pretty URLs on the site, plain files next to the artifact page."""
    links = {slug: (f"/{slug}" if for_site else f"{slug}.html") for slug, *_ in PAGES}
    links["home"] = "/" if for_site else "index.html"
    return links


def build_pages(css, for_site, today):
    """Static about / privacy / contact pages. Returns {file name: html}."""
    layout = (ROOT / "src" / "pages" / "layout.html").read_text(encoding="utf-8")
    dates = page_dates(today)
    scripts = site_scripts(today) if for_site else ""
    links = page_links(for_site)
    nav = " ".join(f'<a href="{links[slug]}" class="hover:text-accent-400 hover:underline">{title}</a>'
                   for slug, title, *_ in PAGES)
    out = {}
    for slug, title, desc, updated in PAGES:
        updated = dates.get(slug, updated)
        body = apply_policy((ROOT / "src" / "pages" / f"{slug}.html").read_text(encoding="utf-8"), today,
                            live_only=slug != "privacy")
        canonical = f'<link rel="canonical" href="{SITE_URL}/{slug}">\n' if for_site else ""
        html = (layout.replace("{{BODY}}", body.rstrip()).replace("{{TITLE}}", title).replace("{{DESC}}", desc)
                .replace("{{UPDATED}}", updated).replace("{{CANONICAL}}", canonical).replace("{{NAV}}", nav)
                .replace("{{CSS}}", css))
        html = (html.replace("{{HOME}}", links["home"]).replace("{{ABOUT}}", links["about"])
                .replace("{{PRIVACY}}", links["privacy"]).replace("{{CONTACT}}", links["contact"]))
        if scripts:
            html = html.replace("</head>", scripts + "</head>", 1)
        out[f"{slug}.html"] = html
    return out


def link_footer(page, for_site):
    links = page_links(for_site)
    for slug, *_ in PAGES:
        page = page.replace(f"__LINK_{slug}__", links[slug])
    return page


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
    (BUILD / "claude-page.html").write_text(link_footer(page, False), encoding="utf-8")
    (BUILD / "pages").mkdir(exist_ok=True)
    today = datetime.date.today().isoformat()
    policy_check(today)
    for name, html in build_pages(css, False, today).items():
        (BUILD / "pages" / name).write_text(html, encoding="utf-8")
    for name, html in build_pages(css, True, today).items():
        (SITE / name).write_text(html, encoding="utf-8")
    page = link_footer(page, True)

    # Public site: full document.
    cut = page.index('<div id="root">')
    head_part = page[:cut].replace("<title>베트남 여행 스마트 가이드</title>",
                                   "<title>베트남 여행 스마트 가이드 | 회화·환율·메뉴판·에티켓</title>")
    head_meta = HEAD_META.replace("__SITE_URL__", SITE_URL).replace("__SITE_NAME__", SITE_NAME) + site_name_jsonld()
    site = ("<!DOCTYPE html>\n<html lang=\"ko\">\n<head>\n" + head_meta + head_part +
            "</head>\n<body>\n" + page[cut:] + "\n</body>\n</html>\n")
    (SITE / "index.html").write_text(site, encoding="utf-8")

    # Search engines that do not run JavaScript (Naver) only see the static HTML, and #main is empty
    # until the script runs. Put the first screen (도시별 여행 · 다낭) in it; the script replaces it on load.
    pre = prerender(SITE / "index.html")
    empty_main = '<main id="main" class="w-full max-w-5xl mx-auto px-4 py-6 flex-1 pb-28 md:pb-10"></main>'
    if pre and empty_main in site:
        site = site.replace(empty_main, empty_main.replace("></main>", ">" + pre + "</main>"))
        (SITE / "index.html").write_text(site, encoding="utf-8")

    # Analytics / ad scripts go in after the prerender, so building never loads them.
    scripts = site_scripts(today)
    if scripts:
        site = site.replace("</head>", scripts + "</head>", 1)
        (SITE / "index.html").write_text(site, encoding="utf-8")
    ads_txt = SITE / "ads.txt"
    if ADSENSE_CLIENT and POLICY["ads"] and POLICY["ads"] <= today:
        ads_txt.write_text(f"google.com, {ADSENSE_CLIENT.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n", encoding="utf-8")
    elif ads_txt.exists():
        ads_txt.unlink()

    # Search engines: sitemap + robots
    (SITE / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f'  <url>\n    <loc>{SITE_URL}/</loc>\n    <lastmod>{today}</lastmod>\n  </url>\n' +
        "".join(f'  <url>\n    <loc>{SITE_URL}/{slug}</loc>\n  </url>\n' for slug, *_ in PAGES) +
        '</urlset>\n', encoding="utf-8")
    (SITE / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")

    print(f"site/index.html {len(site.encode()) / 1024:.1f} KB · icons {len(icons)}" +
          (f" · MISSING ICONS: {missing}" if missing else ""))


if __name__ == "__main__":
    main()
