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
  },
  devtool: 'inline-source-map',

  // These changes are necessary to make Sinon play nice in the Webpack
  // environment.  Can be removed with the release of Sinon v2.0.
  loaders: [{
    test: /sinon\.js$/, loader: "imports?define=>false"
  }],
  module: { noParse: [ /sinon\.js$/ ] }
});
