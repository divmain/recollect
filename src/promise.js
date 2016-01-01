// Rely on Babel's ES6 Promise polyfill implementation here.
const P = require("core-js/es6/promise");

P.prototype.finally = function (cb) {
  return this
    .then(
      resolved => Promise.resolve(cb()).then(() => resolved),
      rejected => Promise.resolve(cb()).then(() => Promise.reject(rejected))
    );
};
export default P;
