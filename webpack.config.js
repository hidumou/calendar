var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var OpenBrowserPlugin = require('open-browser-webpack-plugin');
var CleanWebpackPlugin = require('clean-webpack-plugin');
var port = 8098;

module.exports = {
    entry: {
        "app": './src/app.js'
    },
    output: {
        path: './build',
        filename: "[name].[hash].js"
    },
    module: {
        preLoaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "jshint"
            }
        ],
        loaders: [
            {
                test: /\.scss$/,
                loader: ExtractTextPlugin.extract("style-loader", "css-loader!cssnext-loader!sass-loader!postcss-loader"),
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract("style-loader", "css-loader!cssnext-loader!postcss-loader")
            }
        ]
    },
    devtool: 'source-map',
    postcss: [
        require('precss'),
        // require('oldie')(
        //     {opacity:{
        //         replace: true
        //     }}
        // ),
        require('autoprefixer')({browsers: ['> 1%', 'IE 7'], syntax: require('postcss-scss')})
    ],
    plugins: [
        new CleanWebpackPlugin('./build'),
        new HtmlWebpackPlugin({
            template:'./src/tmpl.html',
            inject: true
        }),
        new ExtractTextPlugin("style.css"),
        new webpack.optimize.OccurenceOrderPlugin(),
        new webpack.NoErrorsPlugin(),
        new OpenBrowserPlugin({ url: 'http://localhost:' + port })
    ],
    devServer: {
        port: port
    }
};
