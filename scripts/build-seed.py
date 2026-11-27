"""Builds lib/seed.json from the top-200 product CSV.

Usage: python3 scripts/build-seed.py path/to/apm-top-200-products-2026.csv
Groups the detailed categories into a small set of sections for the gallery and drops duplicate websites.
"""
import csv, json, re, sys
from collections import Counter
from pathlib import Path

SECTIONS = [  # (section, keywords matched against the detailed category, lower-case)
    ("AI products", ["ai", "llm"]),
    ("Food & quick commerce", ["quick commerce", "food", "grocery", "meat", "dairy", "restaurant"]),
    ("Fintech & payments", ["fintech", "payment", "upi", "bank", "neobank", "bnpl", "invest", "insur", "lending", "credit", "wealth", "trading", "crypto", "rewards"]),
    ("Shopping & e-commerce", ["commerce", "d2c", "retail", "fashion", "beauty", "eyewear", "resale", "marketplace"]),
    ("Travel & mobility", ["travel", "mobility", "ride", "bus", "hospitality", "hotel", "airline", "ev", "car", "maps"]),
    ("Media & entertainment", ["ott", "streaming", "music", "audio", "video", "entertainment", "ticketing", "news", "podcast"]),
    ("Social, dating & messaging", ["social", "dating", "messaging", "community", "creator"]),
    ("Work & productivity", ["productivity", "workplace", "collaboration", "saas", "crm", "design", "notes", "hr", "jobs", "recruit"]),
    ("Developer & data tools", ["dev", "cloud", "infra", "data", "api", "security", "no-code", "app builder"]),
    ("Learning", ["edtech", "learning", "education", "language"]),
    ("Health & fitness", ["health", "fitness", "wellness", "medical", "pharmacy", "mental"]),
    ("Gaming & sports", ["gaming", "game", "fantasy", "sports"]),
    ("Devices & hardware", ["hardware", "wearable", "device", "electronics", "appliance"]),
    ("Telecom & public platforms", ["telecom", "public", "government", "platform"]),
]

def section_for(cat: str) -> str:
    c = cat.lower()
    for name, kws in SECTIONS:
        for kw in kws:
            if re.search(r"(^|[^a-z])" + re.escape(kw) + r"([^a-z]|$)", c):
                return name
    return "Other"

def domain_of(site: str) -> str:
    s = site.strip().lower()
    s = re.sub(r"^https?://", "", s).split("/")[0]
    return s[4:] if s.startswith("www.") else s

rows = list(csv.DictReader(open(sys.argv[1], encoding="utf-8")))
# A few products share a domain (Amazon and Kindle). They get a unique key: domain plus a short path tag.
KEY_OVERRIDES = {"microsoft.com/microsoft-teams": "teams.microsoft.com"}
dom_count = Counter(domain_of(r["Website"]) for r in rows)
seen, out = set(), []
for r in rows:
    site = r["Website"].strip().lower()
    d = domain_of(site)
    path = re.sub(r"^https?://", "", site).split("/", 1)[1:] or [""]
    tag = re.sub(r"[^a-z0-9]+", "-", path[0].replace("apple-", "").replace("microsoft-", "")).strip("-")
    key = KEY_OVERRIDES.get(re.sub(r"^www\\.", "", re.sub(r"^https?://", "", site)), d if not tag or dom_count[d] == 1 else f"{d}-{tag}")
    if not d or key in seen:
        continue
    seen.add(key)
    has_section = "What it is" in r  # final CSV: Category is the gallery section, "What it is" the detailed category
    out.append({
        "rank": int(r.get("#") or len(out) + 1),
        "company": r["Product"].strip(),
        "website": r["Website"].strip(),
        "domain": key,
        "market": (r.get("Market") or r.get("Group") or "").strip(),
        "category": (r["What it is"] if has_section else r["Category"]).strip(),
        "section": (r["Category"] if has_section else (r.get("Section", "").strip() or section_for(r["Category"]))).strip(),
        "why": (r.get("Why study it") or "").strip(),
    })
Path(__file__).resolve().parent.parent.joinpath("lib", "seed.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
from collections import Counter
print(len(out), "products;", Counter(x["section"] for x in out).most_common())
