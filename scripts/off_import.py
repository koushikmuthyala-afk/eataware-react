#!/usr/bin/env python3
"""
EatAware — Open Food Facts India Importer
==========================================
STEP 1: Download + Grade locally  →  python3 off_import.py download
STEP 2: Review the CSV output     →  open off_graded.csv in Excel/Sheets
STEP 3: Upload to Supabase        →  python3 off_import.py upload

Requirements: pip install requests
For upload:    pip install supabase
"""

import requests, json, re, csv, sys, time, os

# ── CONFIG ─────────────────────────────────────────────────────────
SUPABASE_URL = "https://tkmrqsnjcudlkiwmcula.supabase.co"
SUPABASE_KEY = ""  # Set your anon key here or via env: SUPABASE_ANON_KEY
PAGES = 50         # 100 per page = up to 5000 candidates
OUTPUT_CSV = "off_graded.csv"
OUTPUT_JSON = "off_graded.json"

# ── SCORING ENGINE (mirrors frontend quickScore.js) ────────────────
AVOID_TERMS = {
    "tbhq": -15, "bha ": -12, "bht ": -10,
    "monosodium glutamate": -8, "msg": -8,
    "sodium benzoate": -6, "potassium sorbate": -4,
    "aspartame": -10, "acesulfame": -8, "sucralose": -5,
    "saccharin": -8, "cyclamate": -10,
    "tartrazine": -8, "sunset yellow": -8, "brilliant blue": -6,
    "allura red": -8, "carmoisine": -6,
    "high fructose corn syrup": -12, "hfcs": -12,
    "partially hydrogenated": -15, "trans fat": -15,
    "sodium nitrite": -10, "sodium nitrate": -8,
    "carrageenan": -5, "polysorbate": -5,
    "palm oil": -4, "palmolein": -4, "vanaspati": -8,
    "maida": -6, "refined flour": -6, "all purpose flour": -6,
    "artificial colour": -5, "artificial color": -5,
}

CAUTION_TERMS = {
    "sugar": -3, "added sugar": -5, "invert sugar": -4,
    "dextrose": -3, "maltodextrin": -3, "corn syrup": -5,
    "modified starch": -2, "emulsifier": -1,
    "artificial flavou": -3, "nature identical": -2,
    "phosphoric acid": -3, "citric acid": -1,
    "soy lecithin": -1, "mono and diglycerides": -2,
}

GOOD_TERMS = {
    "whole wheat": 5, "whole grain": 5, "oats": 5, "ragi": 6,
    "jowar": 5, "bajra": 5, "quinoa": 6, "millet": 5,
    "olive oil": 4, "coconut oil": 3, "ghee": 3,
    "turmeric": 3, "ginger": 2, "cumin": 2,
    "flaxseed": 4, "chia seed": 4, "walnut": 3, "almond": 3,
    "probiotic": 5, "fermented": 4, "prebiotic": 4,
    "vitamin": 2, "iron": 2, "calcium": 2, "zinc": 2,
    "protein": 2, "fibre": 3, "fiber": 3,
    "no artificial": 5, "no preservative": 5,
    "organic": 3, "cold pressed": 4, "unrefined": 3,
}

def grade_ingredients(text):
    """Score ingredient text and return grade + score + flags"""
    t = text.lower()
    score = 50
    flags = []

    for term, pts in AVOID_TERMS.items():
        if term in t:
            score += pts
            flags.append({"name": term.strip().title(), "dot": "dot-avoid", "desc": "", "safe": False})

    for term, pts in CAUTION_TERMS.items():
        if term in t:
            score += pts
            flags.append({"name": term.strip().title(), "dot": "dot-caution", "desc": "", "safe": None})

    for term, pts in GOOD_TERMS.items():
        if term in t:
            score += pts
            flags.append({"name": term.strip().title(), "dot": "dot-safe", "desc": "", "safe": True})

    score = max(0, min(100, score))

    if score >= 80: grade = "A"
    elif score >= 65: grade = "B"
    elif score >= 45: grade = "C"
    elif score >= 25: grade = "D"
    elif score >= 10: grade = "E"
    else: grade = "F"

    return grade, score, flags[:8]

def slugify(name, brand):
    raw = f"{brand} {name}" if brand else name
    s = re.sub(r"[^a-z0-9\s-]", "", raw.lower())
    s = re.sub(r"\s+", "-", s.strip())
    s = re.sub(r"-+", "-", s)
    return s[:80]

