var isDev = false;

module.exports = {
    mode: isDev ? 'development' : 'production',
    entry: './src/index.js',
    output: {
        filename: 'index.js',
        path: __dirname + '/dist',
        library: 'dndSort',
        libraryTarget: 'umd',
        umdNamedDefine: false
    },
    watch: isDev,
    module: {
        rules: [
            {
                test: /\.js/,
                loader: 'babel-loader',
                exclude: /node_modules/,
                options: {
                    presets: ['env']
                }
            }
        ]
    }
}