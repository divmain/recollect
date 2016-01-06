import isObject from "lodash/lang/isObject";
import isArray from "lodash/lang/isArray";
import isUndefined from "lodash/lang/isUndefined";

import * as Errors from "./errors";
import * as ixdb from "./ixdb";
import * as utils from "./utils";

export * as Errors from "./errors";


/**
 * Return modified query, accounting for Recollect-specific storage format for
 * records in IndexedDB object store.
 *
 * @param  {Object} query Query-literal.
 *
 * @return {Object}       Query-literal with modified keypaths.
 */
function getIxdbQuery (query) {
  return Object.keys(query || {}).reduce((modified, keyPath) => {
    const escapedKey = keyPath.indexOf("$meta.") === 0 ? keyPath : `$data.${keyPath}`;
    modified[escapedKey] = query[keyPath];
    return modified;
  }, {});
}

/**
 * Given an object to store, return a corresponding object conforming to Recollect's
 * storage format.
 *
 * @param  {Object} newRecord   Object to store
 *
 * @return {Object}             New Recollect record.
 */
function getNewRecord (newRecord) {
  return {
    $data: newRecord,
    $meta: {
      created: Date.now(),
      modified: null
    }
  };
}

/**
 * Given properties with which to update Recollect records, return corresponding
 * object to merge into existing records.
 *
 * @param  {Object} updatedProperties   Record updates.
 *
 * @return {Object}                     Object to merge into matching records.
 */
function getRecordUpdate (updatedProperties) {
  return {
    $data: updatedProperties,
    $meta: {
      modified: Date.now()
    }
  };
}

/**
 * ObjectStore should not be instantiated directly.
 */
export class ObjectStore {
  constructor (opts = {}) {
    Object.assign(this, opts);
  }

  /**
   * Given a query, resolves to an array of all matching objects in object store.
   *
   * @param  {Object} query  Query conforming to Query object literal format.
   *
   * @return {Promise}       Resolves to array of matching objects on success, or
   *                         an emtry array if not matches are found.
   */
  find (query) {
    return ixdb.get({
      dbName: this.dbName,
      osName: this.osName,
      query: getIxdbQuery(query),
      findMany: true
    }).then(records => records.map(record => record.$data));
  }

  /**
   * Given a query, resolves to the first matching object in object store.
   *
   * @param  {Object} query  Query conforming to Query object literal format.
   *
   * @return {Promise}       Resolves to the first matching object on success, or
   *                         undefined if no matches are found.
   */
  findOne (query) {
    return ixdb.get({
      dbName: this.dbName,
      osName: this.osName,
      query: getIxdbQuery(query),
      findMany: false
    }).then(records => records.length && records[0].$data || undefined);
  }

  /**
   * Given a name of an indexed field and the value for that field, performs additional
   * filters using provided query, and resolves to an array of all matching objects.
   *
   * @param  {String} indexedFieldName  Name of field that has been indexed.
   * @param  {Any}    indexedValue      Value of field in object to find.
   * @param  {Object} query             Query conforming to Query object literal format.
   *
   * @return {Promise}                  Resolves to array of matching objects on success, or
   *                                    an empty array if no matches are found.
   */
  findByIndex (indexedFieldName, indexedValue, query) {
    return ixdb.get({
      dbName: this.dbName,
      osName: this.osName,
      query: getIxdbQuery(query),
      findMany: true,
      indexedFieldName: `$data.${indexedFieldName}`,
      indexedValue
    }).then(records => records.map(record => record.$data));
  }

  /**
   * Given a name of an indexed field and the value for that field, performs additional
   * filters using provided query, and resolves to the first matching object.
   *
   * @param  {String} indexedFieldName  Name of field that has been indexed.
   * @param  {Any}    indexedValue      Value of field in object to find.
   * @param  {Object} query             Query conforming to Query object literal format.
   *
   * @return {Promise}                  Resolves to object on success or undefined if not found.
   */
  findOneByIndex (indexedFieldName, indexedValue, query) {
    return ixdb.get({
      dbName: this.dbName,
      osName: this.osName,
      query: getIxdbQuery(query),
      findMany: false,
      indexedFieldName: `$data.${indexedFieldName}`,
      indexedValue
    }).then(records => records.length && records[0].$data || undefined);
  }

  /**
   * Given an object, inserts object into the object store.
   *
   * @param  {Object} newRecord  Object to insert.
   *
   * @return {Promise}           Resolves to key of inserted object on success.
   */
  insertOne (newRecord) {
    if (!isObject(newRecord)) {
      throw new Errors.InvalidArgumentError("insertOne requires newRecord as argument");
    }
    // TODO: Use utils.getKeypathArray and utils.getDeepValue
    if (this.autoIncrement && !isUndefined(newRecord[this.keyPath])) {
      throw new Errors.InvalidArgumentError("newRecord cannot contain keyPath property");
    }
    // TODO: Use utils.getKeypathArray and utils.getDeepValue
    if (!this.autoIncrement && isUndefined(newRecord[this.keyPath])) {
      throw new Errors.InvalidArgumentError("newRecord must contain keyPath property");
    }

    return ixdb.add({
      dbName: this.dbName,
      osName: this.osName,
      records: [getNewRecord(newRecord)]
    }).then(ids => ids[0]);
  }

  /**
   * Given an array of objects, inserts each object into the object store.
   *
   * @param  {Array} newRecords  Objects to insert into database store.
   *
   * @return {Promise}           Resolves to array of keys of inserted objects.
   */
  insertMany (newRecords) {
    if (!isArray(newRecords) || newRecords.length < 1) {
      throw new Errors.InvalidArgumentError("newRecords must be an array");
    }
    for (const record of newRecords) {
      if (!isUndefined(record._id)) {
        throw new Errors.InvalidArgumentError("new records cannot contain `_id` property");
      }
    }

    return ixdb.add({
      dbName: this.dbName,
      osName: this.osName,
      records: newRecords.map(getNewRecord)
    });
  }

