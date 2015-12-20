// Rely on Babel's ES6 Promise implementation here.
export default const P = Promise;
P.prototype.finally = function (cb) {
  return this
    .then(
      resolved => Promise.resolve(cb()).then(() => resolved),
      rejected => Promise.resolve(cb()).then(() => Promise.reject(rejected))
    );
};
