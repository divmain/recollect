var path = require("path");

var _ = require("lodash");

var webpackConfig = require("./webpack.config.dev");

webpackConfig = _.merge({}, webpackConfig, {
  devtool: 'inline-source-map',
  // These changes are necessary to make Sinon play nice in the Webpack
  // environment.  Can be removed with the release of Sinon v2.0.
  loaders: [{
    test: /sinon\.js$/, loader: "imports?define=>false"
  }],
  module: { noParse: [ /sinon\.js$/ ] }  
});

webpackConfig.module.loaders = [{
  test: /\.js$/,
  exclude: [ /node_modules/ ],
  loader: "babel-loader",
  query: {
    presets: ["es2015", "stage-0"],
    // plugins: ["babel-plugin-rewire"]
  }
}];

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
    browsers: ["Chrome", "Firefox", "Safari"],

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
