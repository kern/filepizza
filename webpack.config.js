const nib = require("nib");
const webpack = require('webpack')

module.exports = {
  entry: "./src/client",
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
        'GA_ACCESS_TOKEN': JSON.stringify(process.env.GA_ACCESS_TOKEN),
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
    use: process.env.GA_ACCESS_TOKEN ? 'null-loader' : 'noop-loader'
  }]
};
