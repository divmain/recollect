define([], function () {
  return {
    fakePromise: function () {
      return {
        then: sinon.stub(),
        catch: sinon.stub(),
        finally: sinon.stub
      };
    }
  };
});