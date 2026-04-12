#!/usr/bin/env python3
"""
Enrich seed.sql with city, state, country data.
- Reads existing seed.sql
- Infers distillery from bourbon name where NULL
- Maps distillery -> city, state, country
- Outputs updated seed.sql with all 7 columns
"""

import re
import sys

# ─────────────────────────────────────────────────────────────────────────────
# DISTILLERY → LOCATION MAPPING
# Each entry: "Canonical Distillery Name": ("city", "state", "country")
# ─────────────────────────────────────────────────────────────────────────────
DISTILLERY_LOCATIONS = {
    # ── KENTUCKY ──────────────────────────────────────────────────────────────
    "Buffalo Trace Distillery":         ("Frankfort",     "Kentucky",      "USA"),
    "Heaven Hill Distillery":           ("Bardstown",     "Kentucky",      "USA"),
    "Jim Beam Distillery":              ("Clermont",      "Kentucky",      "USA"),
    "Maker's Mark Distillery":          ("Loretto",       "Kentucky",      "USA"),
    "Four Roses Distillery":            ("Lawrenceburg",  "Kentucky",      "USA"),
    "Wild Turkey Distillery":           ("Lawrenceburg",  "Kentucky",      "USA"),
    "Woodford Reserve Distillery":      ("Versailles",    "Kentucky",      "USA"),
    "Brown-Forman Distillery":          ("Louisville",    "Kentucky",      "USA"),
    "Willett Distillery":               ("Bardstown",     "Kentucky",      "USA"),
    "Bardstown Bourbon Company":        ("Bardstown",     "Kentucky",      "USA"),
    "New Riff Distillery":              ("Newport",       "Kentucky",      "USA"),
    "Barton 1792 Distillery":           ("Bardstown",     "Kentucky",      "USA"),
    "Michter's Distillery":             ("Louisville",    "Kentucky",      "USA"),
    "Angel's Envy Distillery":          ("Louisville",    "Kentucky",      "USA"),
    "Rabbit Hole Distillery":           ("Louisville",    "Kentucky",      "USA"),
    "Jefferson's Bourbon":              ("Louisville",    "Kentucky",      "USA"),
    "Peerless Distilling":              ("Louisville",    "Kentucky",      "USA"),
    "Calumet Farm Distillery":          ("Lexington",     "Kentucky",      "USA"),
    "Limestone Branch Distillery":      ("Lebanon",       "Kentucky",      "USA"),
    "Lux Row Distillers":               ("Bardstown",     "Kentucky",      "USA"),
    "Barrell Craft Spirits":            ("Louisville",    "Kentucky",      "USA"),
    "Old Pepper Distillery":            ("Lexington",     "Kentucky",      "USA"),
    "Castle & Key Distillery":          ("Millville",     "Kentucky",      "USA"),
    "Pappy Van Winkle":                 ("Frankfort",     "Kentucky",      "USA"),
    "Kentucky Owl":                     ("Bardstown",     "Kentucky",      "USA"),
    "Boone County Distilling":          ("Florence",      "Kentucky",      "USA"),
    "Copper & Kings":                   ("Louisville",    "Kentucky",      "USA"),
    "Brough Brothers Distillery":       ("Louisville",    "Kentucky",      "USA"),
    "MB Roland Distillery":             ("Pembroke",      "Kentucky",      "USA"),
    "Boundary Oak Distillery":          ("Radcliff",      "Kentucky",      "USA"),
    "Penelope Bourbon":                 ("Louisville",    "Kentucky",      "USA"),
    "Jeptha Creed Distillery":          ("Shelbyville",   "Kentucky",      "USA"),
    "Hartfield & Co. Distillery":       ("Paris",         "Kentucky",      "USA"),
    "New Southern Revival":             ("Lexington",     "Kentucky",      "USA"),
    "O.Z. Tyler Distillery":            ("Owensboro",     "Kentucky",      "USA"),
    "Smooth Ambler Spirits":            ("Maxwelton",     "West Virginia", "USA"),
    "Rowan's Creek":                    ("Bardstown",     "Kentucky",      "USA"),
    "Noah's Mill":                      ("Bardstown",     "Kentucky",      "USA"),
    "Sazerac Distillery":               ("Frankfort",     "Kentucky",      "USA"),
    "Nulu":                             ("Louisville",    "Kentucky",      "USA"),

    # ── TENNESSEE ─────────────────────────────────────────────────────────────
    "Jack Daniel's Distillery":         ("Lynchburg",     "Tennessee",     "USA"),
    "George Dickel Distillery":         ("Tullahoma",     "Tennessee",     "USA"),
    "Nelson's Green Brier Distillery":  ("Nashville",     "Tennessee",     "USA"),
    "Corsair Distillery":               ("Nashville",     "Tennessee",     "USA"),
    "Chattanooga Whiskey":              ("Chattanooga",   "Tennessee",     "USA"),
    "H Clark Distillery":               ("Thompson's Station", "Tennessee", "USA"),

    # ── TEXAS ─────────────────────────────────────────────────────────────────
    "Garrison Brothers Distillery":     ("Hye",           "Texas",         "USA"),
    "Balcones Distillery":              ("Waco",          "Texas",         "USA"),
    "Firestone & Robertson Distillery": ("Fort Worth",    "Texas",         "USA"),
    "Ranger Creek Brewing":             ("San Antonio",   "Texas",         "USA"),
    "Ironroot Republic Distilling":     ("Denison",       "Texas",         "USA"),
    "Herman Marshall Whiskey":          ("Dallas",        "Texas",         "USA"),
    "Devils River Whiskey":             ("San Antonio",   "Texas",         "USA"),

    # ── NEW YORK ──────────────────────────────────────────────────────────────
    "Widow Jane Distillery":            ("Brooklyn",      "New York",      "USA"),
    "Kings County Distillery":          ("Brooklyn",      "New York",      "USA"),
    "Tuthilltown Spirits":              ("Gardiner",      "New York",      "USA"),
    "New York Distilling":              ("Brooklyn",      "New York",      "USA"),
    "Hillrock Estate Distillery":       ("Ancram",        "New York",      "USA"),
    "Coppersea Distilling":             ("New Paltz",     "New York",      "USA"),

    # ── COLORADO ──────────────────────────────────────────────────────────────
    "Stranahan's Colorado Whiskey":     ("Denver",        "Colorado",      "USA"),
    "Breckenridge Distillery":          ("Breckenridge",  "Colorado",      "USA"),
    "Distillery 291":                   ("Colorado Springs", "Colorado",   "USA"),
    "Mythology Distillery":             ("Denver",        "Colorado",      "USA"),
    "Laws Whiskey House":               ("Denver",        "Colorado",      "USA"),
    "Axe and the Oak":                  ("Colorado Springs", "Colorado",   "USA"),

    # ── INDIANA ───────────────────────────────────────────────────────────────
    "MGP Ingredients":                  ("Lawrenceburg",  "Indiana",       "USA"),
    "Indiana Whiskey Company":          ("South Bend",    "Indiana",       "USA"),

    # ── ILLINOIS ──────────────────────────────────────────────────────────────
    "FEW Spirits":                      ("Evanston",      "Illinois",      "USA"),
    "Koval Distillery":                 ("Chicago",       "Illinois",      "USA"),
    "North Shore Distillery":           ("Lake Bluff",    "Illinois",      "USA"),

    # ── VERMONT / NORTHEAST ───────────────────────────────────────────────────
    "WhistlePig Distillery":            ("Shoreham",      "Vermont",       "USA"),
    "Berkshire Mountain Distillers":    ("Sheffield",     "Massachusetts", "USA"),
    "Bully Boy Distillers":             ("Boston",        "Massachusetts", "USA"),
    "GrandTen Distilling":              ("Boston",        "Massachusetts", "USA"),

    # ── PACIFIC NORTHWEST ─────────────────────────────────────────────────────
    "Westland Distillery":              ("Seattle",       "Washington",    "USA"),
    "Copperworks Distilling":           ("Seattle",       "Washington",    "USA"),
    "Ransom Spirits":                   ("Sheridan",      "Oregon",        "USA"),
    "Clear Creek Distillery":           ("Portland",      "Oregon",        "USA"),

    # ── UTAH / WEST ───────────────────────────────────────────────────────────
    "High West Distillery":             ("Park City",     "Utah",          "USA"),
    "Ogden's Own Distillery":           ("Ogden",         "Utah",          "USA"),

    # ── OTHER STATES ─────────────────────────────────────────────────────────
    "Roughstock Distillery":            ("Bozeman",       "Montana",       "USA"),
    "Madison River Distilling":         ("Bozeman",       "Montana",       "USA"),
    "Headframe Spirits":                ("Butte",         "Montana",       "USA"),
    "Dry Fly Distilling":               ("Spokane",       "Washington",    "USA"),
    "Ballast Point Brewing & Spirits":  ("San Diego",     "California",    "USA"),
    "St. George Spirits":               ("Alameda",       "California",    "USA"),
    "Sutherland Distilling":            ("Livermore",     "California",    "USA"),
    "Sonoma Distilling":                ("Rohnert Park",  "California",    "USA"),
    "Breaker Bourbon":                  ("Buellton",      "California",    "USA"),
    "Seven Stills Distillery":          ("San Francisco", "California",    "USA"),
    "Breckenridge Distillery":          ("Breckenridge",  "Colorado",      "USA"),
    "Dogfish Head Distilling":          ("Milton",        "Delaware",      "USA"),
    "ASW Distillery":                   ("Atlanta",       "Georgia",       "USA"),
    "Old Dominick Distillery":          ("Memphis",       "Tennessee",     "USA"),
    "Leiper's Fork Distillery":         ("Franklin",      "Tennessee",     "USA"),
    "Ole Smoky Distillery":             ("Gatlinburg",    "Tennessee",     "USA"),
    "Collier and McKeel Distillery":    ("Nashville",     "Tennessee",     "USA"),
    "Ironroot Republic Distilling":     ("Denison",       "Texas",         "USA"),
    "Yellow Rose Distilling":           ("Houston",       "Texas",         "USA"),
    "Swift Single Malt":                ("Dripping Springs", "Texas",      "USA"),
    "Desert Door Texas Sotol":          ("Driftwood",     "Texas",         "USA"),
    "Treaty Oak Distilling":            ("Dripping Springs", "Texas",      "USA"),
    "Dripping Springs Distilling":      ("Dripping Springs", "Texas",      "USA"),
    "Hangar 1 Vodka":                   ("Alameda",       "California",    "USA"),
    "Golden Moon Distillery":           ("Golden",        "Colorado",      "USA"),
    "Spring44 Distilling":              ("Loveland",      "Colorado",      "USA"),
    "Tincup American Whiskey":          ("Denver",        "Colorado",      "USA"),
    "Family Jones Spirit House":        ("Denver",        "Colorado",      "USA"),
    "Glacier Distilling":               ("Coram",         "Montana",       "USA"),
    "Sawtooth Distillery":              ("Boise",         "Idaho",         "USA"),
    "Koenig Distillery":                ("Caldwell",      "Idaho",         "USA"),
    "Trail Distilling":                 ("Ontario",       "Oregon",        "USA"),
    "Eastside Distillers":              ("Portland",      "Oregon",        "USA"),
    "Rogue Spirits":                    ("Newport",       "Oregon",        "USA"),
    "Crater Lake Spirits":              ("Bend",          "Oregon",        "USA"),
    "Bull Run Distilling":              ("Portland",      "Oregon",        "USA"),
    "House Spirits Distillery":         ("Portland",      "Oregon",        "USA"),
    "Westward Whiskey":                 ("Portland",      "Oregon",        "USA"),
    "Bendistillery":                    ("Bend",          "Oregon",        "USA"),
}

