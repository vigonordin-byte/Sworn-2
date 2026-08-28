#!/usr/bin/env python3
"""Generate the public Terms, Privacy and Support pages from the in-app text.

App Store Connect needs a Privacy Policy URL and a Support URL on the open web,
and the app already carries all three documents. Copying them into HTML by hand
would guarantee the two drift apart, and a privacy policy that disagrees with
the app is worse than none — so the pages are generated from the same source
the app renders, and regenerated whenever that source changes.

    python3 tools/build-legal-pages.py
"""
import re, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC  = ROOT / "home.js"
OUT  = ROOT / "docs"

PAGES = {"privacy": "Privacy Policy", "terms": "Terms of Service", "support": "Support"}

SHELL = """<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} — Sworn</title>
<style>
  :root {{ color-scheme: light dark; }}
  body {{
    margin: 0 auto; padding: 48px 22px 96px; max-width: 40rem;
    font: 17px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #fff; color: #16161a;
  }}
  @media (prefers-color-scheme: dark) {{ body {{ background: #0d0d0f; color: #ececf0; }} }}
  .brand {{ font-size: 13px; letter-spacing: .32em; text-transform: uppercase; opacity: .5; }}
  h1 {{ font-size: 30px; letter-spacing: -.4px; margin: 10px 0 28px; }}
  h3 {{ font-size: 18px; margin: 34px 0 8px; }}
  p {{ margin: 0 0 14px; text-wrap: pretty; }}
  .doc-meta {{ font-size: 14px; opacity: .55; }}
  nav {{ margin-top: 56px; font-size: 15px; opacity: .7; }}
  nav a {{ color: inherit; margin-right: 18px; }}
</style>
</head><body>
<div class="brand">Sworn</div>
<h1>{title}</h1>
{body}
<nav>{nav}</nav>
</body></html>
"""


def extract(source, key):
    """Pull one entry out of the DOCS object: key: ['TITLE', `...html...`]."""
    m = re.search(rf"\n  {key}: \['[^']*', `(.*?)`\],?\n", source, re.S)
    if not m:
        raise SystemExit(f"could not find the '{key}' document in home.js")
    return m.group(1).strip()


def main():
    source = SRC.read_text(encoding="utf-8")
    OUT.mkdir(exist_ok=True)

    for key, title in PAGES.items():
        nav = " ".join(
            f'<a href="{k}.html">{t}</a>' for k, t in PAGES.items() if k != key
        )
        (OUT / f"{key}.html").write_text(
            SHELL.format(title=title, body=extract(source, key), nav=nav),
            encoding="utf-8")
        print(f"docs/{key}.html")

    links = "\n".join(f'<p><a href="{k}.html">{t}</a></p>' for k, t in PAGES.items())
    (OUT / "index.html").write_text(
        SHELL.format(title="Sworn", body=links, nav=""), encoding="utf-8")
    print("docs/index.html")
    print(f"\nGenerated {datetime.date.today()}. Re-run after editing DOCS in home.js.")


if __name__ == "__main__":
    main()
