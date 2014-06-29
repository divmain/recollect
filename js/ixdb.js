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

  var actionByKey = function (options) {
    options = options || {};
    var connection = IndexedDB.open(options.dbName);

    return new Promise(function (resolve, reject) {
      connection.onsuccess = function (e) {
        var db, transaction, store, request;

        db = e.target.result;
        transaction = db.transaction([options.dsName], "readwrite");
        store = transaction.objectStore(options.dsName);
        request = store.get(options.key);

        request.onsuccess = function (e) {
          options.action(e.target.result);
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

  var del = function (options) {
    return openDatabase(options.dbName)
      .then(function (db) {
        var
          transaction = db.transaction([options.dsName], "readwrite"),
          store = transaction.objectStore(options.dsName);

        _.each(options.keys, function (key) {
          store.delete(key);
        });

        db.close();
      });
  };

  return {
    actionByKey: actionByKey,
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
