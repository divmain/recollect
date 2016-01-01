import _ from "lodash";

import { ObjectStore/*, default as Recollect*/ } from "src/recollect";
import * as ixdb from "src/ixdb";
import * as Errors from "src/errors";


describe("src/recollect", () => {
  let sandbox;
  beforeEach(() => sandbox = sinon.sandbox.create());
  afterEach(() => sandbox.restore());

  describe("ObjectStore", () => {
    describe("find", () => {
      let objectStore;
      let query;
      let result;

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

      it("calls ixdb.get with dbName option", done => {
        objectStore.find(query)
          .then(() => {
            expect(ixdb.get.getCall(0).args[0]).to.have.property("dbName", "testDb");
            done();
          })
          .catch(done);
      });

      it("calls ixdb.get with osName option", done => {
        objectStore.find(query)
          .then(() => {
            expect(ixdb.get.getCall(0).args[0]).to.have.property("osName", "testOs");
            done();
          })
          .catch(done);
      });

      it("calls ixdb.get with findMany option === true", done => {
        objectStore.find(query)
          .then(() => {
            expect(ixdb.get.getCall(0).args[0]).to.have.property("findMany", true);
            done();
          })
          .catch(done);
      });

      it("calls ixdb.get with modified query", done => {
        const modifiedQuery = _.chain(query)
          .map((val, key) => [`$data.${key}`, val])
          .object()
          .value();

        objectStore.find(query)
          .then(() => {
            expect(ixdb.get.getCall(0).args[0].query).to.deep.eql(modifiedQuery);
            done();
          })
          .catch(done);
      });

      it("resolves to an array of record data", done => {
        objectStore.find(query)
          .then(records => {
            expect(records).to.have.length(2);
            expect(records[0]).to.have.property("prop1", 3);
            expect(records[1]).to.have.property("prop1", 2);
            done();
          })
          .catch(done);
      });
    });

    describe("findOne", () => {
      let objectStore;
      const query = {
        prop1: { $lt: 5 }
      };

      beforeEach(() => {
        objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs"
        });

        const result = [{
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

      it("calls ixdb.get with dbName option", done => {
        objectStore.findOne(query)
          .then(() => {
            expect(ixdb.get.getCall(0).args[0]).to.have.property("dbName", "testDb");
            done();
          })
          .catch(done);
      });

      it("calls ixdb.get with osName option", done => {
        objectStore.findOne(query)
          .then(() => {
            expect(ixdb.get.getCall(0).args[0]).to.have.property("osName", "testOs");
            done();
          })
          .catch(done);
      });

      it("calls ixdb.get with findMany option === false", done => {
        objectStore.findOne(query)
          .then(() => {
            expect(ixdb.get.getCall(0).args[0]).to.have.property("findMany", false);
            done();
          })
          .catch(done);
      });

      it("calls ixdb.get with modified query", done => {
        const modifiedQuery = _.chain(query)
          .map((val, key) => [`$data.${key}`, val])
          .object()
          .value();

        objectStore.findOne(query)
          .then(() => {
            expect(ixdb.get.getCall(0).args[0].query).to.deep.eql(modifiedQuery);
            done();
          })
          .catch(done);
      });

      it("resolves to data of first record found", done => {
        objectStore.findOne(query)
          .then(result => {
            expect(result).to.be.an("object");
            expect(result).to.have.property("prop1", 3);
            done();
          })
          .catch(done);
      });

      it("resolves to undefined if no results found", done => {
        ixdb.get.restore();
        sandbox.stub(ixdb, "get").returns(Promise.resolve([]));

        objectStore.findOne(query)
          .then(result => {
            expect(result).to.be.undefined;
            done();
          })
          .catch(done);
      });
    });

    describe("findByIndex", () => {
      it("defers to ixdb.get, providing necessary options", done => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs"
        });
        const query = {
          prop1: { $lt: 5 }
        };

        sandbox.stub(ixdb, "get").returns(Promise.resolve([]));

        objectStore.findByIndex("fieldName", "fieldValue", query)
          .then(() => {
            expect(ixdb.get).to.have.been.calledOnce;
            expect(ixdb.get.args[0][0]).to.have.property("dbName", "testDb");
            expect(ixdb.get.args[0][0]).to.have.property("osName", "testOs");
            expect(ixdb.get.args[0][0]).to.have.property("findMany", true);
            expect(ixdb.get.args[0][0]).to.have.property("query").and
              .to.have.property("$data.prop1").and
              .to.have.property("$lt", 5);
            expect(ixdb.get.args[0][0]).to.have.property("indexedFieldName", "fieldName");
            expect(ixdb.get.args[0][0]).to.have.property("indexedValue", "fieldValue");
            done();
          })
          .catch(done);
      });
    });

    describe("findOneByIndex", () => {
      it("defers to ixdb.get, providing necessary options", done => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs"
        });
        const query = {
          prop1: { $lt: 5 }
        };

        sandbox.stub(ixdb, "get").returns(Promise.resolve([]));

        objectStore.findOneByIndex("fieldName", "fieldValue", query)
          .then(() => {
            expect(ixdb.get).to.have.been.calledOnce;
            expect(ixdb.get.args[0][0]).to.have.property("dbName", "testDb");
            expect(ixdb.get.args[0][0]).to.have.property("osName", "testOs");
            expect(ixdb.get.args[0][0]).to.have.property("findMany", false);
            expect(ixdb.get.args[0][0]).to.have.property("query").and
              .to.have.property("$data.prop1").and
              .to.have.property("$lt", 5);
            expect(ixdb.get.args[0][0]).to.have.property("indexedFieldName", "fieldName");
            expect(ixdb.get.args[0][0]).to.have.property("indexedValue", "fieldValue");
            done();
          })
          .catch(done);
      });

      it("resolves to the first result found", done => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs"
        });
        const query = {
          prop1: { $lt: 5 }
        };
        const ixdbGetResults = [{
          $data: { some: "data" }
        }, {
          $data: { some: "other data" }
        }];

        sandbox.stub(ixdb, "get").returns(Promise.resolve(ixdbGetResults));

        objectStore.findOneByIndex("fieldName", "fieldValue", query)
          .then(result => {
            expect(result).to.equal(ixdbGetResults[0].$data);
            done();
          })
          .catch(done);

      });

      it("resolves to undefined if no results found", done => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs"
        });
        const query = {
          prop1: { $lt: 5 }
        };

        sandbox.stub(ixdb, "get").returns(Promise.resolve([]));

        objectStore.findOneByIndex("fieldName", "fieldValue", query)
          .then(result => {
            expect(result).to.be.undefined;
            done();
          })
          .catch(done);
      });
    });

    describe("insertOne", () => {
      it("throws an error if new record not provided", () => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs"
        });

        sandbox.stub(ixdb, "add").returns(null);

        expect(() => objectStore.insertOne())
          .to.throw(Errors.InvalidArgumentError);
      });

      it("throws an error if value present at keypath when not allowed", () => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs",
          autoIncrement: true,
          keyPath: "_id"
        });
        const newRecord = {
          some: "data",
          _id: 5
        };

        sandbox.stub(ixdb, "add").returns(null);

        expect(() => objectStore.insertOne(newRecord))
          .to.throw(Errors.InvalidArgumentError);
      });

      it("throws an error if no value present at keypath when required", () => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs",
          autoIncrement: false,
          keyPath: "_id"
        });
        const newRecord = {
          some: "data"
        };

        sandbox.stub(ixdb, "add").returns(null);

        expect(() => objectStore.insertOne(newRecord))
          .to.throw(Errors.InvalidArgumentError);
      });

      it("defers to ixdb.add, providing necessary options", done => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs",
          autoIncrement: true,
          keyPath: "_id"
        });
        const newRecord = {
          some: "data"
        };

        sandbox.stub(ixdb, "add").returns(Promise.resolve([123]));
        sandbox.stub(Date, "now").returns(1451606558471);

        objectStore.insertOne(newRecord)
          .then(() => {
            expect(ixdb.add.args[0][0]).to.have.property("dbName", "testDb");
            expect(ixdb.add.args[0][0]).to.have.property("osName", "testOs");

            expect(ixdb.add.args[0][0]).to.have.property("records");
            expect(ixdb.add.args[0][0].records)
              .to.have.deep.property("[0].$data.some", "data");
            expect(ixdb.add.args[0][0].records)
              .to.have.deep.property("[0].$meta.created", 1451606558471);
            expect(ixdb.add.args[0][0].records)
              .to.have.deep.property("[0].$meta.modified", null);

            done();
          })
          .catch(done);
      });

      it("resolves to the id of the new database entry", done => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs",
          autoIncrement: true,
          keyPath: "_id"
        });
        const newRecord = {
          some: "data"
        };

        sandbox.stub(ixdb, "add").returns(Promise.resolve([123]));
        objectStore.insertOne(newRecord)
          .then(recordId => {
            expect(recordId).to.equal(123);
            done();
          })
          .catch(done);
      });
    });

    describe("insertMany", () => {
      it("throws an error if array of new records is not provided", () => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs"
        });

        expect(() => objectStore.insertMany())
          .to.throw(Errors.InvalidArgumentError);

        expect(() => objectStore.insertMany([]))
          .to.throw(Errors.InvalidArgumentError);

        expect(() => objectStore.insertMany("bob"))
          .to.throw(Errors.InvalidArgumentError);

        expect(() => objectStore.insertMany({ my: "object" }))
          .to.throw(Errors.InvalidArgumentError);
      });

      it("throws an error if value present at keypath when not allowed", () => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs",
          autoIncrement: true,
          keyPath: "_id"
        });

        expect(() => objectStore.insertMany([{
          ok: "object"
        }, {
          bad: "object",
          _id: "this isn't allowed"
        }]))
          .to.throw(Errors.InvalidArgumentError);
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
