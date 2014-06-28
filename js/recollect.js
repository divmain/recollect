define("recollect", [
  "lodash",
  "./errors",
  "./ixdb"
], function (_, Errors, ixdb) {

  var Recollect = function (name) {
    if (!name) {
      throw new Errors.InvalidArgumentError("You must provide a database name.");
    }
    this.name = name;
    return this;
  };

  Recollect.prototype.Errors = Errors;

  Recollect.prototype.createStore = function (storeName) {
    return ixdb.createStore(storeName);
  };

  Recollect.prototype.find = function (query) {
    return ixdb.getMany({
      storeName: this.name,
      query: query,
      findMany: true
    }).then(function (records) {
      return _.pluck(records, "value");
    });
  };

  Recollect.prototype.findOne = function (query) {
    return ixdb.getMany({
      storeName: this.name,
      query: query,
      findMany: false
    }).then(function (records) {
      return records.length && records[0].value || undefined;
    });
  };

  Recollect.prototype.findByIndex = function (indexedFieldName, indexedValue, query) {
    return ixdb.getMany({
      storeName: this.name,
      query: query,
      findMany: true,
      indexedFieldName: indexedFieldName,
      indexedValue: indexedValue
    }).then(function (records) {
      return _.pluck(records, "value");
    });
  };

  Recollect.prototype.findOneByIndex = function (indexedFieldName, indexedValue, query) {
    return ixdb.getMany({
      storeName: this.name,
      query: query,
      findMany: false,
      indexedFieldName: indexedFieldName,
      indexedValue: indexedValue
    }).then(function (records) {
      return records.length && records[0].value || undefined;
    });
  };

  Recollect.prototype.insertOne = function (newRecord) {
    if (!_.isObject(newRecord)) {
      throw new Error.InvalidArgumentError("insertOne requires newRecord as argument");
    }
    if (!_.isUndefined(newRecord._id)) {
      throw new Error.InvalidArgumentError("newRecord cannot contain `_id` property");
    }

    return ixdb.addMany({
      storeName: this.name,
      records: [newRecord]
    }).then(function (records) {
      return records[0].value;
    });
  };

  Recollect.prototype.insertMany = function (newRecords) {
    if (!_.isArray(newRecords)) {
      throw new Error.InvalidArgumentError("newRecords must be an array");
    }
    _.each(newRecords, function (record) {
      if (!_.isUndefined(record._id)) {
        throw new Error.InvalidArgumentError("new records cannot contain `_id` property");
      }
    });

    return ixdb.addMany({
      storeName: this.name,
      records: newRecords
    }).then(function (records) {
      return _.map(records, function (record) { return record.value; });
    });
  };

  Recollect.prototype.update = function (recordUpdates) {
    if (!_.isObject(recordUpdates)) {
      throw new Error.InvalidArgumentError("update requires recordUpdates as argument");
    }
    if (_.isUndefined(recordUpdates._id)) {
      throw new Error.InvalidArgumentError("update requires recordUpdates with `_id` property");
    }

    return ixdb.get({
      storeName: this.name,
      _id: recordUpdates._id
    }).then(_.partial(ixdb.update, recordUpdates));
  };

  Recollect.prototype.delete = function (query) {
    return ixdb.getMany(this.name, query, true)
      .then(ixdb.del);
  };

  Recollect.prototype.indexField = function (fieldName, isArray) {
    ixdb.indexField(this.name, fieldName, isArray);
  };

  return Recollect;
});
