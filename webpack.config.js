var isDev = false;

module.exports = {
    mode: isDev ? 'development' : 'production',
    entry: {
        'dist/index': './src/index.js',
        'demo/index': './src/index.js'
    },
    output: {
        filename: '[name].js',
        path: __dirname ,
        library: 'dndSort',
        libraryTarget: 'umd'
    },
    watch: isDev,
    module: {
        rules: [
            {
                test: /\.js/,
                loader: 'babel-loader',
                exclude: /node_modules/,
                options: {
                    presets: ['env'],
                    plugins: ["add-module-exports"]
                }
            }
        ]
    }
}

