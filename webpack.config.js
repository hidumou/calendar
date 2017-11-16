var webpack = require('webpack');
var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var OpenBrowserPlugin = require('open-browser-webpack-plugin');
var CleanWebpackPlugin = require('clean-webpack-plugin');

var port = 8098;

module.exports = {
    entry: {
        "app": './src/app.js',
    },
    output: {
        path: path.resolve(__dirname, "./build"),
        filename: "[name].js"
    },

    module: {
        rules: [
            {
                test: /\.scss|css$/,
                use:[
                    "style-loader",
                    "css-loader",
                    "sass-loader?sourceMap"
                ]
            }
        ]
    },
    devtool: '#eval-source-map',
    plugins: [
        new CleanWebpackPlugin('./build'),
        new HtmlWebpackPlugin({
            template: './src/tmpl.html',
            excludeChunks:['calendar']
        }),
        new OpenBrowserPlugin({url: 'http://localhost:' + port})
    ],
    devServer: {
        port: port
    }
};


if (process.env.NODE_ENV === "production") {
    module.exports.devtool = "";
    module.exports.plugins = (module.exports.plugins || []).concat([
        new webpack.DefinePlugin({
            "process.env": {
                NODE_ENV: "'production'"
            }
        }),
        new webpack.optimize.UglifyJsPlugin({
            // sourceMap: true,
            compress: {
                warnings: false
            }
        }),
        new webpack.LoaderOptionsPlugin({
            minimize: true
        }),
    ]);
}