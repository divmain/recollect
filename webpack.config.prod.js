var _ = require("lodash");
var webpack = require("webpack");

var baseConfig = require("./webpack.config.base");

module.exports = _.merge({}, baseConfig, {
  output: {
    filename: "recollect.min.js"
  },
  plugins: [
    new webpack.SourceMapDevToolPlugin("[file].map"),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    })
  ]
});
