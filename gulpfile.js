/**
 * Dependencies
 */

var _ = require("lodash");
var path = require("path");

var gulp = require("gulp");
var gutil = require("gulp-util");

var clean = require("gulp-clean");
var connect = require("gulp-connect");
var gutil = require("gulp-util");
var jshint = require("gulp-jshint");
var stylish = require("jshint-stylish");

var mochaPhantomJS = require("gulp-mocha-phantomjs");
var karma = require("gulp-karma");

var webpack = require("webpack");


/**
 * App Configuration
 */

var config = {
  dest: "dist",
  test: "dist-test",
  srcFullPath: path.join(__dirname, "js"),
  specFullPath: path.join(__dirname, "spec"),
  destFullPath: path.join(__dirname, "dist"),
  testFullPath: path.join(__dirname, "dist-test"),
  root: __dirname,

  port: 3000,
  testPort: 3001
};

config.webpack = {
  context: config.root,
  cache: true,
  entry: {
    recollect: "./recollect.js"
  },
  resolve: {
    root: config.root
  },
  module: {
    loaders: [
      { test: /\.css$/, loader: "style-loader!css-loader" },
    ]
  },
  output: {
    path: config.destFullPath,
    publicPath: config.js + "/",
    filename: "[name].bundle.js",
    chunkFilename: "[id].bundle.js",
    sourceMapFilename: "[file].map",
    library: "Recollect",
    libraryTarget: "umd"
  },
  plugins: []
};


/**
 * Composite Tasks
 */

gulp.task("default", ["build-dev"], function () {});

gulp.task("build", ["lint", "test-phantom"], function () {
  gulp.run("clean");
  gulp.run("build:js");
});

gulp.task("build-dev", ["clean"], function () {
  gulp.run("build:js-dev");
});

gulp.task("test", ["build:test", "server:test"], function () {
  gulp.watch(path.join(config.srcFullPath, "**/*"), function () {
    gulp.run("build:test");
  });
});

gulp.task("test-phantom", ["build:test"], function () {
  return gulp
    .src("spec/test-runner.html")
    .pipe(mochaPhantomJS());
});

gulp.task("test-karma", function () {
  return gulp.src("spec/tests/**/*")
    .pipe(karma({
      configFile: "karma.conf.js",
      action: "run"
    }));
});


/**
 * Component Tasks
 */

gulp.task("clean", function () {
  return gulp.src(path.join(config.dest, "*"))
    .pipe(clean());
});

gulp.task("lint", function () {
  return gulp.src([
    path.join(config.srcFullPath, "js", "**/*.js"),
    path.join(config.srcFullPath, "spec/tests/**/*.js"),
    path.join(config.root, "*.js"),
  ])
    .pipe(jshint(path.join(config.root, ".jshintrc")))
    .pipe(jshint.reporter(stylish))
    .pipe(jshint.reporter("fail"));
});

gulp.task("server", function () {
  return connect.server({
    root: [config.destFullPath],
    open: {},
    livereload: true,
    port: config.port
  });
});

gulp.task("server:test", function () {
  return connect.server({
    root: [config.testFullPath],
    open: {
      file: "test-runner.html"
    },
    livereload: true,
    port: config.testPort
  });
});

gulp.task("reload:build", ["build-dev"], function () {
  gulp.run("reload:go");
});

gulp.task("reload:go", function () {
  return gulp.src(path.join(config.srcFullPath, "**/*"))
    .pipe(connect.reload());
});

/**
 * JS
 */

gulp.task("build:js", function (callback) {
  var webpackConf = _.extend({}, config.webpack);

  webpackConf.plugins = webpackConf.plugins.concat([
    new webpack.DefinePlugin({
      "process.env": {
        "NODE_ENV": JSON.stringify("production")
      }
    }),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin()
  ]);

  webpack(webpackConf, function (err, stats) {
    if (err) {
      throw new gutil.PluginError("build:js", err);
    }
    gutil.log("[build:js]", stats.toString({
      colors: true
    }));
    callback();
  });
});

gulp.task("build:js-dev", function (callback) {

  var webpackConf = _.extend({}, config.webpack, {
    devtool: "sourcemap",
    debug: true
  });

  webpack(webpackConf, function (err, stats) {
    if (err) {
      throw new gutil.PluginError("build:js-dev", err);
    }
    gutil.log("[build:js-dev]", stats.toString({
      colors: true
    }));
    callback();
  });
});

/**
 * Tests
 */

gulp.task("build:test", function (callback) {
  gulp.src(path.join(config.specFullPath, "test-runner.html"))
    .pipe(gulp.dest(config.testFullPath));

  var webpackConf = _.extend({}, config.webpack, {
    entry: {
      test: "spec/test-runner.js"
      // test: path.join(config.specFullPath, "test-runner.js")
    },
    output: {
      path: config.testFullPath,
      publicPath: "/",
      filename: "[name].bundle.js"
    },
    devtool: "sourcemap",
    debug: true
  });

  webpack(webpackConf, function (err) {
    if (err) {
      throw new gutil.PluginError("build:test", err);
    }
    callback();
  });
});