  /**
   * Given query, finds all matching objects in object store and merges new properties into
   * matching objects.
   *
   * @param  {Object}  options  Object with at least "query" and "newProperties" props.
   *
   * @return {Promise}          Resolves with no value on success.
   */
  update (options) {
    options = utils.normalizeOptions(options, ["query", "newProperties"], {
      dbName: this.dbName,
      osName: this.osName
    });

    options = Object.assign({}, options, {
      query: getIxdbQuery(options.query),
      newProperties: getRecordUpdate(options.newProperties)
    });

    return ixdb.update(options);
  }

  /**
   * Given a key to an existing object in the object store, replaces
   * that object with the provided newObject.
   *
   * @param  {String} key        Key of object to be overwritten.
   * @param  {Object} newObject  Object to be stored.
   *
   * @return {Promise}           Resolves with no value on success.  Rejects
   *                             with ObjectNotFoundError if key does not
   *                             match existing object.
   */
  replace (key, newObject) {
    return ixdb.replace({
      dbName: this.dbName,
      osName: this.osName,
      key,
      keyPath: this.keyPath,
      newObject: getNewRecord(newObject)
    });
  }

  /**
   * Deletes object from store by key.
   *
   * @param  {String} key      Value corresponding to keyPath in object to delete.
   *
   * @return {Promise}         Resolves with no value on success.
   */
  delete (key) {
    return ixdb.del({
      dbName: this.dbName,
      osName: this.osName,
      keys: [key]
    });
  }

  /**
   * Removes object store from database.
   *
   * @return {Promise}  Resolves with no value on success.
   */
  drop () {
    return ixdb.deleteObjectStore({
      osName: this.osName,
      dbName: this.dbName
    }).then(() => ixdb.del({
      dbName: this.dbName,
      osName: "_config",
      keys: [this.osName]
    })).then(() => {
      delete this._db[this.osName];
    });
  }
}

/**
 * Creates instance of ObjectStore, and attaches instance as property on
 * parent Recollect instance.
 *
 * @param   {Object}    recollect  Parent recollect instance.
 * @param   {IDXCursor} dsRecord   Cursor for record in `_config`
 *
 * @returns {Undefined}            No return value.
 */
function initObjectStoreObject (recollect, dsRecord) {
  const osName = dsRecord.osName;

  if (osName === "_config") { return; }
  if (!isUndefined(recollect[osName])) {
    throw new Errors.InitializationError(
      "Invalid object store name or Recollect instance already initialized.");
  }

  return recollect[osName] = new ObjectStore(Object.assign({}, dsRecord, {
    _db: recollect,
    dbName: recollect.dbName
  }));
}

/**
 * Constructor for Recollect object.  Provides an interface for interacting with
 * IndexedDB databases and object stores.  Should be `initialize`d before use.
 *
 * @param {String} name  Name database (scoped to FQDN and port)
 */
export default class Recollect {
  constructor (name) {
    if (!name) {
      throw new Errors.InvalidArgumentError("You must provide a database name.");
    }
    this.dbName = name;
  }

  /**
   * Iterates through database's `_config` object store.  For each record found
   * of name `n`, create `this.n` instance of ObjectStore prototype.
   *
   * @return {Promise}  Resolves to Recollect instance after ObjectStore instances
   *                    have successfully been attached.
   */
  initialize () {
    return ixdb.createConfigIfMissing(this.dbName)
      .then(() => ixdb.get({
        dbName: this.dbName,
        osName: "_config",
        query: null,
        findMany: true
      }))
      .then(objectStoreRecords => {
        objectStoreRecords.forEach(dsRecord => initObjectStoreObject(this, dsRecord));
        return this;
      });
  }

  /**
   * Creates and configures new object store.
   *
   * @param  {Object}  options                     Options.
   * @param  {String}  options.osName              Name of new object store.
   * @param  {Boolean} options.autoIncrement       If true, keys are automatically
   *                                               generated.
   * @param  {String}  options.keyPath             Name of primary key path.
   * @param  {Object}  options.indexes             Object describing fields to index.
   *                     .[fieldName].unique       If true, no two entries should share same
   *                                               value in fieldName.
   *                     .[fieldName].multiEntry   If true, values in fieldName should be an
   *                                               array of values to be queried independently.
   *
   * @return {Promise}                             Resolves to new object store object.
   */
  createObjectStore (options) {
    options = utils.normalizeOptions(options, ["osName"], {
      autoIncrement: true,
      keyPath: "_id",
      indexes: {}
    });
    options.indexes = Object.keys(options.indexes).reduce((indexes, fieldName) => {
      indexes[`$data.${fieldName}`] = options.indexes[fieldName];
      return indexes;
    }, {});

    const created = Date.now();

    return ixdb.createObjectStore(Object.assign({}, options, { dbName: this.dbName }))
      .then((/* object store */) => ixdb.add({
        dbName: this.dbName,
        osName: "_config",
        records: [{
          osName: options.osName,
          autoIncrement: options.autoIncrement,
          keyPath: options.keyPath,
          indexes: options.indexes,
          created,
          lastSynced: null
        }]
      }))
      .then(() => initObjectStoreObject(this, {
        osName: options.osName,
        autoIncrement: options.autoIncrement,
        keyPath: options.keyPath,
        indexes: options.indexes,
        created,
        lastSynced: null
      }));
  }

  /**
   * Drops database from IndexedDB.
   *
   * @return {Promise}    Resolves with no value on success.
   */
  drop () {
    return ixdb.deleteDatabase(this.dbName);
  }
}