CATEGORY_MAP = {
    "snack": "Chips & Snacks", "chip": "Chips & Snacks", "namkeen": "Chips & Snacks",
    "chocolate": "Chocolates & Confectionery", "candy": "Chocolates & Confectionery",
    "confection": "Chocolates & Confectionery", "sweet": "Chocolates & Confectionery",
    "biscuit": "Biscuits & Cookies", "cookie": "Biscuits & Cookies",
    "noodle": "Instant Noodles", "pasta": "Instant Noodles",
    "juice": "Juices & Drinks", "drink": "Juices & Drinks", "soda": "Juices & Drinks",
    "tea": "Beverages", "coffee": "Beverages",
    "milk": "Dairy", "cheese": "Dairy", "yogurt": "Dairy", "curd": "Dairy",
    "butter": "Dairy", "ghee": "Dairy", "paneer": "Dairy",
    "oil": "Cooking Oils", "olive": "Cooking Oils",
    "rice": "Flour & Grains", "flour": "Flour & Grains", "atta": "Flour & Grains",
    "dal": "Flour & Grains", "lentil": "Flour & Grains", "grain": "Flour & Grains",
    "cereal": "Breakfast Cereals", "muesli": "Breakfast Cereals", "oat": "Breakfast Cereals",
    "bread": "Bread & Bakery", "rusk": "Bread & Bakery",
    "sauce": "Sauces & Condiments", "ketchup": "Sauces & Condiments",
    "pickle": "Sauces & Condiments", "chutney": "Sauces & Condiments",
    "masala": "Spices & Masalas", "spice": "Spices & Masalas",
    "honey": "Sweeteners", "sugar": "Sweeteners", "jaggery": "Sweeteners",
    "ice cream": "Ice Cream & Desserts", "frozen dessert": "Ice Cream & Desserts",
    "baby": "Baby Foods", "infant": "Baby Foods",
    "soap": "Personal Care", "shampoo": "Personal Care", "toothpaste": "Personal Care",
    "water": "Water", "mineral water": "Water",
    "jam": "Jams & Spreads", "spread": "Jams & Spreads",
    "nut": "Nuts & Seeds", "seed": "Nuts & Seeds", "dry fruit": "Nuts & Seeds",
    "frozen": "Frozen Foods", "ready to eat": "Ready to Eat", "soup": "Soups",
}

def categorize(off_cats):
    cats = (off_cats or "").lower()
    for kw, cat in CATEGORY_MAP.items():
        if kw in cats:
            return cat
    return "General"


