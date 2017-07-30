const nib = require("nib");

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

  node: {
    fs: "empty"
  },

  stylus: {
    use: [nib()]
  }
};
