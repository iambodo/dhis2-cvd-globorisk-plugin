import React from 'react'
import PropTypes from 'prop-types'
import { GloboriskCalculator } from './GloboriskCalculator/GloboriskCalculator.js'

// Defaults per CLAUDE.md spec: version=office, year=2020, iso=LAO.
// To switch country/year, change these constants and re-run extract_data.py if
// the new ISO is not already embedded in src/lib/globoriskData.js.
const DEFAULT_ISO = 'LAO'
const DEFAULT_YEAR = 2020

// Field aliases (IdFromPlugin in the field mapping). Configurable via DHIS2
// Tracker Plugin Configurator — these are the names the plugin reads from `values`.
const FIELD_ALIASES = {
    sex: 'sex',         // 0 = man, 1 = woman
    age: 'age',         // years
    sbp: 'sbp',         // mmHg
    tc: 'tc',           // mmol/L (displayed; not used by office version)
    dm: 'dm',           // 0/1 (displayed; not used by office version)
    smk: 'smk',         // 0/1
    bmi: 'bmi',         // kg/m^2
}

const Plugin = (props) => {
    const { values = {}, viewMode = false } = props

    const inputs = {
        sex: values[FIELD_ALIASES.sex],
        age: values[FIELD_ALIASES.age],
        sbp: values[FIELD_ALIASES.sbp],
        tc: values[FIELD_ALIASES.tc],
        dm: values[FIELD_ALIASES.dm],
        smk: values[FIELD_ALIASES.smk],
        bmi: values[FIELD_ALIASES.bmi],
    }

    if (viewMode) {
        return (
            <div style={{ padding: '16px', color: '#666', minHeight: '60px', width: '100%' }}>
                <p style={{ margin: 0 }}>
                    <strong>Globorisk CVD Risk Calculator</strong>
                    <br />
                    Country: {DEFAULT_ISO} · Year: {DEFAULT_YEAR} · Office version
                    <br />
                    (read-only mode — open the form to calculate)
                </p>
            </div>
        )
    }

    return (
        <GloboriskCalculator
            inputs={inputs}
            iso={DEFAULT_ISO}
            year={DEFAULT_YEAR}
        />
    )
}

Plugin.propTypes = {
    values: PropTypes.object,
    errors: PropTypes.object,
    warnings: PropTypes.object,
    fieldsMetadata: PropTypes.object,
    setFieldValue: PropTypes.func,
    setContextFieldValue: PropTypes.func,
    viewMode: PropTypes.bool,
    formSubmitted: PropTypes.bool,
}

export default Plugin
