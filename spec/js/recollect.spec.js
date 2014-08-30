define([
  "bluebird",
  "js/recollect",
  "js/ixdb",
  "js/errors",
  "spec/test-utils"
], function (
  Promise,
  Recollect,
  ixdb,
  Errors,
  testUtils
) {
  var sandbox,
    ObjectStore = Recollect.prototype.ObjectStore;

  describe("js/recollect", function () {
    beforeEach(function () {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
      sandbox.restore();
    });

    describe("ObjectStore", function () {
      describe("find", function () {
        var objectStore, query, result;

        beforeEach(function () {
          objectStore = new ObjectStore({
            dbName: "testDb",
            osName: "testOs"
          });

          query = {
            prop1: { $lt: 5 }
          };

          result = [{
            $data: {
              prop1: 3
            },
            $meta: {
              modified: 999,
              created: 999
            }
          }, {
            $data: {
              prop1: 2
            },
            $meta: {
              modified: 999,
              created: 999
            }
          }];

          sandbox.stub(ixdb, "get").returns(Promise.resolve(result));
        });

        it("calls ixdb.get with dbName option", function () {
          objectStore.find(query);
          expect(ixdb.get.getCall(0).args[0]).to.have.property("dbName", "testDb");
        });

        it("calls ixdb.get with osName option", function () {
          objectStore.find(query);
          expect(ixdb.get.getCall(0).args[0]).to.have.property("osName", "testOs");
        });

        it("calls ixdb.get with findMany === true", function () {
          objectStore.find(query);
          expect(ixdb.get.getCall(0).args[0]).to.have.property("findMany", true);
        });

        it("calls ixdb.get with modified query", function () {
          var modifiedQuery = _.chain(query)
            .map(function (val, key) {
              return ["$data." + key, val];
            })
            .object()
            .value();

          objectStore.find(query);
          expect(ixdb.get.getCall(0).args[0].query).to.deep.eql(modifiedQuery);
        });

        it("resolves to an array of record data", function (done) {
          objectStore.find(query).then(function (records) {
            testUtils.captureExceptions(done, function () {
              expect(records).to.have.length(2);
              expect(records[0]).to.have.property("prop1", 3);
              expect(records[1]).to.have.property("prop1", 2);
            });
          });
        });
      });

      describe("findOne", function () {
        it("defers to ixdb.get, providing necessary options", function () {
          var
            objectStore = new ObjectStore({
              dbName: "testDb",
              osName: "testOs"
            }),
            query = {
              prop1: { $lt: 5 }
            };

          sandbox.stub(ixdb, "get").returns(new testUtils.fakePromise());

          objectStore.findOne(query);

          expect(ixdb.get).to.have.been.calledOnce;
          expect(ixdb.get.args[0][0]).to.have.property("dbName", "testDb");
          expect(ixdb.get.args[0][0]).to.have.property("osName", "testOs");
          expect(ixdb.get.args[0][0]).to.have.property("findMany", false);
          expect(ixdb.get.args[0][0]).to.have.property("query", query);
        });

        it("resolves to the first result found", function () {
          var
            objectStore = new ObjectStore({
              dbName: "testDb",
              osName: "testOs"
            }),
            query = {
              prop1: { $lt: 5 }
            },
            fakePromise = new testUtils.fakePromise();

          sandbox.stub(ixdb, "get").returns(fakePromise);
          objectStore.findOne(query);

          var thenCb = fakePromise.then.args[0][0];

          expect(thenCb([1, 2])).to.eql(1);
        });

        it("resolves to undefined if no results found", function () {
          var
            objectStore = new ObjectStore({
              dbName: "testDb",
              osName: "testOs"
            }),
            query = {
              prop1: { $lt: 5 }
            },
            fakePromise = new testUtils.fakePromise();

          sandbox.stub(ixdb, "get").returns(fakePromise);
          objectStore.findOne(query);

          var thenCb = fakePromise.then.args[0][0];

          expect(thenCb([])).to.eql(undefined);
        });
      });

      describe("findByIndex", function () {
        it("defers to ixdb.get, providing necessary options", function () {
          var
            objectStore = new ObjectStore({
              dbName: "testDb",
              osName: "testOs"
            }),
            query = {
              prop1: { $lt: 5 }
            };

          sandbox.stub(ixdb, "get");

          objectStore.findByIndex("fieldName", "fieldValue", query);

          expect(ixdb.get).to.have.been.calledOnce;
          expect(ixdb.get.args[0][0]).to.have.property("dbName", "testDb");
          expect(ixdb.get.args[0][0]).to.have.property("osName", "testOs");
          expect(ixdb.get.args[0][0]).to.have.property("findMany", true);
          expect(ixdb.get.args[0][0]).to.have.property("query", query);
          expect(ixdb.get.args[0][0]).to.have.property("indexedFieldName", "fieldName");
          expect(ixdb.get.args[0][0]).to.have.property("indexedValue", "fieldValue");
        });
      });

      describe("findOneByIndex", function () {
        it("defers to ixdb.get, providing necessary options", function () {
          var
            objectStore = new ObjectStore({
              dbName: "testDb",
              osName: "testOs"
            }),
            query = {
              prop1: { $lt: 5 }
            };

          sandbox.stub(ixdb, "get").returns(new testUtils.fakePromise());

          objectStore.findOneByIndex("fieldName", "fieldValue", query);

          expect(ixdb.get).to.have.been.calledOnce;
          expect(ixdb.get.args[0][0]).to.have.property("dbName", "testDb");
          expect(ixdb.get.args[0][0]).to.have.property("osName", "testOs");
          expect(ixdb.get.args[0][0]).to.have.property("findMany", false);
          expect(ixdb.get.args[0][0]).to.have.property("query", query);
          expect(ixdb.get.args[0][0]).to.have.property("indexedFieldName", "fieldName");
          expect(ixdb.get.args[0][0]).to.have.property("indexedValue", "fieldValue");
        });

        it("resolves to the first result found", function () {
          var
            objectStore = new ObjectStore({
              dbName: "testDb",
              osName: "testOs"
            }),
            query = {
              prop1: { $lt: 5 }
            },
            fakePromise = new testUtils.fakePromise();

          sandbox.stub(ixdb, "get").returns(fakePromise);
          objectStore.findOneByIndex(query);

          var thenCb = fakePromise.then.args[0][0];

          expect(thenCb([3, 5])).to.eql(3);
        });

        it("resolves to undefined if no results found", function () {
          var
            objectStore = new ObjectStore({
              dbName: "testDb",
              osName: "testOs"
            }),
            query = {
              prop1: { $lt: 5 }
            },
            fakePromise = new testUtils.fakePromise();

          sandbox.stub(ixdb, "get").returns(fakePromise);
          objectStore.findOneByIndex(query);

          var thenCb = fakePromise.then.args[0][0];

          expect(thenCb([])).to.eql(undefined);
        });
      });

      describe("insertOne", function () {
        it("throws an error if new record not provided", function () {
          var
            objectStore = new ObjectStore({
              dbName: "testDb",
              osName: "testOs"
            }),
            fakePromise = new testUtils.fakePromise();

          sandbox.stub(ixdb, "add").returns(fakePromise);
          expect(function () { objectStore.insertOne(); })
            .to.throw(Errors.InvalidArgumentError);
        });

        it("throws an error if value present at keypath when not allowed", function () {
          var
            objectStore = new ObjectStore({
              dbName: "testDb",
              osName: "testOs",
              autoIncrement: true,
              keyPath: "_id"
            }),
            newRecord = {
              some: "data",
              _id: 5
            },
            fakePromise = new testUtils.fakePromise();

          sandbox.stub(ixdb, "add").returns(fakePromise);
          expect(function () { objectStore.insertOne(newRecord); })
            .to.throw(Errors.InvalidArgumentError);
        });

        it("throws an error if no value present at keypath when required", function () {
          var
            objectStore = new ObjectStore({
              dbName: "testDb",
              osName: "testOs",
              autoIncrement: false,
              keyPath: "_id"
            }),
            newRecord = {
              some: "data"
            },
            fakePromise = new testUtils.fakePromise();

          sandbox.stub(ixdb, "add").returns(fakePromise);
          expect(function () { objectStore.insertOne(newRecord); })
            .to.throw(Errors.InvalidArgumentError);
        });

        it("defers to ixdb.add, providing necessary options", function () {
          var
            objectStore = new ObjectStore({
              dbName: "testDb",
              osName: "testOs",
              autoIncrement: true,
              keyPath: "_id"
            }),
            newRecord = {
              some: "data"
            },
            fakePromise = new testUtils.fakePromise();

          sandbox.stub(ixdb, "add").returns(fakePromise);
          objectStore.insertOne(newRecord);

          expect(ixdb.add.args[0][0]).to.have.property("dbName", "testDb");
          expect(ixdb.add.args[0][0]).to.have.property("osName", "testOs");
          expect(ixdb.add.args[0][0].records).to.eql([ newRecord ]);
        });

        it("resolves to the id of the new database entry", function () {
          var
            objectStore = new ObjectStore({
              dbName: "testDb",
              osName: "testOs",
              autoIncrement: true,
              keyPath: "_id"
            }),
            newRecord = {
              some: "data"
            },
            fakePromise = new testUtils.fakePromise();

          sandbox.stub(ixdb, "add").returns(fakePromise);
          objectStore.insertOne(newRecord);

          var thenCb = fakePromise.then.args[0][0];

          expect(thenCb([20, 30])).to.eql(20);
        });
      });

      describe("insertMany", function () {
        it("throws an error if array of new records is not provided", function () {
          var
            objectStore = new ObjectStore({
              dbName: "testDb",
              osName: "testOs"
            }),
            fakePromise = new testUtils.fakePromise();

          sandbox.stub(ixdb, "add").returns(fakePromise);
          expect(function () { objectStore.insertMany(); })
            .to.throw(Errors.InvalidArgumentError);

          expect(function () { objectStore.insertMany([]); })
            .to.throw(Errors.InvalidArgumentError);
        });

        it("throws an error if value present at keypath when not allowed", function () {
          var
            objectStore = new ObjectStore({
              dbName: "testDb",
              osName: "testOs",
              autoIncrement: true,
              keyPath: "_id"
            }),
            fakePromise = new testUtils.fakePromise(),
            testFn = function () {
              objectStore.insertMany([{
                thing: "value"
              }, {
                thing: "otherValue",
                _id: 5
              }]);
            };

          sandbox.stub(ixdb, "add").returns(fakePromise);

          
        });

        it("throws an error if no value presetn at keypath when required");

        it("defers to ixdb.add, providing necessary options");

        it("resolves to the ids of the new database entries");
      });

      describe("update", function () {
        it("throws an error if `query` option not provided");

        it("throws an error if `newProperties` option new provided");
      });

      describe("replace", function () {
        it("defers to ixdb.replace");
      });

      describe("delete", function () {
        it("defers to ixdb.del");
      });

      describe("drop", function () {
        it("defers to ixdb.deleteObjectStore, providing necessary options");

        it("removes the relevant entry from _config object store");

        it("removes itself as a property from the parent Recollect instance");
      });
    });

    describe("Recollect", function () {
      it("throws an error if dbName is not supplied");

      describe("createObjectStore", function () {
        it("creates IndexedDB object store");

        it("creates an entry in _config object store");

        it("create new instance of ObjectStore");
      });

      describe("initialize", function () {
        it("creates _config if missing");

        it("instantiates new instances of ObjectStore for each entry in _config");
      });
    });
  });
});
