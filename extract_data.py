"""Extract Globorisk data for embedding in the JS plugin.

We only need follow-up time = 10 (the user's stated CVD risk window), so for each
cvdr row keep only cvd_0..cvd_9 (10 values). Structure as nested lookups to shrink
the bundle and make access O(1).
"""
import pyreadr
import json
import math
from pathlib import Path

ROOT = Path(__file__).parent
rda_path = ROOT / "globorisk" / "R" / "sysdata.rda"
result = pyreadr.read_r(str(rda_path))
coefs = result["coefs"]
cvdr = result["cvdr"]
rf = result["rf"]

ISOS = ["LAO"]  # extend & re-run to add countries
YEARS = list(range(2000, 2021))

def clean(v):
    if isinstance(v, float) and math.isnan(v):
        return None
    return v.item() if hasattr(v, "item") else v

# coefs: tiny — keep all rows
coefs_records = [{c: clean(r[c]) for c in coefs.columns} for _, r in coefs.iterrows()]

# rf: nested rf[iso][sex][agec] = {mean_sbp, mean_tc, mean_dm, mean_smk, mean_bmi}
rf_subset = rf[rf["iso"].isin(ISOS)]
rf_nested = {}
for _, row in rf_subset.iterrows():
    iso = row["iso"]
    sex = int(row["sex"])
    agec = int(row["agec"])
    rf_nested.setdefault(iso, {}).setdefault(str(sex), {})[str(agec)] = {
        "mean_sbp": clean(row["mean_sbp"]),
        "mean_tc": clean(row["mean_tc"]),
        "mean_dm": clean(row["mean_dm"]),
        "mean_smk": clean(row["mean_smk"]),
        "mean_bmi": clean(row["mean_bmi"]),
    }

# cvdr: nested cvdr[iso][year][sex][age] = [cvd_0..cvd_9]  (10-year follow-up only)
cvdr_subset = cvdr[
    cvdr["iso"].isin(ISOS)
    & cvdr["year"].isin(YEARS)
    & (cvdr["type"] == "FNF")
]
cvdr_nested = {}
for _, row in cvdr_subset.iterrows():
    iso = row["iso"]
    year = int(row["year"])
    sex = int(row["sex"])
    age = int(row["age"])
    series = [clean(row[f"cvd_{t}"]) for t in range(10)]
    cvdr_nested.setdefault(iso, {}).setdefault(str(year), {}).setdefault(str(sex), {})[str(age)] = series

out_dir = ROOT / "capture-plugin" / "src" / "lib"
out_dir.mkdir(parents=True, exist_ok=True)
out_path = out_dir / "globoriskData.js"

with open(out_path, "w", encoding="utf-8") as f:
    f.write("// Auto-generated from globorisk R package sysdata.rda — do not edit by hand.\n")
    f.write(f"// ISOs: {ISOS}\n")
    f.write(f"// Years: {YEARS[0]}..{YEARS[-1]} (follow-up: 10 years)\n\n")
    f.write("export const COEFS = " + json.dumps(coefs_records) + "\n\n")
    f.write("export const RF = " + json.dumps(rf_nested) + "\n\n")
    f.write("export const CVDR = " + json.dumps(cvdr_nested) + "\n\n")
    f.write("export const SUPPORTED_ISOS = " + json.dumps(ISOS) + "\n")

print(f"coefs rows: {len(coefs_records)}")
print(f"Wrote {out_path} ({out_path.stat().st_size / 1024:.1f} KB)")
