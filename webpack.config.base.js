var path = require("path");
var webpack = require("webpack");

module.exports = {
  cache: true,
  entry: path.join(__dirname, "src/recollect.js"),
  output: {
    path: path.join(__dirname, "dist"),
    library: "Recollect",
    libraryTarget: "umd"
  },
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: [ /node_modules/ ],
      loader: "babel-loader",
      query: {
        presets: ["es2015", "stage-0"]
      }
    }]
  },
  plugins: [
    new webpack.optimize.DedupePlugin(),
  ]
};
