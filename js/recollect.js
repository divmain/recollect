define("recollect", [
  "lodash",
  "./errors",
  "./ixdb",
  "./utils"
], function (_, Errors, ixdb, utils) {

  var Datastore = function (options) {
    options = options || {};
    this.dsName = options.dsName;
    this.dbName = options.dbName;
  };

  Datastore.prototype.find = function (query) {
    return ixdb.getMany({
      dbName: this.dbName,
      dsName: this.dsName,
      query: query,
      findMany: true
    }).then(function (records) {
      return _.pluck(records, "value");
    });
  };

  Datastore.prototype.findOne = function (query) {
    return ixdb.getMany({
      dbName: this.dbName,
      dsName: this.dsName,
      query: query,
      findMany: false
    }).then(function (records) {
      return records.length && records[0].value || undefined;
    });
  };

  Datastore.prototype.findByIndex = function (indexedFieldName, indexedValue, query) {
    return ixdb.getMany({
      dbName: this.dbName,
      dsName: this.dsName,
      query: query,
      findMany: true,
      indexedFieldName: indexedFieldName,
      indexedValue: indexedValue
    }).then(function (records) {
      return _.pluck(records, "value");
    });
  };

  Datastore.prototype.findOneByIndex = function (indexedFieldName, indexedValue, query) {
    return ixdb.getMany({
      dbName: this.dbName,
      dsName: this.dsName,
      query: query,
      findMany: false,
      indexedFieldName: indexedFieldName,
      indexedValue: indexedValue
    }).then(function (records) {
      return records.length && records[0].value || undefined;
    });
  };

  Datastore.prototype.insertOne = function (newRecord) {
    if (!_.isObject(newRecord)) {
      throw new Error.InvalidArgumentError("insertOne requires newRecord as argument");
    }
    if (!_.isUndefined(newRecord._id)) {
      throw new Error.InvalidArgumentError("newRecord cannot contain `_id` property");
    }

    return ixdb.addMany({
      dbName: this.dbName,
      dsName: this.dsName,
      records: [newRecord]
    }).then(function (records) {
      return records[0].value;
    });
  };

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
    }).then(function (records) {
      return _.map(records, function (record) { return record.value; });
    });
  };

  Datastore.prototype.update = function (recordUpdates) {
    if (!_.isObject(recordUpdates)) {
      throw new Error.InvalidArgumentError("update requires recordUpdates as argument");
    }
    if (_.isUndefined(recordUpdates._id)) {
      throw new Error.InvalidArgumentError("update requires recordUpdates with `_id` property");
    }

    return ixdb.get({
      dbName: this.dbName,
      dsName: this.dsName,
      _id: recordUpdates._id
    }).then(_.partial(ixdb.update, recordUpdates));
  };

  Datastore.prototype.delete = function (query) {
    return ixdb.getMany({
      dbName: this.dbName,
      dsName: this.dsName,
      query: query,
      findMany: true
    }).then(ixdb.del);
  };

  Datastore.prototype.indexField = function (fieldName, isArray) {
    ixdb.indexField(this.dsName, fieldName, isArray);
  };

  /**
   * Creates instance of Datastore, and attaches instance as property on
   * parent Recollect instance.
   *
   * @param  {Object}    recollect  Parent recollect instance.
   * @param  {IDXCursor} dsRecord   Cursor for record in `_config`
   */
  var initDatastoreObject = function (recollect, dsRecord) {
    var dsName = dsRecord.key;
    // var dsConfig = dsRecord.value;

    if (dsName === "_config") {
      return;
    }
    if (!_.isUndefined(recollect[dsName])) {
      throw new Errors.InitializationError("Invalid datastore name or Recollect instance " +
        "already initialized.");
    }
    recollect[dsName] = new Datastore({
      dbName: recollect.dbName,
      dsName: dsName
    });
  };

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
    return ixdb.getMany({
      db: this.name,
      datastore: "_config",
      query: null,
      findMany: true
    }).then(function (datastoreRecords) {
      _.each(datastoreRecords, _.partial(initDatastoreObject, self));
      return self;
    });
  };

  /**
   * Creates and configures new datastore.
   *
   * @param  {String}  options.dsName            Name of new datastore.
   * @param  {Boolean} options.autoIncrement     If true, keys are automatically
   *                                             generated.
   * @param  {String}  options.keyPath           Name of primary key path.
   * @param  {Object}  options.indexes           Object describing fields to index.
   *                     .fieldName.unique       If true, no two entries should share same
   *                                             value in fieldName.
   *                     .fieldName.multiEntry   If true, values in fieldName should be an
   *                                             array of values to be queried independently.
   *
   * @return {Promise}                        Resolves to new datastore object.
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
        initDatastoreObject(self, { key: options.dsName });
      });
  };

  Recollect.prototype.Datastore = Datastore;
  Recollect.prototype.Errors = Errors;


  return Recollect;
});
