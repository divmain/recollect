define([
  "lodash",
  "bluebird",
  "./errors",
  "./query"
], function (_, Promise, Errors, Query) {

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
    if (!query || query.isMatch(cursor.value)) {
      records.push(cursor);
    }
    cursor.continue();
  };

  var oneResult = function (records, query, e) {
    var cursor = e.target.result;
    if (!cursor) { return; }
    if (!query || query.isMatch(cursor.value)) {
      records.push(cursor);
      return;
    }
    cursor.continue();
  };

  var indexField = function (dsName, fieldName, isArray) {
    var connection = IndexedDB.open(dsName);
    connection.onsuccess(function (e) {
      var db = e.target.result;
      db.objectStore.createIndex(fieldName, fieldName, {
        unique: false,
        multiEntry: isArray && true || false
      });
    });
  };

  var _createDatastore = function (db, options) {
    var datastore = db.createObjectStore(options.name, {
      autoIncrement: options.autoIncrement,
      keyPath: options.keyPath
    });

    _.each(options.indexes, function (fieldOptions, fieldName) {
      datastore.createIndex(fieldName, fieldName, fieldOptions);
    });

    return datastore;
  };

  var createDatastore = function (options) {
    options = options || {};

    var connection = IndexedDB.open(options.databaseName);

    return new Promise(function (resolve, reject) {
      connection.onerror = function (e) {
        reject(new Errors.ConnectionError(e));
      };

      connection.onsuccess = function (e) {
        resolve(_createDatastore(e.target.result, options));
        e.target.result.close();
      };

      // connection.onupgradeneeded = function (e) {
      //   var db = e.target.result;
      //   // if (!db.objectStoreNames.contains(dsName)) {
      //   db.createObjectStore(dsName, {
      //     keyPath: "_id",
      //     autoIncrement: true
      //   });
      //   // }
      // };
    });
  };


  var get = function (options) {
    options = options || {};
    var connection = IndexedDB.open(options.dbName);

    return new Promise(function (resolve, reject) {
      connection.onsuccess = function (e) {
        var db, transaction, store, request;

        db = e.target.result;
        transaction = db.transaction([options.dsName], "readwrite");
        store = transaction.objectStore(options.dsName);
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

      // connection.onupgradeneeded = _.partial(reconfigureStore, options.dsName);
    });
  };

  var getMany = function (options) {
    options = options || {};

    var
      connection = IndexedDB.open(options.dbName),
      query = new Query(options.query);

    return new Promise(function (resolve, reject) {
      connection.onsuccess = function (e) {
        var db, transaction, store, cursor, records;

        db = e.target.result;
        transaction = db.transaction([options.dsName], "readwrite");
        store = transaction.objectStore(options.dsName);

        cursor = options.indexedFieldName ?
          getIndexedCursor(store, options.indexedFieldName, options.indexedValue) :
          getCursor(store);

        records = [];

        cursor.onsuccess = options.findMany ?
          _.partial(accumulateResults, records, query) :
          _.partial(oneResult, records, query);

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

      // connection.onupgradeneeded = _.partial(reconfigureStore, options.dsName);
    });
  };

  var addMany = function (options) {
    options = options || {};
    var connection = IndexedDB.open(options.dbName);

    return new Promise(function (resolve, reject) {
      connection.onsuccess = function (e) {
        var db, transaction, store;

        db = e.target.result;
        transaction = db.transaction([options.dsName], "readwrite");
        store = transaction.objectStore(options.dsName);

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

      // connection.onupgradeneeded = _.partial(reconfigureStore, options.dsName);
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
    createDatastore: createDatastore
  };
});
