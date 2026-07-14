# Globorisk CVD Risk Plugin

A DHIS2 Capture Field Form Plugin that computes a patient's 10-year cardiovascular disease (CVD) risk using the **Globorisk** model (office version).

Reference: Ueda P et al., *Laboratory-Based and Office-Based Risk Scores and Charts to Predict 10-Year Risk of Cardiovascular Disease in 182 Countries*, Lancet D&E 2017. DOI 10.1016/S2213-8587(17)30015-3.

Source algorithm: [globorisk R package](https://github.com/globorisk/globorisk) (BSD-3-Clause). The plugin ports `globorisk::globorisk(version='office', type='risk', time=10)` to JavaScript and embeds the country-specific lookup tables (coefficients, mean risk factor levels, baseline CVD rates) extracted from `sysdata.rda`.

## Defaults

Per the project spec (`CLAUDE.md`):

- **version:** `office`
- **year:** `2020`
- **iso:** `LAO` (Laos)

To change defaults, edit `DEFAULT_ISO` / `DEFAULT_YEAR` in `capture-plugin/src/Plugin.js`. If you switch to a country that is not in the embedded data, re-run `extract_data.py` after adding the ISO code to the `ISOS` list.

## Inputs

The plugin reads these fields from `props.values` using their `IdFromPlugin` aliases:

| Alias | Meaning                          | Used by office version? |
|-------|----------------------------------|--------------------------|
| `sex` | 0 = man, 1 = woman                | yes |
| `age` | years (40–80 calibrated)          | yes |
| `sbp` | systolic BP (mmHg)                | yes |
| `smk` | current smoker (0/1)              | yes |
| `bmi` | body mass index (kg/m²)           | yes |
| `tc`  | total cholesterol (mmol/L)        | displayed only |
| `dm`  | diabetes (0/1)                    | displayed only |

`tc` and `dm` are read and displayed so the form looks complete, but the office version does not use them (lab version would).

## Output

The plugin displays each parameter as it fills, then renders a **Calculate** button. On click it shows the 10-year CVD risk as a percentage, with a background that interpolates from green (≤ 5%) through yellow to red (≥ 50%).

## Installation

```bash
yarn install --frozen-lockfile
yarn build
```

Built artifact: `capture-plugin/build/bundle/plugin.html`. Upload via **App Management → Upload App** in DHIS2 (v2.42.4+).

## Field mapping (Tracker Plugin Configurator)

```json
{
  "fieldMap": [
    { "IdFromApp": "<DE-id-sex>", "IdFromPlugin": "sex", "objectType": "DataElement" },
    { "IdFromApp": "<DE-id-age>", "IdFromPlugin": "age", "objectType": "DataElement" },
    { "IdFromApp": "<DE-id-sbp>", "IdFromPlugin": "sbp", "objectType": "DataElement" },
    { "IdFromApp": "<DE-id-smk>", "IdFromPlugin": "smk", "objectType": "DataElement" },
    { "IdFromApp": "<DE-id-bmi>", "IdFromPlugin": "bmi", "objectType": "DataElement" },
    { "IdFromApp": "<DE-id-tc>",  "IdFromPlugin": "tc",  "objectType": "DataElement" },
    { "IdFromApp": "<DE-id-dm>",  "IdFromPlugin": "dm",  "objectType": "DataElement" }
  ]
}
```

## Regenerating the embedded data

If you need additional countries:

1. Open `extract_data.py` and add ISO codes to `ISOS`.
2. Ensure R's `globorisk/R/sysdata.rda` is present (it ships with this repo).
3. `pip install pyreadr` (if not already installed).
4. `python extract_data.py` — this overwrites `capture-plugin/src/lib/globoriskData.js`.

LAO alone produces a ~417 KB data file; each additional country adds ~40 KB.

## Limitations

- Office version only. Lab and fatal versions would require additional code paths (and `tc`/`dm` data).
- `updated_lac` not exposed in the UI (defaults to false; LAO is not a LAC country anyway).
- Calibrated for ages 40–80; values outside this range produce warnings or errors.
- Baseline year must be 2000–2020.

## License

BSD-3-Clause (same as upstream globorisk).
