define([
  "lodash",
  "bluebird",
  "./errors",
  "./query"
], function (_, Promise, Errors, Query) {

  Promise.longStackTraces();

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
      records.push(cursor.value);
    }
    cursor.continue();
  };

  var oneResult = function (records, query, e) {
    var cursor = e.target.result;
    if (!cursor) { return; }
    if (!query || query.isMatch(cursor.value)) {
      records.push(cursor.value);
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

  var deleteDatabase = function (dbName) {
    var request = IndexedDB.deleteDatabase(dbName);
    return new Promise(function (resolve, reject) {
      request.onsuccess = function (e) {
        resolve();
      };

      request.onblocked = function (e) {
        reject(true);
      };

      request.onerror = function (e) {
        reject();
      };
    });
  };

  var openDatabase = function (dbName, schemaUpdateFn, version) {
    var connection, updateRequired;

    connection = version ?
      IndexedDB.open(dbName, version) :
      IndexedDB.open(dbName);

    updateRequired = !!schemaUpdateFn;

    return new Promise(function (resolve, reject) {
      connection.onerror = function (e) {
        reject(new Errors.ConnectionError(e.target.error));
      };

      connection.onsuccess = function (e) {
        var
          db = e.target.result,
          currentVersion = db.version;

        if (schemaUpdateFn && updateRequired) {
          db.close();
          resolve(openDatabase(dbName, schemaUpdateFn, currentVersion + 1));
        }

        resolve(e.target.result);
      };

      connection.onupgradeneeded = function (e) {
        var db = e.target.result;
        schemaUpdateFn(db);
        updateRequired = false;
      };
    });
  };

  var _createDatastore = function (db, options) {
    if (!db.objectStoreNames.contains(options.dsName)) {
      var datastore = db.createObjectStore(options.dsName, {
        keyPath: options.keyPath,
        autoIncrement: options.autoIncrement
      });

      _.each(options.indexes, function (fieldOptions, fieldName) {
        datastore.createIndex(fieldName, fieldName, fieldOptions);
      });
    }
  };

  var createDatastore = function (options) {
    return openDatabase(options.dbName, function (db) {
      _createDatastore(db, options);
    }).then(function (db) {
      db.close();
    });
  };

  var deleteDatastore = function (options) {
    return openDatabase(options.dbName, function (db) {
      db.deleteObjectStore(options.dsName);
    });
  };

  var createConfigIfMissing = function (dbName) {
    var connection = IndexedDB.open(dbName);

    return new Promise(function (resolve, reject) {
      connection.onerror = function (e) {
        reject(new Errors.ConnectionError(e));
      };

      connection.onsuccess = function (e) {
        var db = e.target.result;
        db.close();
        resolve();
      };

      connection.onupgradeneeded = function (e) {
        var db = e.target.result;
        _createDatastore(db, {
          dsName: "_config",
          autoIncrement: false,
          keyPath: "dsName"
        });
      };
    });
  };

  var getMany = function (options) {
    options = options || {};

    var _db,
      query = new Query(options.query);

    return openDatabase(options.dbName)
      .then(function (db) {
        _db = db;

        var
          records = [],
          transaction = db.transaction([options.dsName], "readwrite"),
          store = transaction.objectStore(options.dsName),
          cursor = options.indexedFieldName ?
            getIndexedCursor(store, options.indexedFieldName, options.indexedValue) :
            getCursor(store);

        cursor.onsuccess = options.findMany ?
          _.partial(accumulateResults, records, query) :
          _.partial(oneResult, records, query);

        return new Promise(function (resolve, reject) {
          cursor.onerror = function (e) {
            reject(new Errors.CursorError(e));
          };

          transaction.oncomplete = function (/* e */) {
            resolve(records);
          };

          transaction.onerror = function (e) {
            reject(new Errors.TransactionError(e));
          };
        });
      })
      .finally(function () {
        _db.close();
      });
  };

  var addMany = function (options) {
    var _db;
    options = options || {};

    return openDatabase(options.dbName)
      .then(function (db) {
        var transaction, store;
        _db = db;
        transaction = db.transaction([options.dsName], "readwrite");
        store = transaction.objectStore(options.dsName);

        return new Promise(function (resolve, reject) {
          var
            ids = [];

          _.each(options.records, function (record) {
            var
              request = store.add(record);
            request.onsuccess = function (e) {
              ids.push(e.target.result);
            };
          });

          transaction.oncomplete = function (/* e */) {
            resolve(ids);
          };

          transaction.onerror = function (e) {
            reject(new Errors.TransactionError(e));
          };
        });
      })
      .finally(function () {
        _db.close();
      });
  };

  var _update = function (newProperties, query, e) {
    var
      cursor = e.target.result,
      value = cursor.value;
    if (!cursor) { return; }
    if (!query || query.isMatch(cursor.value)) {
      _.extend(value, newProperties);
      cursor.update(value);
    }
    cursor.continue();
  };

  var update = function (options) {
    var _db,
      query = new Query(options.query);

    return openDatabase(options.dbName)
      .then(function (db) {
        _db = db;
        var
          transaction = db.transaction([options.dsName], "readwrite"),
          store = transaction.objectStore(options.dsName),
          cursor = getCursor(store);

        cursor.onsuccess = _.partial(_update, options.newProperties, query);

        return new Promise(function (resolve, reject) {
          cursor.onerror = function (e) {
            reject(new Errors.CursorError(e));
          };

          transaction.oncomplete = function (/* e */) {
            resolve();
          };

          transaction.onerror = function (e) {
            reject(new Errors.TransactionError(e));
          };
        });
      })
      .finally(function () {
        _db.close();
      });
  };

  var del = function (options) {
    var _db;
    return openDatabase(options.dbName)
      .then(function (db) {
        _db = db;
        var
          transaction = db.transaction([options.dsName], "readwrite"),
          store = transaction.objectStore(options.dsName);

        _.each(options.keys, function (key) {
          store.delete(key);
        });
      })
      .finally(function () {
        _db.close();
      });
  };

  return {
    getMany: getMany,
    addMany: addMany,
    update: update,
    del: del,
    indexField: indexField,
    createDatastore: createDatastore,
    createConfigIfMissing: createConfigIfMissing,
    deleteDatabase: deleteDatabase,
    deleteDatastore: deleteDatastore
  };
});
