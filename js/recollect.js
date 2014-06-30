define("recollect", [
  "lodash",
  "./errors",
  "./ixdb",
  "./utils"
], function (_, Errors, ixdb, utils) {

  /**
   * Constructor for Datastore.  Should not be instantiated directly.
   */
  var Datastore = function (options) {
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
  Datastore.prototype.find = function (query) {
    return ixdb.getMany({
      dbName: this.dbName,
      dsName: this.dsName,
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
  Datastore.prototype.findOne = function (query) {
    return ixdb.getMany({
      dbName: this.dbName,
      dsName: this.dsName,
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
  Datastore.prototype.findByIndex = function (indexedFieldName, indexedValue, query) {
    return ixdb.getMany({
      dbName: this.dbName,
      dsName: this.dsName,
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
  Datastore.prototype.findOneByIndex = function (indexedFieldName, indexedValue, query) {
    return ixdb.getMany({
      dbName: this.dbName,
      dsName: this.dsName,
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
  Datastore.prototype.insertOne = function (newRecord) {
    if (!_.isObject(newRecord)) {
      throw new Error.InvalidArgumentError("insertOne requires newRecord as argument");
    }
    if (this.autoIncrement && !_.isUndefined(newRecord[this.keyPath])) {
      throw new Error.InvalidArgumentError("newRecord cannot contain keyPath property");
    }
    if (!this.autoIncrement && _.isUndefined(newRecord[this.keyPath])) {
      throw new Error.InvalidArgumentError("newRecord must contain keyPath property");
    }

    return ixdb.addMany({
      dbName: this.dbName,
      dsName: this.dsName,
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
  Datastore.prototype.insertMany = function (newRecords) {
    if (!_.isArray(newRecords)) {
      throw new Error.InvalidArgumentError("newRecords must be an array");
    }
    _.each(newRecords, function (record) {
      if (!_.isUndefined(record._id)) {
        throw new Error.InvalidArgumentError("new records cannot contain `_id` property");
      }
    });

    return ixdb.addMany({
      dbName: this.dbName,
      dsName: this.dsName,
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
  Datastore.prototype.update = function (options) {
    options = utils.normalizeOptions(options, ["query", "newProperties"], {
      dbName: this.dbName,
      dsName: this.dsName
    });

    return ixdb.update(options);
  };

  /**
   * Deletes object from store by key.
   *
   * @param             key  Value corresponding to keyPath in object to delete.
   *
   * @return {Promise}       Resolves with no value on success.
   */
  Datastore.prototype.delete = function (key) {
    return ixdb.del({
      dbName: this.dbName,
      dsName: this.dsName,
      keys: [key]
    });
  };

  /**
   * Removes object store from database.
   *
   * @return {Promise}  Resolves with no value on success.
   */
  Datastore.prototype.drop = function () {
    var self = this;
    return ixdb.deleteDatastore({
      dsName: this.dsName,
      dbName: this.dbName
    }).then(function () {
      return ixdb.del({
        dbName: self.dbName,
        dsName: "_config",
        keys: [self.dsName],
      });
    }).then(function () {
      delete self._db[self.dsName];
    });
  };

  /**
   * Creates instance of Datastore, and attaches instance as property on
   * parent Recollect instance.
   *
   * @param  {Object}    recollect  Parent recollect instance.
   * @param  {IDXCursor} dsRecord   Cursor for record in `_config`
   */
  var initDatastoreObject = function (recollect, dsRecord) {
    var dsName = dsRecord.dsName;
    // var dsConfig = dsRecord.value;

    if (dsName === "_config") {
      return;
    }
    if (!_.isUndefined(recollect[dsName])) {
      throw new Errors.InitializationError("Invalid datastore name or Recollect instance " +
        "already initialized.");
    }

    recollect[dsName] = new Datastore(_.extend({}, dsRecord, {
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
   * Iterates through database's `_config` datastore.  For each record found
   * of name `n`, create `this.n` instance of Datastore prototype.
   *
   * @return {Promise}  Resolves to Recollect instance after Datastore instances
   *                    have successfully been attached.
   */
  Recollect.prototype.initialize = function () {
    var self = this;

    return ixdb.createConfigIfMissing(this.dbName)
      .then(function () {
        return ixdb.getMany({
          dbName: self.dbName,
          dsName: "_config",
          query: null,
          findMany: true
        }).then(function (datastoreRecords) {
          _.each(datastoreRecords, _.partial(initDatastoreObject, self));
          return self;
        });
      });
  };

  /**
   * Creates and configures new datastore.
   *
   * @param  {String}  options.dsName              Name of new datastore.
   * @param  {Boolean} options.autoIncrement       If true, keys are automatically
   *                                               generated.
   * @param  {String}  options.keyPath             Name of primary key path.
   * @param  {Object}  options.indexes             Object describing fields to index.
   *                     .[fieldName].unique       If true, no two entries should share same
   *                                               value in fieldName.
   *                     .[fieldName].multiEntry   If true, values in fieldName should be an
   *                                               array of values to be queried independently.
   *
   * @return {Promise}                             Resolves to new datastore object.
   */
  Recollect.prototype.createDatastore = function (options) {
    var self = this;

    options = utils.normalizeOptions(options, ["dsName"], {
      autoIncrement: true,
      keyPath: "_id",
      indexes: {}
    });

    return ixdb.createDatastore(_.extend({}, options, { dbName: this.dbName }))
      .then(function (/* datastore */) {
        return ixdb.addMany({
          dbName: self.dbName,
          dsName: "_config",
          records: [{
            dsName: options.dsName,
            autoIncrement: options.autoIncrement,
            keyPath: options.keyPath,
            indexes: options.indexes,
            created: (new Date()).getTime(),
            lastSynced: null
          }]
        });
      })
      .then(function () {
        initDatastoreObject(self, { dsName: options.dsName });
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

  Recollect.prototype.Datastore = Datastore;
  Recollect.prototype.Errors = Errors;

  return Recollect;
});