# Normalize for lookup: lowercase, strip punctuation
def normalize(s):
    return re.sub(r"[^a-z0-9 ]", "", s.lower()).strip()

# Build normalized lookup
NORM_LOCATIONS = {normalize(k): v for k, v in DISTILLERY_LOCATIONS.items()}

# ─────────────────────────────────────────────────────────────────────────────
# NAME → DISTILLERY INFERENCE RULES
# Each rule: (regex_pattern, "Canonical Distillery Name")
# Rules are checked in order; first match wins.
# ─────────────────────────────────────────────────────────────────────────────
NAME_TO_DISTILLERY = [
    # Buffalo Trace umbrella brands
    (r'\bbuffalo trace\b',             "Buffalo Trace Distillery"),
    (r'\beagle rare\b',                "Buffalo Trace Distillery"),
    (r'\bblanton',                     "Buffalo Trace Distillery"),
    (r'\bwl weller\b',                 "Buffalo Trace Distillery"),
    (r'\bw\.?l\.? weller\b',           "Buffalo Trace Distillery"),
    (r'\bpappy van winkle\b',          "Buffalo Trace Distillery"),
    (r'\bvan winkle\b',                "Buffalo Trace Distillery"),
    (r'\be\.?h\.? taylor\b',           "Buffalo Trace Distillery"),
    (r'\beh taylor\b',                 "Buffalo Trace Distillery"),
    (r'\bgeorge t\.? stagg\b',         "Buffalo Trace Distillery"),
    (r'\bstagg jr\b',                  "Buffalo Trace Distillery"),
    (r'\bstagg jr\.',                  "Buffalo Trace Distillery"),
    (r'\brock hill farms\b',           "Buffalo Trace Distillery"),
    (r'\bwheat weller\b',              "Buffalo Trace Distillery"),

    # Heaven Hill umbrella brands
    (r'\belijah craig\b',              "Heaven Hill Distillery"),
    (r'\bevan williams\b',             "Heaven Hill Distillery"),
    (r'\blarceny\b',                   "Heaven Hill Distillery"),
    (r"\bparker'?s heritage\b",        "Heaven Hill Distillery"),
    (r'\bhenry mckenna\b',             "Heaven Hill Distillery"),
    (r'\bold fitzgerald\b',            "Heaven Hill Distillery"),
    (r"\bright'?s\b.*whiskey",         "Heaven Hill Distillery"),
    (r'\bcabinets\b',                  "Heaven Hill Distillery"),

    # Jim Beam umbrella brands
    (r'\bjim beam\b',                  "Jim Beam Distillery"),
    (r'\bknob creek\b',                "Jim Beam Distillery"),
    (r"\bbooker'?s\b",                 "Jim Beam Distillery"),
    (r"\bbaker'?s\b",                  "Jim Beam Distillery"),
    (r'\bbasil hayden',                "Jim Beam Distillery"),
    (r'\bold grand.?dad\b',            "Jim Beam Distillery"),
    (r'\bold crow\b',                  "Jim Beam Distillery"),
    (r'\bclermont\b',                  "Jim Beam Distillery"),

    # Maker's Mark
    (r"\bmaker'?s mark\b",             "Maker's Mark Distillery"),

    # Four Roses
    (r'\bfour roses\b',                "Four Roses Distillery"),

    # Wild Turkey / Russell's
    (r'\bwild turkey\b',               "Wild Turkey Distillery"),
    (r"\brussell'?s reserve\b",        "Wild Turkey Distillery"),
    (r'\blong branch\b',               "Wild Turkey Distillery"),

    # Woodford Reserve / Old Forester (both Brown-Forman, different sites)
    (r'\bwoodford reserve\b',          "Woodford Reserve Distillery"),
    (r'\bold forester\b',              "Brown-Forman Distillery"),

    # George Dickel
    (r'\bgeorge dickel\b',             "George Dickel Distillery"),

    # Jack Daniel's
    (r"\bjack daniel'?s?\b",           "Jack Daniel's Distillery"),
    (r'\bjd special\b',                "Jack Daniel's Distillery"),

    # Bardstown Bourbon Company
    (r'\bbardstown bourbon\b',         "Bardstown Bourbon Company"),
    (r'\bcollab.*bardstown\b',         "Bardstown Bourbon Company"),

    # Barrell Craft Spirits
    (r'\bbarrell bourbon\b',           "Barrell Craft Spirits"),
    (r'\bbarrell craft\b',             "Barrell Craft Spirits"),
    (r'\bbarrell rye\b',               "Barrell Craft Spirits"),
    (r'\bbarrell whiskey\b',           "Barrell Craft Spirits"),
    (r'\bbarrell seagrass\b',          "Barrell Craft Spirits"),
    (r'\bbarrell armida\b',            "Barrell Craft Spirits"),
    (r'\bbarrell vantage\b',           "Barrell Craft Spirits"),
    (r'\bbarrell dovetail\b',          "Barrell Craft Spirits"),
    (r'\bbarrell new year\b',          "Barrell Craft Spirits"),
    (r'\bbarrell batch\b',             "Barrell Craft Spirits"),

    # WhistlePig
    (r'\bwhistlepig\b',                "WhistlePig Distillery"),
    (r'\bwhistle pig\b',               "WhistlePig Distillery"),

    # Willett
    (r'\bwillett\b',                   "Willett Distillery"),
    (r"\bnoah'?s mill\b",              "Willett Distillery"),
    (r"\browan'?s creek\b",            "Willett Distillery"),
    (r'\bkt bourbon\b',                "Willett Distillery"),

    # Barton 1792
    (r'\b1792\b',                      "Barton 1792 Distillery"),
    (r'\bvery old barton\b',           "Barton 1792 Distillery"),
    (r'\btown branch\b',               "Barton 1792 Distillery"),

    # Michter's
    (r"\bmichter'?s\b",                "Michter's Distillery"),

    # Angel's Envy
    (r"\bangel'?s envy\b",             "Angel's Envy Distillery"),
    (r'\bangels envy\b',               "Angel's Envy Distillery"),

    # Rabbit Hole
    (r'\brabbit hole\b',               "Rabbit Hole Distillery"),

    # Jefferson's
    (r"\bjefferson'?s\b",              "Jefferson's Bourbon"),

    # New Riff
    (r'\bnew riff\b',                  "New Riff Distillery"),

    # Widow Jane
    (r'\bwidow jane\b',                "Widow Jane Distillery"),

    # High West
    (r'\bhigh west\b',                 "High West Distillery"),

    # Garrison Brothers
    (r'\bgarrison brothers\b',         "Garrison Brothers Distillery"),

    # Balcones
    (r'\bbalcones\b',                  "Balcones Distillery"),

    # TX Whiskey (Firestone & Robertson)
    (r'\bfirestone.{0,5}robertson\b',  "Firestone & Robertson Distillery"),
    (r'\btx bourbon\b',                "Firestone & Robertson Distillery"),
    (r'\btx whiskey\b',                "Firestone & Robertson Distillery"),
    (r'\bgiant tx\b',                  "Firestone & Robertson Distillery"),
    (r'\bherman marshall\b',           "Firestone & Robertson Distillery"),

    # Stranahan's
    (r"\bstranahan'?s\b",              "Stranahan's Colorado Whiskey"),

    # Breckenridge
    (r'\bbreckenridge\b',              "Breckenridge Distillery"),

    # Distillery 291
    (r'\b291\b.*colorado\b',           "Distillery 291"),
    (r'\bcolorado 291\b',              "Distillery 291"),

    # FEW Spirits
    (r'\bfew spirits\b',               "FEW Spirits"),
    (r'\bfew bourbon\b',               "FEW Spirits"),
    (r'\bfew rye\b',                   "FEW Spirits"),

    # Koval
    (r'\bkoval\b',                     "Koval Distillery"),

    # Corsair
    (r'\bcorsair\b',                   "Corsair Distillery"),

    # Peerless
    (r'\bpeerless\b',                  "Peerless Distilling"),

    # Calumet Farm
    (r'\bcalumet farm\b',              "Calumet Farm Distillery"),

    # Penelope Bourbon
    (r'\bpenelope\b',                  "Penelope Bourbon"),

    # Westland
    (r'\bwestland\b',                  "Westland Distillery"),

    # Limestone Branch (Yellowstone)
    (r'\byellowstone\b',               "Limestone Branch Distillery"),
    (r'\blimestone branch\b',          "Limestone Branch Distillery"),
    (r'\bsteve thompson\b',            "Limestone Branch Distillery"),

    # Copper & Kings
    (r'\bcopper.{0,5}kings\b',         "Copper & Kings"),

    # Old Pepper
    (r'\bold pepper\b',                "Old Pepper Distillery"),

    # Kentucky Owl
    (r'\bkentucky owl\b',              "Kentucky Owl"),

    # Nelson's Green Brier
    (r"\bnelson'?s green brier\b",     "Nelson's Green Brier Distillery"),
    (r'\bgreen brier\b',               "Nelson's Green Brier Distillery"),

    # Chattanooga Whiskey
    (r'\bchattanooga whiskey\b',       "Chattanooga Whiskey"),
    (r'\bchattanooga 1816\b',          "Chattanooga Whiskey"),

    # Axe and the Oak
    (r'\baxe and the oak\b',           "Axe and the Oak"),
    (r'\baxe &.{0,5}oak\b',            "Axe and the Oak"),

    # Tincup
    (r'\btincup\b',                    "Tincup American Whiskey"),
    (r'\btin cup\b',                   "Tincup American Whiskey"),

    # Laws Whiskey House
    (r'\blaws whiskey\b',              "Laws Whiskey House"),
    (r'\ba\.d\. laws\b',               "Laws Whiskey House"),
    (r'\bad laws\b',                   "Laws Whiskey House"),

    # Nulu
    (r'\bnulu\b',                      "Nulu"),

    # Lux Row / Ezra Brooks / Blood Oath
    (r'\blux row\b',                   "Lux Row Distillers"),
    (r'\bezra brooks\b',               "Lux Row Distillers"),
    (r'\bblood oath\b',                "Lux Row Distillers"),
    (r'\bdavid nicholson\b',           "Lux Row Distillers"),

    # Jeptha Creed
    (r'\bjeptha creed\b',              "Jeptha Creed Distillery"),

    # Old Dominick (Memphis)
    (r'\bold dominick\b',              "Old Dominick Distillery"),

    # Westward Whiskey (Oregon)
    (r'\bwestward whiskey\b',          "Westward Whiskey"),

    # Smooth Ambler
    (r'\bsmooth ambler\b',             "Smooth Ambler Spirits"),

    # Castle & Key
    (r'\bcastle.{0,5}key\b',           "Castle & Key Distillery"),

    # Boone County
    (r'\bboone county\b',              "Boone County Distilling"),

    # Yellow Rose (Texas)
    (r'\byellow rose\b',               "Yellow Rose Distilling"),

    # Ironroot
    (r'\bironroot\b',                  "Ironroot Republic Distilling"),

    # Ranger Creek
    (r'\branger creek\b',              "Ranger Creek Brewing"),

    # Treaty Oak
    (r'\btreaty oak\b',                "Treaty Oak Distilling"),

    # Sazerac (generic)
    (r'\bsazerac\b',                   "Sazerac Distillery"),

    # ASW Distillery (Georgia)
    (r'\basw distillery\b',            "ASW Distillery"),
    (r'\basw bourbon\b',               "ASW Distillery"),
]

