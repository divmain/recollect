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

  var getCursorForKeyPath = function (store, key) {
    var keyRange = IDBKeyRange.only(key);
    return store.openCursor(keyRange);
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

  var deleteDatabase = function (dbName) {
    var request = IndexedDB.deleteDatabase(dbName);
    return new Promise(function (resolve, reject) {
      request.onsuccess = function (/* e */) {
        resolve();
      };

      request.onblocked = function (/* e */) {
        reject(true);
      };

      request.onerror = function (/* e */) {
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

        if (updateRequired) {
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

  var _createObjectStore = function (db, options) {
    if (!db.objectStoreNames.contains(options.osName)) {
      var datastore = db.createObjectStore(options.osName, {
        keyPath: options.keyPath,
        autoIncrement: options.autoIncrement
      });

      _.each(options.indexes, function (fieldOptions, fieldName) {
        datastore.createIndex(fieldName, fieldName, fieldOptions);
      });
    }
  };

  var createObjectStore = function (options) {
    return openDatabase(options.dbName, function (db) {
      _createObjectStore(db, options);
    }).finally(function (db) {
      db.close();
    });
  };

  var deleteObjectStore = function (options) {
    return openDatabase(options.dbName, function (db) {
      db.deleteObjectStore(options.osName);
    }).finally(function (db) {
      db.close();
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
        _createObjectStore(db, {
          osName: "_config",
          autoIncrement: false,
          keyPath: "osName"
        });
      };
    });
  };

  var get = function (options) {
    options = options || {};

    var _db,
      query = new Query(options.query);

    return openDatabase(options.dbName)
      .then(function (db) {
        _db = db;

        var
          records = [],
          transaction = db.transaction([options.osName], "readonly"),
          store = transaction.objectStore(options.osName),
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
        transaction = db.transaction([options.osName], "readwrite");
        store = transaction.objectStore(options.osName);

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
          transaction = db.transaction([options.osName], "readwrite"),
          store = transaction.objectStore(options.osName),
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

  var replace = function (options) {
    var _db;
    
    return openDatabase(options.dbName)
      .then(function (db) {
        _db = db;
        var
          transaction = db.transaction([options.osName], "readwrite"),
          store = transaction.objectStore(options.osName),
          cursor = getCursorForKeyPath(store, options.keyPath),
          success = false;

        return new Promise(function (resolve, reject) {
          cursor.onsuccess = function (e) {
            var cursor = e.target.result;
            if (!cursor) { return; }
            cursor.update(options.newObject);
            success = true;
            cursor.continue();
          };

          cursor.onerror = function (e) {
            reject(new Errors.CursorError(e));
          };

          transaction.oncomplete = function (/* e */) {
            if (success) {
              resolve();
            }
            reject(new Errors.ObjectNotFoundError());
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
          transaction = db.transaction([options.osName], "readwrite"),
          store = transaction.objectStore(options.osName);

        _.each(options.keys, function (key) {
          store.delete(key);
        });
      })
      .finally(function () {
        _db.close();
      });
  };

  return {
    get: get,
    addMany: addMany,
    update: update,
    replace: replace,
    del: del,
    createObjectStore: createObjectStore,
    createConfigIfMissing: createConfigIfMissing,
    deleteDatabase: deleteDatabase,
    deleteObjectStore: deleteObjectStore
  };
});
