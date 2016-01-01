var path = require("path");

var _ = require("lodash");
var webpack = require("webpack");

var baseConfig = require("./webpack.config.base");


module.exports = _.merge({}, baseConfig, {
  output: {
    filename: "recollect.js"
  },
  resolve: {
    alias: {
      "src": path.join(__dirname, "src")
    }
  }
});