# ══════════════════════════════════════════════════════════════════
# STEP 1: DOWNLOAD + GRADE LOCALLY
# ══════════════════════════════════════════════════════════════════
def download_and_grade():
    print("=" * 60)
    print("STEP 1: Downloading India products from Open Food Facts")
    print("=" * 60)

    all_products = []
    seen_slugs = set()

    for pg in range(1, PAGES + 1):
        url = (
            "https://world.openfoodfacts.org/cgi/search.pl?"
            "search_terms=&search_simple=1&action=process"
            "&tagtype_0=countries&tag_contains_0=contains&tag_0=India"
            f"&sort_by=unique_scans_n&page_size=100&page={pg}&json=1"
        )
        headers = {"User-Agent": "EatAware/1.0 (https://eataware.in; koushik@eataware.in)"}

        print(f"\n  Page {pg}/{PAGES}...", end=" ", flush=True)
        try:
            r = requests.get(url, headers=headers, timeout=30)
            data = r.json()
        except Exception as e:
            print(f"ERROR: {e}")
            continue

        products = data.get("products", [])
        if not products:
            print("No more products. Stopping.")
            break

        added = 0
        for p in products:
            name = (p.get("product_name") or "").strip()
            brand = (p.get("brands") or "").strip()
            ings = (p.get("ingredients_text_en") or p.get("ingredients_text") or "").strip()
            barcode = (p.get("code") or "").strip()
            off_cats = p.get("categories") or ""

            # Quality filter: must have name + ingredients
            if not name or len(name) < 3 or not ings or len(ings) < 15:
                continue

            slug = slugify(name, brand)
            if not slug or slug in seen_slugs:
                continue
            seen_slugs.add(slug)

            # Grade it
            grade, score, flags = grade_ingredients(ings)
            category = categorize(off_cats)

            # Build impact text
            avoid_count = len([f for f in flags if f["dot"] == "dot-avoid"])
            good_count = len([f for f in flags if f["dot"] == "dot-safe"])
            if avoid_count == 0 and good_count > 0:
                impact = f"Clean formulation with {good_count} positive ingredients. Auto-scored from Open Food Facts."
            elif avoid_count > 0:
                impact = f"Contains {avoid_count} concerning ingredient(s). Auto-scored from Open Food Facts. Verify with label."
            else:
                impact = "Standard formulation. Auto-scored from Open Food Facts."

            all_products.append({
                "slug": slug,
                "name": f"{name} ({brand})" if brand else name,
                "brand": brand,
                "grade": grade,
                "score": score,
                "category": category,
                "impact": impact,
                "ings": flags,
                "ingredients_raw": ings[:500],
                "barcode": barcode,
                "status": "published",
            })
            added += 1

        print(f"Got {added} valid products (total: {len(all_products)})")
        time.sleep(0.3)

    # ── Save locally ──
    print(f"\n{'=' * 60}")
    print(f"RESULTS: {len(all_products)} products graded")

    # Grade distribution
    dist = {}
    for p in all_products:
        dist[p["grade"]] = dist.get(p["grade"], 0) + 1
    print("\nGrade distribution:")
    for g in "ABCDEF":
        print(f"  {g}: {dist.get(g, 0)}")

    # Save CSV for review
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["slug", "name", "brand", "grade", "score", "category", "impact", "ingredients_raw", "barcode"])
        for p in all_products:
            w.writerow([p["slug"], p["name"], p["brand"], p["grade"], p["score"],
                        p["category"], p["impact"], p["ingredients_raw"], p["barcode"]])

    # Save JSON for upload step
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(all_products, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved {OUTPUT_CSV} (open in Excel/Sheets to review)")
    print(f"✅ Saved {OUTPUT_JSON} (used by upload step)")
    print(f"\nNEXT: Review the CSV. When happy, run: python3 off_import.py upload")


# ══════════════════════════════════════════════════════════════════
# STEP 2: UPLOAD TO SUPABASE (after review)
# ══════════════════════════════════════════════════════════════════
def upload_to_supabase():
    key = SUPABASE_KEY or os.environ.get("SUPABASE_ANON_KEY", "")
    if not key:
        print("ERROR: Set SUPABASE_KEY in script or SUPABASE_ANON_KEY env var")
        print("  Find it at: https://supabase.com/dashboard/project/tkmrqsnjcudlkiwmcula/settings/api")
        sys.exit(1)

    try:
        from supabase import create_client
    except ImportError:
        print("ERROR: pip install supabase")
        sys.exit(1)

    if not os.path.exists(OUTPUT_JSON):
        print(f"ERROR: {OUTPUT_JSON} not found. Run 'python3 off_import.py download' first.")
        sys.exit(1)

    with open(OUTPUT_JSON, "r", encoding="utf-8") as f:
        products = json.load(f)

    print(f"Loaded {len(products)} products from {OUTPUT_JSON}")

    sb = create_client(SUPABASE_URL, key)

    # Get existing slugs to skip dupes
    print("Loading existing products from Supabase...")
    existing = set()
    offset = 0
    while True:
        res = sb.table("products").select("slug").range(offset, offset + 999).execute()
        if not res.data:
            break
        existing.update(r["slug"] for r in res.data)
        offset += 1000
        if len(res.data) < 1000:
            break
    print(f"  Found {len(existing)} existing products")

    # Filter out dupes
    new_products = [p for p in products if p["slug"] not in existing]
    print(f"  New products to insert: {len(new_products)}")

    if not new_products:
        print("Nothing new to insert!")
        return

    # Remove the 'score' and 'ingredients_raw' fields (not in DB schema)
    for p in new_products:
        p.pop("score", None)
        p.pop("ingredients_raw", None)
        # Ensure ings is JSON-compatible
        if isinstance(p.get("ings"), list):
            p["ings"] = p["ings"]

    # Batch insert
    BATCH = 50
    total = 0
    for i in range(0, len(new_products), BATCH):
        batch = new_products[i:i + BATCH]
        try:
            sb.table("products").upsert(batch, on_conflict="slug").execute()
            total += len(batch)
            print(f"  Inserted {total}/{len(new_products)}")
        except Exception as e:
            print(f"  ERROR at batch {i}: {e}")
            # Try one-by-one for the failed batch
            for p in batch:
                try:
                    sb.table("products").upsert([p], on_conflict="slug").execute()
                    total += 1
                except Exception as e2:
                    print(f"    SKIP {p['slug']}: {e2}")

    print(f"\n{'=' * 60}")
    print(f"✅ DONE! Inserted {total} new products")
    print(f"  Total in DB: {len(existing) + total}")


# ══════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"

    if cmd == "download":
        download_and_grade()
    elif cmd == "upload":
        upload_to_supabase()
    else:
        print("EatAware — Open Food Facts Importer")
        print("=" * 40)
        print()
        print("Usage:")
        print("  python3 off_import.py download   # Step 1: Download + grade locally")
        print("  python3 off_import.py upload      # Step 2: Upload to Supabase")
        print()
        print("Workflow:")
        print("  1. Run 'download' — fetches India products, grades them, saves CSV + JSON")
        print("  2. Open off_graded.csv in Excel/Sheets — review grades, categories")
        print("  3. Edit off_graded.json if needed (remove bad entries)")
        print("  4. Run 'upload' — pushes reviewed products to Supabase")
        print()
        print("Requirements:")
        print("  pip install requests        # for download")
        print("  pip install supabase         # for upload")
