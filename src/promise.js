// Rely on Babel's ES6 Promise implementation here.
const P = Promise;
P.prototype.finally = function (cb) {
  return this
    .then(
      resolved => Promise.resolve(cb()).then(() => resolved),
      rejected => Promise.resolve(cb()).then(() => Promise.reject(rejected))
    );
};
export default P;
