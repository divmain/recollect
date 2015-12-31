var path = require("path");

var _ = require("lodash");

var webpackConfig = require("./webpack.config.dev");
webpackConfig = _.extend({}, webpackConfig);
delete webpackConfig.entry;


var preprocessors = {};
preprocessors[path.join(__dirname, "**/*.js")] = [ "webpack", "sourcemap" ];

module.exports = function (config) {
  config.set({
    basePath: __dirname,
    frameworks: ["mocha"],
    files: [path.join(__dirname, "spec/test-runner.js")],
    exclude: [],
    preprocessors: preprocessors,
    webpack: webpackConfig,
    webpackServer: {
      hot: true,
      quiet: true,
      noInfo: false,
      stats: {
        colors: true
      }
    },
    reporters: ["mocha"],
    port: 9876,
    colors: true,
    autoWatch: true,
    captureTimeout: 60000,
    singleRun: true,

    // - OFF
    // - ERROR
    // - WARN
    // - INFO (default)
    // - DEBUG
    logLevel: "WARN",

    // - Chrome (karma-chrome-launcher)
    // - Firefox (karma-firefox-launcher)
    // - Opera (karma-opera-launcher)
    // - Safari (karma-safari-launcher)
    // - PhantomJS (karma-phantomjs-launcher)
    // - IE (karma-ie-launcher)
    // browsers: ["PhantomJS", "Chrome", "Firefox", "Safari"],
    browsers: ["Chrome"],

    plugins: [
      require("karma-mocha"),
      require("karma-phantomjs-launcher"),
      require("karma-chrome-launcher"),
      require("karma-firefox-launcher"),
      require("karma-safari-launcher"),
      require("karma-webpack"),
      require("karma-mocha-reporter"),
      require("karma-sourcemap-loader")
    ]
  });
};
