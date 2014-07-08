define("recollect", [
  "lodash",
  "./errors",
  "./ixdb",
  "./utils"
], function (_, Errors, ixdb, utils) {

  /**
   * Constructor for ObjectStore.  Should not be instantiated directly.
   */
  var ObjectStore = function (options) {
    options = options || {};
    _.extend(this, options);
  };

  /**
   * Given a query, resolves to an array of all matching objects in object store.
   *
   * @param  {Object} query  Query conforming to Query object literal format.
   *
   * @return {Promise}       Resolves to array of matching objects on success, or
   *                         an emtry array if not matches are found.
   */
  ObjectStore.prototype.find = function (query) {
    return ixdb.get({
      dbName: this.dbName,
      osName: this.osName,
      query: query,
      findMany: true
    });
  };

  /**
   * Given a query, resolves to the first matching object in object store.
   *
   * @param  {Object} query  Query conforming to Query object literal format.
   *
   * @return {Promise}       Resolves to the first matching object on success, or
   *                         undefined if no matches are found.
   */
  ObjectStore.prototype.findOne = function (query) {
    return ixdb.get({
      dbName: this.dbName,
      osName: this.osName,
      query: query,
      findMany: false
    }).then(function (records) {
      return records.length && records[0] || undefined;
    });
  };

  /**
   * Given a name of an indexed field and the value for that field, performs additional
   * filters using provided query, and resolves to an array of all matching objects.
   *
   * @param  {String} indexedFieldName  Name of field that has been indexed.
   * @param           indexedValue      Value of field in object to find.
   * @param  {Object} query             Query conforming to Query object literal format.
   *
   * @return {Promise}                  Resolves to array of matching objects on success, or
   *                                    an empty array if no matches are found.
   */
  ObjectStore.prototype.findByIndex = function (indexedFieldName, indexedValue, query) {
    return ixdb.get({
      dbName: this.dbName,
      osName: this.osName,
      query: query,
      findMany: true,
      indexedFieldName: indexedFieldName,
      indexedValue: indexedValue
    });
  };

  /**
   * Given a name of an indexed field and the value for that field, performs additional
   * filters using provided query, and resolves to the first matching object.
   *
   * @param  {String} indexedFieldName  Name of field that has been indexed.
   * @param           indexedValue      Value of field in object to find.
   * @param  {Object} query             Query conforming to Query object literal format.
   *
   * @return {Promise}                  Resolves to object on success or undefined if not found.
   */
  ObjectStore.prototype.findOneByIndex = function (indexedFieldName, indexedValue, query) {
    return ixdb.get({
      dbName: this.dbName,
      osName: this.osName,
      query: query,
      findMany: false,
      indexedFieldName: indexedFieldName,
      indexedValue: indexedValue
    }).then(function (records) {
      return records.length && records[0] || undefined;
    });
  };

  /**
   * Given an object, inserts object into the object store.
   *
   * @param  {Object} newRecord  Object to insert.
   *
   * @return {Promise}           Resolves to key of inserted object on success.
   */
  ObjectStore.prototype.insertOne = function (newRecord) {
    if (!_.isObject(newRecord)) {
      throw new Errors.InvalidArgumentError("insertOne requires newRecord as argument");
    }
    if (this.autoIncrement && !_.isUndefined(newRecord[this.keyPath])) {
      throw new Errors.InvalidArgumentError("newRecord cannot contain keyPath property");
    }
    if (!this.autoIncrement && _.isUndefined(newRecord[this.keyPath])) {
      throw new Errors.InvalidArgumentError("newRecord must contain keyPath property");
    }

    return ixdb.add({
      dbName: this.dbName,
      osName: this.osName,
      records: [newRecord]
    }).then(function (ids) {
      return ids[0];
    });
  };

  /**
   * Given an array of objects, inserts each object into the object store.
   *
   * @param  {Array} newRecords  Objects to insert into database store.
   *
   * @return {Promise}           Resolves to array of keys of inserted objects.
   */
  ObjectStore.prototype.insertMany = function (newRecords) {
    if (!_.isArray(newRecords)) {
      throw new Error.InvalidArgumentError("newRecords must be an array");
    }
    _.each(newRecords, function (record) {
      if (!_.isUndefined(record._id)) {
        throw new Error.InvalidArgumentError("new records cannot contain `_id` property");
      }
    });

    return ixdb.add({
      dbName: this.dbName,
      osName: this.osName,
      records: newRecords
    });
  };

  /**
   * Given query, finds all matching objects in object store and merges new properties into
   * matching objects.
   *
   * @param  {Object} options
   *
   * @return {Promise}         Resolves with no value on success.
   */
  ObjectStore.prototype.update = function (options) {
    options = utils.normalizeOptions(options, ["query", "newProperties"], {
      dbName: this.dbName,
      osName: this.osName
    });

    return ixdb.update(options);
  };

  /**
   * Given a key path to an existing object in the object store, replaces
   * that object with the provided newObject.
   *
   * @param  {String} keyPath    Key path of object to be overwritten.
   * @param  {Object} newObject  Object to be stored.
   *
   * @return {Promise}           Resolves with no value on success.  Rejects
   *                             with ObjectNotFoundError if key does not
   *                             match existing object.
   */
  ObjectStore.prototype.replace = function (keyPath, newObject) {
    return ixdb.replace({
      dbName: this.dbName,
      osName: this.osName,
      keyPath: keyPath,
      newObject: newObject
    });
  };

  /**
   * Deletes object from store by key.
   *
   * @param  {String} keyPath  Value corresponding to keyPath in object to delete.
   *
   * @return {Promise}         Resolves with no value on success.
   */
  ObjectStore.prototype.delete = function (keyPath) {
    return ixdb.del({
      dbName: this.dbName,
      osName: this.osName,
      keys: [keyPath]
    });
  };

  /**
   * Removes object store from database.
   *
   * @return {Promise}  Resolves with no value on success.
   */
  ObjectStore.prototype.drop = function () {
    var self = this;
    return ixdb.deleteObjectStore({
      osName: this.osName,
      dbName: this.dbName
    }).then(function () {
      return ixdb.del({
        dbName: self.dbName,
        osName: "_config",
        keys: [self.osName],
      });
    }).then(function () {
      delete self._db[self.osName];
    });
  };

  /**
   * Creates instance of ObjectStore, and attaches instance as property on
   * parent Recollect instance.
   *
   * @param  {Object}    recollect  Parent recollect instance.
   * @param  {IDXCursor} dsRecord   Cursor for record in `_config`
   */
  var initObjectStoreObject = function (recollect, dsRecord) {
    var osName = dsRecord.osName;

    if (osName === "_config") {
      return;
    }
    if (!_.isUndefined(recollect[osName])) {
      throw new Errors.InitializationError("Invalid object store name or Recollect instance " +
        "already initialized.");
    }

    recollect[osName] = new ObjectStore(_.extend({}, dsRecord, {
      _db: recollect,
      dbName: recollect.dbName
    }));
  };

  /**
   * Constructor for Recollect object.  Provides an interface for interacting with
   * IndexedDB databases and object stores.  Should be `initialize`d before use.
   *
   * @param {String} name  Name database (scoped to FQDN and port)
   */
  var Recollect = function (name) {
    if (!name) {
      throw new Errors.InvalidArgumentError("You must provide a database name.");
    }
    this.dbName = name;
    return this;
  };

  /**
   * Iterates through database's `_config` object store.  For each record found
   * of name `n`, create `this.n` instance of ObjectStore prototype.
   *
   * @return {Promise}  Resolves to Recollect instance after ObjectStore instances
   *                    have successfully been attached.
   */
  Recollect.prototype.initialize = function () {
    var self = this;

    return ixdb.createConfigIfMissing(this.dbName)
      .then(function () {
        return ixdb.get({
          dbName: self.dbName,
          osName: "_config",
          query: null,
          findMany: true
        }).then(function (objectStoreRecords) {
          _.each(objectStoreRecords, _.partial(initObjectStoreObject, self));
          return self;
        });
      });
  };

  /**
   * Creates and configures new object store.
   *
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
  Recollect.prototype.createObjectStore = function (options) {
    var self = this;

    options = utils.normalizeOptions(options, ["osName"], {
      autoIncrement: true,
      keyPath: "_id",
      indexes: {}
    });

    return ixdb.createObjectStore(_.extend({}, options, { dbName: this.dbName }))
      .then(function (/* object store */) {
        return ixdb.add({
          dbName: self.dbName,
          osName: "_config",
          records: [{
            osName: options.osName,
            autoIncrement: options.autoIncrement,
            keyPath: options.keyPath,
            indexes: options.indexes,
            created: (new Date()).getTime(),
            lastSynced: null
          }]
        });
      })
      .then(function () {
        initObjectStoreObject(self, { osName: options.osName });
      });
  };

  /**
   * Drops database from IndexedDB.
   *
   * @return {Promise}    Resolves with no value on success.
   */
  Recollect.prototype.drop = function () {
    return ixdb.deleteDatabase(this.dbName);
  };

  Recollect.prototype.ObjectStore = ObjectStore;
  Recollect.prototype.Errors = Errors;

  return Recollect;
});