# Compile patterns
NAME_TO_DISTILLERY_COMPILED = [
    (re.compile(p, re.IGNORECASE), d) for p, d in NAME_TO_DISTILLERY
]


def infer_distillery(name):
    """Return canonical distillery name inferred from bourbon name, or None."""
    for pattern, distillery in NAME_TO_DISTILLERY_COMPILED:
        if pattern.search(name):
            return distillery
    return None


def distillery_to_location(distillery_name):
    """Return (city, state, country) for a distillery, or (None, None, None)."""
    if distillery_name is None:
        return None, None, None
    # Try exact match first
    if distillery_name in DISTILLERY_LOCATIONS:
        return DISTILLERY_LOCATIONS[distillery_name]
    # Try normalized match
    norm = normalize(distillery_name)
    if norm in NORM_LOCATIONS:
        return NORM_LOCATIONS[norm]
    # Try substring match
    for key, loc in DISTILLERY_LOCATIONS.items():
        if normalize(key) in norm or norm in normalize(key):
            return loc
    return None, None, None


def sql_val(v):
    """Return SQL literal for a value (string or NULL)."""
    if v is None:
        return "NULL"
    # Escape single quotes
    escaped = str(v).replace("'", "''")
    return f"'{escaped}'"


def parse_values_line(line):
    """
    Parse a VALUES line like:
      ('Name here', 'type', 90.0, 'Distillery Name'),
    or:
      ('Name here', 'type', NULL, NULL),
    Returns (name, type_, proof, distillery) or None if not parseable.
    """
    line = line.strip().rstrip(",;")
    # Must start with (
    if not line.startswith("("):
        return None

    # Use a simple state machine to parse comma-separated SQL values
    vals = []
    i = 1  # skip opening (
    n = len(line)
    while i < n:
        c = line[i]
        if c == ')':
            break
        elif c == ' ' or c == '\t':
            i += 1
        elif c == ',':
            i += 1
        elif c == "'":
            # String value — find closing quote (handle '' escapes)
            j = i + 1
            s = []
            while j < n:
                if line[j] == "'":
                    if j + 1 < n and line[j + 1] == "'":
                        s.append("'")
                        j += 2
                    else:
                        j += 1
                        break
                else:
                    s.append(line[j])
                    j += 1
            vals.append("".join(s))
            i = j
        elif line[i:i+4].upper() == "NULL":
            vals.append(None)
            i += 4
        else:
            # Numeric value
            j = i
            while j < n and line[j] not in (",", ")", " "):
                j += 1
            token = line[i:j].strip()
            try:
                vals.append(float(token))
            except ValueError:
                vals.append(token)
            i = j

    if len(vals) < 2:
        return None

    name     = vals[0] if len(vals) > 0 else None
    type_    = vals[1] if len(vals) > 1 else None
    proof    = vals[2] if len(vals) > 2 else None
    distil   = vals[3] if len(vals) > 3 else None

    return name, type_, proof, distil


