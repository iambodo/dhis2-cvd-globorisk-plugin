// JS port of globorisk::globorisk() for version='office', type='risk', time=10.
// Source: globorisk/R/globorisk.R (BSD-3-Clause).
// Reference: Ueda et al, Lancet D&E 2017; Hajifathalian et al, Lancet D&E 2015.
import { COEFS, RF, CVDR, SUPPORTED_ISOS } from './globoriskData.js'

const LACs = new Set([
    'ARG','ATG','BHS','BLZ','BOL','BRA','BRB','CHL','COL','CRI','CUB','DOM',
    'ECU','GRD','GTM','GUY','HND','HTI','JAM','LCA','MEX','NIC','PAN','PER',
    'PRY','SLV','SUR','TTO','URY','VCT','VEN',
])

const getCoefs = (version, lac) =>
    COEFS.find(c => c.type === version && c.lac === lac)

// Validate inputs the way globorisk.R does. Returns { error } or { ok: true, warnings: [] }.
export const validate = ({ sex, age, sbp, smk, bmi, iso, year }) => {
    const warnings = []
    if (sex !== 0 && sex !== 1) return { error: 'Sex must be 0 (man) or 1 (woman).' }
    if (age == null || isNaN(age)) return { error: 'Age is required.' }
    if (age < 40) return { error: 'Age must be ≥ 40 (Globorisk is not calibrated below 40).' }
    if (age > 80) warnings.push('Globorisk is not calibrated above age 80 — result may be unreliable.')
    if (smk !== 0 && smk !== 1) return { error: 'Smoker must be 0 (no) or 1 (yes).' }
    if (sbp == null || isNaN(sbp)) return { error: 'SBP is required.' }
    if (sbp < 70 || sbp > 270) warnings.push('Implausible SBP — check units (mmHg).')
    if (bmi == null || isNaN(bmi)) return { error: 'BMI is required for the office version.' }
    if (bmi < 10 || bmi > 80) warnings.push('Implausible BMI — check units (kg/m²).')
    if (year < 2000 || year > 2020) return { error: 'Baseline year must be 2000–2020.' }
    if (!RF[iso]) return { error: `ISO "${iso}" is not embedded. Supported: ${SUPPORTED_ISOS.join(', ')}.` }
    return { ok: true, warnings }
}

// Office version, 10-year risk.
// All inputs are numbers; iso is a 3-letter code; year ∈ [2000,2020].
export const globoriskOffice = ({ sex, age, sbp, smk, bmi, iso, year, updatedLac = false }) => {
    const v = validate({ sex, age, sbp, smk, bmi, iso, year })
    if (v.error) return { error: v.error }

    const isoU = iso.toUpperCase()
    const ageInt = Math.trunc(age)
    const agec = ageInt < 85 ? Math.trunc(ageInt / 5) - 7 : 10
    const sbp10 = sbp / 10
    const bmi5 = bmi / 5

    const rfRow = RF[isoU]?.[String(sex)]?.[String(agec)]
    if (!rfRow) return { error: `No risk-factor mean for iso=${isoU} sex=${sex} agec=${agec}.` }

    const cvdSeries = CVDR[isoU]?.[String(year)]?.[String(sex)]?.[String(ageInt)]
    if (!cvdSeries) return { error: `No CVD rates for iso=${isoU} year=${year} sex=${sex} age=${ageInt}.` }

    const useLac = updatedLac && LACs.has(isoU)
    const c = getCoefs('office', 0)
    const cl = useLac ? getCoefs('office', 1) : null

    const sbp_c = sbp10 - rfRow.mean_sbp
    const smk_c = smk - rfRow.mean_smk
    const bmi_c = bmi5 - rfRow.mean_bmi

    // 10-year follow-up: loop t = 0..9 (time-1 in the R code, with time=10)
    let totsurv = 1
    for (let t = 0; t <= 9; t++) {
        const cvd_t = cvdSeries[t]
        if (cvd_t == null) return { error: `Missing cvd_${t} for year=${year} age=${ageInt}.` }

        let hrC
        if (useLac) {
            hrC = Math.exp(
                sbp_c * cl.main_sbpc +
                bmi_c * cl.main_bmi5c +
                smk_c * cl.main_smokc +
                sex * smk_c * cl.main_sexsmokc +
                sex * smk_c * cl.main_sbpsexc +
                (ageInt + t) * sbp_c * cl.tvc_sbpc
            )
        } else {
            hrC = Math.exp(
                sbp_c * c.main_sbpc +
                bmi_c * c.main_bmi5c +
                smk_c * c.main_smokc +
                sex * smk_c * c.main_sexsmokc +
                (ageInt + t) * sbp_c * c.tvc_sbpc +
                (ageInt + t) * smk_c * c.tvc_smokc +
                (ageInt + t) * bmi_c * c.tvc_bmi5c
            )
        }

        const hzcvd = hrC * cvd_t
        const surv_t = Math.exp(-hzcvd)
        totsurv *= surv_t
    }

    return {
        risk: 1 - totsurv,
        warnings: v.warnings,
        debug: { agec, sbp_c, smk_c, bmi_c, totsurv },
    }
}

// Green (low) → red (high) gradient for risk percentage.
// 5% → green; 50%+ → deep red. Linear interpolate hue.
export const riskColor = (riskPct) => {
    const p = Math.max(0, Math.min(100, riskPct))
    // Map 0..50 → hue 120..0 (green to red); ≥50 stays red.
    const hue = p >= 50 ? 0 : 120 - (p / 50) * 120
    return `hsl(${hue}, 70%, 45%)`
}
