/* global window */

import partial from "lodash/function/partial";
import merge from "lodash/object/merge";

import Promise from "./promise";
import * as Errors from "./errors";
import getQueryFn from "./query";
import * as utils from "./utils";


const IndexedDB = window.indexedDB ||
  window.webkitIndexedDB ||
  window.mozIndexedDB ||
  window.oIndexedDB ||
  window.msIndexedDB;
const IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange;

if (IndexedDB === void 0) {
  throw new Errors.IndexedDbNotFound();
}

function getCursor (store) {
  const keyRange = IDBKeyRange.lowerBound(0);
  return store.openCursor(keyRange);
}

function getIndexedCursor (store, indexedField, indexedValue) {
  const keyRange = IDBKeyRange.only(indexedValue);
  return store.index(indexedField).openCursor(keyRange);
}

function getCursorForKey (store, key) {
  const keyRange = IDBKeyRange.only(key);
  return store.openCursor(keyRange);
}

function accumulateResults (records, queryFn, ev) {
  const cursor = ev.target.result;
  if (!cursor) { return; }
  if (!queryFn || queryFn(cursor.value)) {
    records.push(cursor.value);
  }
  cursor.continue();
}

function oneResult (records, queryFn, ev) {
  const cursor = ev.target.result;
  if (!cursor) { return; }
  if (!queryFn || queryFn(cursor.value)) {
    records.push(cursor.value);
    return;
  }
  cursor.continue();
}

export function deleteDatabase (dbName) {
  return new Promise((resolve, reject) => {
    const request = IndexedDB.deleteDatabase(dbName);
    request.onsuccess = (/* ev */) => resolve();
    request.onblocked = (/* ev */) => reject(true);
    request.onerror = (/* ev */) => reject();
  });
}

function openDatabase (dbName, schemaUpdateFn, version) {
  const connection = version ?
    IndexedDB.open(dbName, version) :
    IndexedDB.open(dbName);

  let updateRequired = !!schemaUpdateFn;

  return new Promise((resolve, reject) => {
    connection.onerror = ev => reject(new Errors.ConnectionError(ev.target.error));

    connection.onsuccess = ev => {
      const db = ev.target.result;
      const currentVersion = db.version;

      if (updateRequired) {
        db.close();
        resolve(openDatabase(dbName, schemaUpdateFn, currentVersion + 1));
      }

      resolve(ev.target.result);
    };

    connection.onupgradeneeded = ev => {
      const db = ev.target.result;
      schemaUpdateFn(db);
      updateRequired = false;
    };
  });
}

function withDatabase (dbName, cb) {
  return openDatabase(dbName)
    .then(db => Promise.resolve()
      .then(() => cb(db))
      .finally(() => db.close()));
}

function _createObjectStore (db, options) {
  if (!db.objectStoreNames.contains(options.osName)) {
    const datastore = db.createObjectStore(options.osName, {
      keyPath: options.keyPath,
      autoIncrement: options.autoIncrement
    });

    Object.keys(options.indexes || {}).forEach(fieldName => {
      const fieldOptions = options.indexes[fieldName];
      datastore.createIndex(fieldName, fieldName, fieldOptions);
    });
  }
}

export function createObjectStore (options) {
  let _db;
  return openDatabase(options.dbName, db => {
    _db = db;
    _createObjectStore(db, options);
  }).finally(() => _db.close());
}

export function deleteObjectStore (options) {
  let _db;
  return openDatabase(options.dbName, db => {
    _db = db;
    db.deleteObjectStore(options.osName);
  }).finally(() => _db.close());
}

export function createConfigIfMissing (dbName) {
  const connection = IndexedDB.open(dbName);

  return new Promise((resolve, reject) => {
    connection.onerror = ev => reject(new Errors.ConnectionError(ev.target.error));
    connection.onsuccess = ev => {
      const db = ev.target.result;
      db.close();
      resolve();
    };

    connection.onupgradeneeded = ev => {
      const db = ev.target.result;
      _createObjectStore(db, {
        osName: "_config",
        autoIncrement: false,
        keyPath: "osName"
      });
    };
  });
}

export function get (options = {}) {
  const queryFn = getQueryFn(options.query);

  return withDatabase(options.dbName, db => {
    const records = [];
    const transaction = db.transaction([options.osName], "readonly");
    const store = transaction.objectStore(options.osName);
    const cursor = options.indexedFieldName ?
      getIndexedCursor(store, options.indexedFieldName, options.indexedValue) :
      getCursor(store);

    cursor.onsuccess = options.findMany ?
      partial(accumulateResults, records, queryFn) :
      partial(oneResult, records, queryFn);

    return new Promise((resolve, reject) => {
      cursor.onerror = ev => reject(new Errors.CursorError(ev.target.error));
      transaction.oncomplete = (/* ev */) => resolve(records);
      transaction.onerror = ev => reject(new Errors.TransactionError(ev.target.error));
    });
  });
}

export function add (options = {}) {
  return withDatabase(options.dbName, db => {
    const transaction = db.transaction([options.osName], "readwrite");
    const store = transaction.objectStore(options.osName);

    return new Promise((resolve, reject) => {
      const ids = [];

      options.records.forEach(record => {
        const request = store.add(record);
        request.onsuccess = ev => ids.push(ev.target.result);
      });

      transaction.oncomplete = (/* ev */) => resolve(ids);

      transaction.onerror = ev => reject(new Errors.TransactionError(ev.target.error));
    });
  });
}

function _update (newProperties, queryFn, ev) {
  const cursor = ev.target.result;

  if (!cursor) { return; }
  const value = cursor.value;

  if (!queryFn || queryFn(value)) {
    merge(value, newProperties);
    cursor.update(value);
  }

  cursor.continue();
}

export function update (options) {
  const queryFn = getQueryFn(options.query);

  return withDatabase(options.dbName, db => {
    const transaction = db.transaction([options.osName], "readwrite");
    const store = transaction.objectStore(options.osName);
    const cursor = getCursor(store);

    cursor.onsuccess = partial(_update, options.newProperties, queryFn);

    return new Promise((resolve, reject) => {
      cursor.onerror = ev => reject(new Errors.CursorError(ev.target.error));
      transaction.oncomplete = (/* ev */) => resolve();
      transaction.onerror = ev => reject(new Errors.TransactionError(ev.target.error));
    });
  });
}

export function replace (options) {
  return withDatabase(options.dbName, db => {
    const transaction = db.transaction([options.osName], "readwrite");
    const store = transaction.objectStore(options.osName);
    const cursor = getCursorForKey(store, options.key);
    let success = false;

    return new Promise((resolve, reject) => {
      cursor.onsuccess = ev => {
        const _cursor = ev.target.result;
        if (!_cursor) { return; }

        const keypathArray = utils.getKeypathArray(options.keyPath);
        const newObject = Object.assign({}, options.newObject);
        utils.setDeepValue(
          newObject,
          keypathArray,
          utils.getDeepValue(_cursor.value, keypathArray)
        );

        _cursor.update(newObject);
        success = true;
        _cursor.continue();
      };

      cursor.onerror = ev => reject(new Errors.CursorError(ev.target.error));

      transaction.oncomplete = (/* ev */) =>
        success ? resolve() : reject(new Errors.ObjectNotFoundError());

      transaction.onerror = ev => reject(new Errors.TransactionError(ev.target.error));
    });
  });
}

export function del (options) {
  return withDatabase(options.dbName, db => {
    const transaction = db.transaction([options.osName], "readwrite");
    const store = transaction.objectStore(options.osName);
    (options.keys || []).forEach(key => store.delete(key));
  });
}