def main():
    seed_path = "supabase/seed.sql"
    output_path = "supabase/seed.sql"

    with open(seed_path, "r") as f:
        lines = f.readlines()

    # Find the INSERT block
    insert_start = None
    values_start = None
    for i, line in enumerate(lines):
        if "INSERT INTO public.bourbons" in line:
            insert_start = i
        if insert_start is not None and line.strip().upper() == "VALUES":
            values_start = i + 1
            break

    if insert_start is None:
        print("ERROR: Could not find INSERT INTO public.bourbons", file=sys.stderr)
        sys.exit(1)

    # Collect header lines (before INSERT)
    header = lines[:insert_start]

    # Parse all value rows
    rows = []
    i = values_start
    while i < len(lines):
        line = lines[i].rstrip("\n")
        stripped = line.strip()
        if not stripped or stripped.startswith("--"):
            i += 1
            continue
        if stripped.startswith("("):
            parsed = parse_values_line(stripped)
            if parsed:
                rows.append(parsed)
        i += 1

    print(f"Parsed {len(rows)} bourbon rows", file=sys.stderr)

    # Enrich each row
    enriched = []
    inferred_count = 0
    located_count = 0

    for name, type_, proof, distillery in rows:
        # Infer distillery from name if missing
        if distillery is None and name:
            inferred = infer_distillery(name)
            if inferred:
                distillery = inferred
                inferred_count += 1

        # Get location from distillery
        city, state, country = distillery_to_location(distillery)
        if city:
            located_count += 1

        enriched.append((name, type_, proof, distillery, city, state, country))

    print(f"Inferred {inferred_count} distilleries from names", file=sys.stderr)
    print(f"Located {located_count} bourbons", file=sys.stderr)

    # Build output SQL
    out_lines = []
    # Header
    for line in header:
        out_lines.append(line.rstrip("\n"))

    out_lines.append("-- Insert bourbons")
    out_lines.append("INSERT INTO public.bourbons (name, type, proof, distillery, city, state, country)")
    out_lines.append("VALUES")

    for idx, (name, type_, proof, distillery, city, state, country) in enumerate(enriched):
        # Format proof
        if proof is None:
            proof_str = "NULL"
        else:
            # Keep as numeric literal
            if isinstance(proof, float) and proof == int(proof):
                proof_str = str(int(proof)) + ".0"
            else:
                proof_str = str(proof)

        row_str = (
            f"  ({sql_val(name)}, {sql_val(type_)}, {proof_str}, "
            f"{sql_val(distillery)}, {sql_val(city)}, {sql_val(state)}, {sql_val(country)})"
        )

        if idx < len(enriched) - 1:
            row_str += ","
        else:
            row_str += ";"

        out_lines.append(row_str)

    with open(output_path, "w") as f:
        f.write("\n".join(out_lines) + "\n")

    print(f"Written {len(enriched)} rows to {output_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
