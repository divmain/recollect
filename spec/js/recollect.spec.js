import _ from "lodash";

import { ObjectStore, default as Recollect } from "src/recollect";
import * as ixdb from "src/ixdb";
import Errors from "src/errors";
import testUtils from "../test-utils";


describe("js/recollect", () => {
  let sandbox;
  beforeEach(() => sandbox = sinon.sandbox.create());
  afterEach(() => sandbox.restore());

  describe("ObjectStore", () => {
    describe("find", () => {
      var objectStore, query, result;

      beforeEach(() => {
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

      it("calls ixdb.get with dbName option", () => {
        objectStore.find(query);
        expect(ixdb.get.getCall(0).args[0]).to.have.property("dbName", "testDb");
      });

      it("calls ixdb.get with osName option", () => {
        objectStore.find(query);
        expect(ixdb.get.getCall(0).args[0]).to.have.property("osName", "testOs");
      });

      it("calls ixdb.get with findMany option === true", () => {
        objectStore.find(query);
        expect(ixdb.get.getCall(0).args[0]).to.have.property("findMany", true);
      });

      it("calls ixdb.get with modified query", () => {
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
          testUtils.captureExceptions(done, () => {
            expect(records).to.have.length(2);
            expect(records[0]).to.have.property("prop1", 3);
            expect(records[1]).to.have.property("prop1", 2);
          });
        });
      });
    });

    describe("findOne", () => {
      var objectStore, query, result;

      beforeEach(() => {
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

      it("calls ixdb.get with dbName option", () => {
        objectStore.findOne(query);
        expect(ixdb.get.getCall(0).args[0]).to.have.property("dbName", "testDb");
      });

      it("calls ixdb.get with osName option", () => {
        objectStore.findOne(query);
        expect(ixdb.get.getCall(0).args[0]).to.have.property("osName", "testOs");
      });

      it("calls ixdb.get with findMany option === false", () => {
        objectStore.findOne(query);
        expect(ixdb.get.getCall(0).args[0]).to.have.property("findMany", false);
      });

      it("calls ixdb.get with modified query", () => {
        var modifiedQuery = _.chain(query)
          .map(function (val, key) {
            return ["$data." + key, val];
          })
          .object()
          .value();

        objectStore.findOne(query);
        expect(ixdb.get.getCall(0).args[0].query).to.deep.eql(modifiedQuery);
      });

      it("resolves to data of first record found", function (done) {
        objectStore.findOne(query).then(function (result) {
          testUtils.captureExceptions(done, () => {
            expect(result).to.be.an("object");
            expect(result).to.have.property("prop1", 3);
          });
        });
      });

      it("resolves to undefined if no results found", function (done) {
        ixdb.get.restore();
        sandbox.stub(ixdb, "get").returns(Promise.resolve([]));
        objectStore.findOne(query).then(function (result) {
          testUtils.captureExceptions(done, () => {
            expect(result).to.be.an("undefined");
          });
        });
      });
    });

    describe("findByIndex", () => {
      it("defers to ixdb.get, providing necessary options", () => {
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

    describe("findOneByIndex", () => {
      it("defers to ixdb.get, providing necessary options", () => {
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

      it("resolves to the first result found", () => {
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

      it("resolves to undefined if no results found", () => {
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

    describe("insertOne", () => {
      it("throws an error if new record not provided", () => {
        var
          objectStore = new ObjectStore({
            dbName: "testDb",
            osName: "testOs"
          }),
          fakePromise = new testUtils.fakePromise();

        sandbox.stub(ixdb, "add").returns(fakePromise);
        expect(() => { objectStore.insertOne(); })
          .to.throw(Errors.InvalidArgumentError);
      });

      it("throws an error if value present at keypath when not allowed", () => {
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
        expect(() => { objectStore.insertOne(newRecord); })
          .to.throw(Errors.InvalidArgumentError);
      });

      it("throws an error if no value present at keypath when required", () => {
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
        expect(() => { objectStore.insertOne(newRecord); })
          .to.throw(Errors.InvalidArgumentError);
      });

      it("defers to ixdb.add, providing necessary options", () => {
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

      it("resolves to the id of the new database entry", () => {
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

    describe("insertMany", () => {
      it("throws an error if array of new records is not provided", () => {
        var
          objectStore = new ObjectStore({
            dbName: "testDb",
            osName: "testOs"
          }),
          fakePromise = new testUtils.fakePromise();

        sandbox.stub(ixdb, "add").returns(fakePromise);
        expect(() => { objectStore.insertMany(); })
          .to.throw(Errors.InvalidArgumentError);

        expect(() => { objectStore.insertMany([]); })
          .to.throw(Errors.InvalidArgumentError);
      });

      it("throws an error if value present at keypath when not allowed", () => {
        var
          objectStore = new ObjectStore({
            dbName: "testDb",
            osName: "testOs",
            autoIncrement: true,
            keyPath: "_id"
          }),
          fakePromise = new testUtils.fakePromise(),
          testFn = () => {
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

    describe("update", () => {
      it("throws an error if `query` option not provided");

      it("throws an error if `newProperties` option new provided");
    });

    describe("replace", () => {
      it("defers to ixdb.replace");
    });

    describe("delete", () => {
      it("defers to ixdb.del");
    });

    describe("drop", () => {
      it("defers to ixdb.deleteObjectStore, providing necessary options");

      it("removes the relevant entry from _config object store");

      it("removes itself as a property from the parent Recollect instance");
    });
  });

  describe("Recollect", () => {
    it("throws an error if dbName is not supplied");

    describe("createObjectStore", () => {
      it("creates IndexedDB object store");

      it("creates an entry in _config object store");

      it("create new instance of ObjectStore");
    });

    describe("initialize", () => {
      it("creates _config if missing");

      it("instantiates new instances of ObjectStore for each entry in _config");
    });
  });
});
