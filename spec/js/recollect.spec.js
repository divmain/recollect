define([
  "js/recollect"
], function (
  Recollect
) {
  describe("recollect", function () {
    describe("ObjectStore", function () {
      describe("find", function () {
        it("defers to ixdb.get, providing necessary options");
      });

      describe("findOne", function () {
        it("defers to ixdb.get, providing necessary options");
      });

      describe("findByIndex", function () {
        it("defers to ixdb.get, providing necessary options");
      });

      describe("findOneByIndex", function () {
        it("defers to ixdb.get, providing necessary options");
      });

      describe("insertOne", function () {
        it("throws an error if new record not provided");

        it("throws an error if value present at keypath when not allowed");

        it("throws an error if no value present at keypath when required");

        it("defers to ixdb.add, providing necessary options");

        it("returns the id of the new database entry");
      });

      describe("insertMany", function () {
        it("throws an error if array of new records is not provided");

        it("throws an error if value present at keypath when not allowed");

        it("throws an error if no value presetn at keypath when required");

        it("defers to ixdb.add, providing necessary options");

        it("returns the ids of the new database entries");
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
