export function captureExceptions (done, fn) {
  return function () {
    try {
      fn();
      done();
    } catch (error) {
      done(error);
    }
  };
}
