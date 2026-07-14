import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Button, NoticeBox } from '@dhis2/ui'
import { globoriskOffice, riskColor } from '../lib/globorisk.js'
import styles from './GloboriskCalculator.module.css'

const PARAM_LABELS = {
    sex: 'Sex',
    age: 'Age (yrs)',
    sbp: 'SBP (mmHg)',
    smk: 'Smoker',
    bmi: 'BMI (kg/m²)',
    dm: 'Diabetes',
    tc: 'Total chol (mmol/L)',
}

const formatParam = (key, val) => {
    if (val == null || val === '') return null
    if (key === 'sex') return val == 1 ? 'Female' : val == 0 ? 'Male' : String(val)
    if (key === 'smk' || key === 'dm') return val == 1 ? 'Yes' : val == 0 ? 'No' : String(val)
    return String(val)
}

export const GloboriskCalculator = ({ inputs, iso, year }) => {
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

    // Office version needs: sex, age, sbp, smk, bmi. dm/tc are shown but not used.
    const requiredKeys = ['sex', 'age', 'sbp', 'smk', 'bmi']
    const missing = requiredKeys.filter(k => inputs[k] == null || inputs[k] === '')
    const ready = missing.length === 0

    const handleCalculate = () => {
        setError(null)
        setResult(null)
        const out = globoriskOffice({
            sex: Number(inputs.sex),
            age: Number(inputs.age),
            sbp: Number(inputs.sbp),
            smk: Number(inputs.smk),
            bmi: Number(inputs.bmi),
            iso,
            year,
        })
        if (out.error) {
            setError(out.error)
        } else {
            setResult(out)
        }
    }

    const riskPct = result ? result.risk * 100 : null

    return (
        <div className={styles.container}>
            <h4 className={styles.title}>
                10-year CVD Risk (Globorisk · office · {iso} · {year})
            </h4>

            <div className={styles.paramGrid}>
                {Object.keys(PARAM_LABELS).map(k => {
                    const formatted = formatParam(k, inputs[k])
                    return (
                        <div key={k} className={styles.paramRow}>
                            <span className={styles.paramLabel}>{PARAM_LABELS[k]}</span>
                            <span className={formatted ? styles.paramValue : styles.paramMissing}>
                                {formatted || '— missing —'}
                            </span>
                        </div>
                    )
                })}
            </div>

            <Button primary disabled={!ready} onClick={handleCalculate}>
                {ready ? 'Calculate 10-year CVD risk' : `Fill ${missing.length} more field(s)`}
            </Button>

            {error && (
                <div className={styles.warning}>
                    <NoticeBox error title="Cannot calculate">{error}</NoticeBox>
                </div>
            )}

            {result && (
                <>
                    <div
                        className={styles.scoreBox}
                        style={{ background: riskColor(riskPct) }}
                    >
                        <div className={styles.scoreLabel}>10-year CVD risk</div>
                        <div className={styles.scoreValue}>{riskPct.toFixed(1)}%</div>
                        <div className={styles.scoreSub}>
                            survival probability: {(result.debug.totsurv * 100).toFixed(1)}%
                        </div>
                    </div>
                    {result.warnings && result.warnings.length > 0 && (
                        <div className={styles.warning}>
                            <NoticeBox warning title="Warnings">
                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                    {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                                </ul>
                            </NoticeBox>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

GloboriskCalculator.propTypes = {
    inputs: PropTypes.object.isRequired,
    iso: PropTypes.string.isRequired,
    year: PropTypes.number.isRequired,
}
