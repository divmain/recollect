define([
  "lodash",
  "bluebird",
  "./errors",
  "./util"
], function (_, Promise, Errors, util) {

  var IndexedDB, IDBKeyRange;

  IndexedDB = window.indexedDB ||
              window.webkitIndexedDB ||
              window.mozIndexedDB ||
              window.oIndexedDB ||
              window.msIndexedDB;
  IDBKeyRange = window.IDBKeyRange ||
                window.webkitIDBKeyRange;

  if (_.isUndefined(IndexedDB)) {
    throw new Errors.IndexedDbNotFound();
  }

  var getCursor = function (store) {
    var keyRange = IDBKeyRange.lowerBound(0);
    return store.openCursor(keyRange);
  };

  var getIndexedCursor = function (store, indexedField, indexedValue) {
    var keyRange = IDBKeyRange.only(indexedValue);
    return store.index(indexedField).openCursor(keyRange);
  };

  var accumulateResults = function (records, query, e) {
    var cursor = e.target.result;
    if (!cursor) { return; }
    if (!query || util.validate(query, cursor)) {
      records.push(cursor);
    }
    cursor.continue();
  };

  var oneResult = function (records, query, e) {
    var cursor = e.target.result;
    if (!cursor) { return; }
    if (!query || util.validate(query, cursor)) {
      records.push(cursor);
      return;
    }
    cursor.continue();
  };

  var indexField = function (storeName, fieldName, isArray) {
    var connection = IndexedDB.open(storeName);
    connection.onsuccess(function (e) {
      var db = e.target.result;
      db.objectStore.createIndex(fieldName, fieldName, {
        unique: false,
        multiEntry: isArray && true || false
      });
    });
  };

  var createStore = function (storeName) {
    var connection = IndexedDB.open(storeName);

    return new Promise(function (resolve, reject) {
      connection.onerror = function (e) {
        reject(new Errors.ConnectionError(e));
      };

      connection.onsuccess = function (e) {
        resolve(e.target.result.value);
        e.target.result.close();
      };

      connection.onupgradeneeded = function (e) {
        reconfigureStore(storeName, e);
      };
    });

  };

  var reconfigureStore = function (storeName, e) {
    var db = e.target.result;
    if (!db.objectStoreNames.contains(storeName)) {
      db.createObjectStore(storeName, {
        keyPath: "_id",
        autoIncrement: true
      });
    }
  };

  var get = function (options) {
    options = options || {};
    var connection = IndexedDB.open(options.storeName);

    return new Promise(function (resolve, reject) {
      connection.onsuccess = function (e) {
        var db, transaction, store, request;

        db = e.target.result;
        transaction = db.transaction([options.storeName], "readwrite");
        store = transaction.objectStore(options.storeName);
        request = store.get(options._id);

        request.onsuccess = function (e) {
          resolve(e.target.result);
        };

        request.onerror = function (e) {
          reject(new Errors.CursorError(e));
        };

        transaction.oncomplete = function (/* e */) {
          db.close();
        };

        transaction.onerror = function (e) {
          reject(new Errors.TransactionError(e));
        };
      };

      connection.onerror = function (e) {
        reject(new Errors.ConnectionError(e));
      };

      connection.onupgradeneeded = _.partial(reconfigureStore, options.storeName);
    });
  };

  var getMany = function (options) {
    options = options || {};
    var connection = IndexedDB.open(options.storeName);

    return new Promise(function (resolve, reject) {
      connection.onsuccess = function (e) {
        var db, transaction, store, cursor, records;

        db = e.target.result;
        transaction = db.transaction([options.storeName], "readwrite");
        store = transaction.objectStore(options.storeName);

        cursor = options.indexedFieldName ?
          getIndexedCursor(store, options.indexedFieldName, options.indexedValue) :
          getCursor(store);

        records = [];

        cursor.onsuccess = options.findMany ?
          _.partial(accumulateResults, records, options.query) :
          _.partial(oneResult, records, options.query);

        cursor.onerror = function (e) {
          reject(new Errors.CursorError(e));
        };

        transaction.oncomplete = function (/* e */) {
          db.close();
          resolve(records);
        };

        transaction.onerror = function (e) {
          reject(new Errors.TransactionError(e));
        };

      };

      connection.onerror = function (e) {
        reject(new Errors.ConnectionError(e));
      };

      connection.onupgradeneeded = _.partial(reconfigureStore, options.storeName);
    });
  };

  var addMany = function (options) {
    options = options || {};
    var connection = IndexedDB.open(options.storeName);

    return new Promise(function (resolve, reject) {
      connection.onsuccess = function (e) {
        var db, transaction, store;

        db = e.target.result;
        transaction = db.transaction([options.storeName], "readwrite");
        store = transaction.objectStore(options.storeName);

        var ids = [];

        _.each(options.records, function (record) {
          var request = store.add(record);
          request.onsuccess = function (e) {
            ids.push(e.target.result);
          };
        });

        transaction.oncomplete = function (/* e */) {
          db.close();
          resolve(ids);
        };

        transaction.onerror = function (e) {
          reject(new Errors.TransactionError(e));
        };
      };

      connection.onerror = function (e) {
        reject(new Errors.ConnectionError(e));
      };

      connection.onupgradeneeded = _.partial(reconfigureStore, options.storeName);
    });
  };

  var update = function (objUpdates, record) {
    var value = record.value;
    _.extend(value, objUpdates);
    var request = record.update(value);

    return new Promise(function (resolve, reject) {
      request.onsuccess = function (e) {
        resolve(e.target.result);
      };
      request.onerror = function (e) {
        reject(new Errors.UpdateError(e));
      };
    });
  };

  var del = function (records) {
    var values = _.map(records, function (record) {
      return record.value;
    });

    return new Promise(function (resolve, reject) {
      var request = _.each(records, function (record) {
        record.delete(record.value);
      });
      request.onsuccess = function () {
        resolve(values);
      };
      request.onerror = function (e) {
        reject(new Errors.DeletionError(e));
      };
    });
  };

  return {
    get: get,
    getMany: getMany,
    addMany: addMany,
    update: update,
    del: del,
    indexField: indexField,
    createStore: createStore
  };
});