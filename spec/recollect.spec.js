import _ from "lodash";

import { ObjectStore, default as Recollect } from "src/recollect";
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

      it("calls ixdb.get with dbName option", () => {
        return objectStore.find(query)
          .then(() => {
            expect(ixdb.get.getCall(0).args[0]).to.have.property("dbName", "testDb");
          });
      });

      it("calls ixdb.get with osName option", () => {
        return objectStore.find(query)
          .then(() => {
            expect(ixdb.get.getCall(0).args[0]).to.have.property("osName", "testOs");
          });
      });

      it("calls ixdb.get with findMany option === true", () => {
        return objectStore.find(query)
          .then(() => {
            expect(ixdb.get.getCall(0).args[0]).to.have.property("findMany", true);
          });
      });

      it("calls ixdb.get with modified query", () => {
        const modifiedQuery = _.chain(query)
          .map((val, key) => [`$data.${key}`, val])
          .object()
          .value();

        return objectStore.find(query)
          .then(() => {
            expect(ixdb.get.getCall(0).args[0].query).to.deep.eql(modifiedQuery);
          });
      });

      it("resolves to an array of record data", () => {
        return objectStore.find(query)
          .then(records => {
            expect(records).to.have.length(2);
            expect(records[0]).to.have.property("prop1", 3);
            expect(records[1]).to.have.property("prop1", 2);
          });
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

      it("calls ixdb.get with dbName option", () => {
        return objectStore.findOne(query)
          .then(() => {
            expect(ixdb.get.getCall(0).args[0]).to.have.property("dbName", "testDb");
          });
      });

      it("calls ixdb.get with osName option", () => {
        return objectStore.findOne(query)
          .then(() => {
            expect(ixdb.get.getCall(0).args[0]).to.have.property("osName", "testOs");
          });
      });

      it("calls ixdb.get with findMany option === false", () => {
        return objectStore.findOne(query)
          .then(() => {
            expect(ixdb.get.getCall(0).args[0]).to.have.property("findMany", false);
          });
      });

      it("calls ixdb.get with modified query", () => {
        const modifiedQuery = _.chain(query)
          .map((val, key) => [`$data.${key}`, val])
          .object()
          .value();

        return objectStore.findOne(query)
          .then(() => {
            expect(ixdb.get.getCall(0).args[0].query).to.deep.eql(modifiedQuery);
          });
      });

      it("resolves to data of first record found", () => {
        return objectStore.findOne(query)
          .then(result => {
            expect(result).to.be.an("object");
            expect(result).to.have.property("prop1", 3);
          });
      });

      it("resolves to undefined if no results found", () => {
        ixdb.get.restore();
        sandbox.stub(ixdb, "get").returns(Promise.resolve([]));

        return objectStore.findOne(query)
          .then(result => {
            expect(result).to.be.undefined;
          });
      });
    });

    describe("findByIndex", () => {
      it("defers to ixdb.get, providing expected options", () => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs"
        });
        const query = {
          prop1: { $lt: 5 }
        };

        sandbox.stub(ixdb, "get").returns(Promise.resolve([]));

        return objectStore.findByIndex("fieldName", "fieldValue", query)
          .then(() => {
            expect(ixdb.get).to.have.been.calledOnce;
            expect(ixdb.get.args[0][0]).to.have.property("dbName", "testDb");
            expect(ixdb.get.args[0][0]).to.have.property("osName", "testOs");
            expect(ixdb.get.args[0][0]).to.have.property("findMany", true);
            expect(ixdb.get.args[0][0]).to.have.property("query").and
              .to.have.property("$data.prop1").and
              .to.have.property("$lt", 5);
            expect(ixdb.get.args[0][0]).to.have.property("indexedFieldName", "$data.fieldName");
            expect(ixdb.get.args[0][0]).to.have.property("indexedValue", "fieldValue");
          });
      });
    });

    describe("findOneByIndex", () => {
      it("defers to ixdb.get, providing expected options", () => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs"
        });
        const query = {
          prop1: { $lt: 5 }
        };

        sandbox.stub(ixdb, "get").returns(Promise.resolve([]));

        return objectStore.findOneByIndex("fieldName", "fieldValue", query)
          .then(() => {
            expect(ixdb.get).to.have.been.calledOnce;
            expect(ixdb.get.args[0][0]).to.have.property("dbName", "testDb");
            expect(ixdb.get.args[0][0]).to.have.property("osName", "testOs");
            expect(ixdb.get.args[0][0]).to.have.property("findMany", false);
            expect(ixdb.get.args[0][0]).to.have.property("query").and
              .to.have.property("$data.prop1").and
              .to.have.property("$lt", 5);
            expect(ixdb.get.args[0][0]).to.have.property("indexedFieldName", "$data.fieldName");
            expect(ixdb.get.args[0][0]).to.have.property("indexedValue", "fieldValue");
          });
      });

      it("resolves to the first result found", () => {
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

        return objectStore.findOneByIndex("fieldName", "fieldValue", query)
          .then(result => {
            expect(result).to.equal(ixdbGetResults[0].$data);
          });
      });

      it("resolves to undefined if no results found", () => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs"
        });
        const query = {
          prop1: { $lt: 5 }
        };

        sandbox.stub(ixdb, "get").returns(Promise.resolve([]));

        return objectStore.findOneByIndex("fieldName", "fieldValue", query)
          .then(result => {
            expect(result).to.be.undefined;
          });
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

      it("defers to ixdb.add, providing expected options", () => {
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

        return objectStore.insertOne(newRecord)
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
          });
      });

      it("resolves to the id of the new database entry", () => {
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

        return objectStore.insertOne(newRecord)
          .then(recordId => {
            expect(recordId).to.equal(123);
          });
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

      it("throws an error if no value present at keypath when required", () => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs",
          autoIncrement: false,
          keyPath: "_id"
        });

        expect(() => objectStore.insertMany([{
          ok: "object that has an id",
          _id: "stuff"
        }, {
          bad: "object that needs an id"
        }]))
          .to.throw(Errors.InvalidArgumentError);
      });

      it("defers to ixdb.add, providing expected options", () => {
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

        return objectStore.insertMany([newRecord])
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
          });
      });

      it("resolves to the ids of the new database entries", () => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs",
          autoIncrement: true,
          keyPath: "_id"
        });
        const newRecord = {
          some: "data"
        };

        sandbox.stub(ixdb, "add").returns(Promise.resolve([123, 123]));

        return objectStore.insertMany([newRecord, newRecord])
          .then(recordIds => {
            expect(recordIds).to.have.length(2);
            expect(recordIds[0]).to.equal(123);
            expect(recordIds[1]).to.equal(123);
          });
      });
    });

    describe("update", () => {
      it("throws an error if query not provided", () => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs",
          autoIncrement: true,
          keyPath: "_id"
        });

        expect(() => objectStore.update(undefined, { something: "new" }))
          .to.throw(Errors.InvalidArgumentError);
      });

      it("throws an error if `newProperties` option not provided", () => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs",
          autoIncrement: true,
          keyPath: "_id"
        });

        expect(() => objectStore.update({ thing: "something" }))
          .to.throw(Errors.InvalidArgumentError);
      });

      it("defers to ixdb.update, providing expected options", () => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs",
          autoIncrement: true,
          keyPath: "_id"
        });

        sandbox.stub(ixdb, "update").returns(Promise.resolve());
        sandbox.stub(Date, "now").returns(1451606558471);

        return objectStore.update({ name: "Billy Bob" }, { isActor: true })
          .then(() => {
            expect(ixdb.update.args[0][0]).to.have.property("dbName", "testDb");
            expect(ixdb.update.args[0][0]).to.have.property("osName", "testOs");

            expect(ixdb.update.args[0][0]).to.have.property("newProperties");
            expect(ixdb.update.args[0][0].newProperties)
              .to.have.deep.property("$data.isActor", true);
            expect(ixdb.update.args[0][0].newProperties)
              .to.not.have.deep.property("$meta.created");
            expect(ixdb.update.args[0][0].newProperties)
              .to.have.deep.property("$meta.modified", 1451606558471);
          });
      });

      it("resolves after the update succeeds", () => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs",
          autoIncrement: true,
          keyPath: "_id"
        });

        sandbox.stub(ixdb, "update").returns(Promise.resolve());

        return objectStore.update({ name: "Billy Bob" }, { isActor: true })
          .then(resolved => {
            expect(resolved).to.be.undefined;
          });
      });
    });

    describe("replace", () => {
      it("defers to ixdb.replace, providing expected options", () => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs",
          autoIncrement: true,
          keyPath: "_id"
        });

        sandbox.stub(ixdb, "replace").returns(Promise.resolve());
        sandbox.stub(Date, "now").returns(1451606558471);

        return objectStore.replace("my-unique-key", {
          my: "new object",
          and: "its properties"
        })
          .then(resolved => {
            expect(resolved).to.be.undefined;

            expect(ixdb.replace.args[0][0]).to.have.property("dbName", "testDb");
            expect(ixdb.replace.args[0][0]).to.have.property("osName", "testOs");
            expect(ixdb.replace.args[0][0]).to.have.property("keyPath", "_id");
            expect(ixdb.replace.args[0][0]).to.have.property("key", "my-unique-key");

            expect(ixdb.replace.args[0][0]).to.have.property("newObject");
            expect(ixdb.replace.args[0][0].newObject)
              .to.have.deep.property("$data.my", "new object");
            expect(ixdb.replace.args[0][0].newObject)
              .to.have.deep.property("$data.and", "its properties");
            expect(ixdb.replace.args[0][0].newObject)
              .to.have.deep.property("$meta.created", 1451606558471);
            expect(ixdb.replace.args[0][0].newObject)
              .to.have.deep.property("$meta.modified", null);
          });
      });
    });

    describe("delete", () => {
      it("defers to ixdb.del, providing expected options", () => {
        const objectStore = new ObjectStore({
          dbName: "testDb",
          osName: "testOs",
          autoIncrement: true,
          keyPath: "_id"
        });

        sandbox.stub(ixdb, "del").returns(Promise.resolve());

        return objectStore.delete("my-unique-key")
          .then(resolved => {
            expect(resolved).to.be.undefined;

            expect(ixdb.del.args[0][0]).to.have.property("dbName", "testDb");
            expect(ixdb.del.args[0][0]).to.have.property("osName", "testOs");
            expect(ixdb.del.args[0][0]).to.have.property("keys");
            expect(ixdb.del.args[0][0]).to.have.deep.property("keys[0]", "my-unique-key");
          });
      });
    });

    describe("drop", () => {
      it("defers to ixdb.deleteObjectStore, providing expected options", () => {
        const recollect = {};
        const objectStore = recollect.testOs = new ObjectStore({
          dbName: "testDb",
          osName: "testOs",
          autoIncrement: true,
          keyPath: "_id",
          _db: recollect
        });

        sandbox.stub(ixdb, "del").returns(Promise.resolve());
        sandbox.stub(ixdb, "deleteObjectStore").returns(Promise.resolve());

        return objectStore.drop()
          .then(resolved => {
            expect(resolved).to.be.undefined;

            expect(ixdb.deleteObjectStore.args[0][0]).to.have.property("dbName", "testDb");
            expect(ixdb.deleteObjectStore.args[0][0]).to.have.property("osName", "testOs");
          });
      });

      it("removes the relevant entry from _config object store", () => {
        const recollect = {};
        const objectStore = recollect.testOs = new ObjectStore({
          dbName: "testDb",
          osName: "testOs",
          autoIncrement: true,
          keyPath: "_id",
          _db: recollect
        });

        sandbox.stub(ixdb, "del").returns(Promise.resolve());
        sandbox.stub(ixdb, "deleteObjectStore").returns(Promise.resolve());

        return objectStore.drop()
          .then(() => {
            expect(ixdb.del.args[0][0]).to.have.property("dbName", "testDb");
            expect(ixdb.del.args[0][0]).to.have.property("osName", "_config");
            expect(ixdb.del.args[0][0]).to.have.property("keys");
            expect(ixdb.del.args[0][0]).to.have.deep.property("keys[0]", "testOs");
          });
      });

      it("removes itself as a property from the parent Recollect instance", () => {
        const recollect = {};
        const objectStore = recollect.testOs = new ObjectStore({
          dbName: "testDb",
          osName: "testOs",
          autoIncrement: true,
          keyPath: "_id",
          _db: recollect
        });

        expect(recollect).to.have.property("testOs", objectStore);

        sandbox.stub(ixdb, "del").returns(Promise.resolve());
        sandbox.stub(ixdb, "deleteObjectStore").returns(Promise.resolve());

        return objectStore.drop()
          .then(() => {
            expect(recollect).to.not.have.property("testOs");
          });
      });
    });
  });

  describe("Recollect", () => {
    it("throws an error if dbName is not supplied", () => {
      expect(() => new Recollect()).to.throw(Errors.InvalidArgumentError);
    });

    describe("createObjectStore", () => {
      it("creates IndexedDB object store", () => {
        const r = new Recollect("testDb");

        sandbox.stub(ixdb, "createObjectStore").returns(Promise.resolve());
        sandbox.stub(ixdb, "add").returns(Promise.resolve());

        return r.createObjectStore({ osName: "testOs" })
          .then(() => {
            expect(ixdb.createObjectStore).to.have.been.calledOnce;
            expect(ixdb.createObjectStore.args[0][0]).to.have.property("dbName", "testDb");
            expect(ixdb.createObjectStore.args[0][0]).to.have.property("osName", "testOs");
            expect(ixdb.createObjectStore.args[0][0]).to.have.property("autoIncrement", true);
            expect(ixdb.createObjectStore.args[0][0]).to.have.property("keyPath", "_id");
            expect(ixdb.createObjectStore.args[0][0]).to.have.property("indexes");
          });
      });

      it("creates an entry in _config object store", () => {
        const r = new Recollect("testDb");

        sandbox.stub(ixdb, "createObjectStore").returns(Promise.resolve());
        sandbox.stub(ixdb, "add").returns(Promise.resolve());
        sandbox.stub(Date, "now").returns(1451606558471);

        return r.createObjectStore({ osName: "testOs" })
          .then(() => {
            expect(ixdb.add).to.have.been.calledOnce;
            expect(ixdb.add.args[0][0]).to.have.property("dbName", "testDb");
            expect(ixdb.add.args[0][0]).to.have.property("osName", "_config");
            expect(ixdb.add.args[0][0]).to.have.property("records");
            expect(ixdb.add.args[0][0].records)
              .to.have.deep.property("[0].osName", "testOs");
            expect(ixdb.add.args[0][0].records)
              .to.have.deep.property("[0].autoIncrement", true);
            expect(ixdb.add.args[0][0].records)
              .to.have.deep.property("[0].keyPath", "_id");
            expect(ixdb.add.args[0][0].records)
              .to.have.deep.property("[0].indexes");
            expect(ixdb.add.args[0][0].records)
              .to.have.deep.property("[0].created", 1451606558471);
            expect(ixdb.add.args[0][0].records)
              .to.have.deep.property("[0].lastSynced", null);
          });
      });

      it("creates new instance of ObjectStore", () => {
        const r = new Recollect("testDb");

        sandbox.stub(ixdb, "createObjectStore").returns(Promise.resolve());
        sandbox.stub(ixdb, "add").returns(Promise.resolve());
        sandbox.stub(Date, "now").returns(1451606558471);

        return r.createObjectStore({ osName: "testOs" })
          .then(objectStore => {
            expect(objectStore).to.be.instanceof(ObjectStore);
          });
      });

      it("results in new property on parent recollect object", () => {
        const r = new Recollect("testDb");

        expect(r).to.not.have.property("testOs");

        sandbox.stub(ixdb, "createObjectStore").returns(Promise.resolve());
        sandbox.stub(ixdb, "add").returns(Promise.resolve());
        sandbox.stub(Date, "now").returns(1451606558471);

        return r.createObjectStore({ osName: "testOs" })
          .then(objectStore => {
            expect(r).to.have.property("testOs", objectStore);
          });
      });
    });

    describe("initialize", () => {
      it("creates _config if missing", () => {
        const r = new Recollect("testDb");
        sandbox.stub(ixdb, "createConfigIfMissing").returns(Promise.resolve());
        sandbox.stub(ixdb, "get").returns(Promise.resolve([]));

        return r.initialize()
          .then(instance => {
            expect(instance).to.equal(r);
            expect(ixdb.createConfigIfMissing.args[0][0]).to.equal("testDb");
          });
      });

      it("instantiates new instances of ObjectStore for each entry in _config", () => {
        const r = new Recollect("testDb");
        sandbox.stub(ixdb, "createConfigIfMissing").returns(Promise.resolve());
        sandbox.stub(ixdb, "get").returns(Promise.resolve([
          { osName: "testOs" }
        ]));

        return r.initialize()
          .then(() => {
            expect(r).to.have.property("testOs");
            expect(r.testOs).to.be.instanceof(ObjectStore);
          });
      });
    });
  });
});
