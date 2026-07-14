const config = {
    type: 'app',
    name: 'globorisk-plugin',
    title: 'Globorisk CVD Risk Calculator',

    entryPoints: {
        app: './src/App.js',
        plugin: './src/Plugin.js',
    },

    pluginType: 'CAPTURE',
}

module.exports = config
