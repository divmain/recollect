/* global window */

window.chai = require("chai");
window.expect = window.chai.expect;
window.sinon = require("sinon/pkg/sinon.js");
window.chai.use(require("sinon-chai"));

const specFileRequire = require.context(".", true, /\.spec\.js$/);
specFileRequire.keys().forEach(specFileRequire);
