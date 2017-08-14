const nib = require("nib");
const webpack = require('webpack')

module.exports = {
  entry: "./lib/client",
  target: "web",

  output: {
    filename: "dist/bundle.js"
  },

  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader"
      },
      {
        test: /\.json$/,
        loader: "json"
      },
      {
        test: /\.styl$/,
        loader: "style-loader!css-loader!stylus-loader"
      }
    ]
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'DISABLE_GA': process.env.DISABLE_GA,
      }
    })
  ],

  node: {
    fs: "empty"
  },

  stylus: {
    use: [nib()]
  },

  rules: [{
    test: /react-google-analytics/,
    use: process.env.DISABLE_GA ? 'null-loader' : 'noop-loader'
  }]
};
