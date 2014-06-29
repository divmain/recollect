define(["lodash", "./errors"], function (_) {
  var
    splitOn = /\./,
    operators = ["$eq", "$gt", "$lt", "$gte", "$lte", "$neq", "$regex", "$contains"];

  /**
   * Splits keypath on non-escaped period.
   *
   * @param  {String} keypath  "Escapeable\\.period.delimited.keypath"
   * @return {Array}           ["Escapeable.period", "delimited", "keypath"]
   */
  var getKeypathArray = function (keypath) {
    var
      kpArray = keypath.split(splitOn),
      nodesToMerge = [];

    if (kpArray.length === 1) { return kpArray; }

    _.each(kpArray, function (node, index) {
      if (node[node.length - 1] === "\\") { nodesToMerge.push(index); }
    });
    nodesToMerge.reverse();

    _.each(nodesToMerge, function (index) {
      var removed;
      if (index === kpArray.length - 1) { return; }
      removed = kpArray.splice(index + 1, 1);
      kpArray[index] = kpArray[index].slice(0, -1) + "." + removed;
    });

    return kpArray;
  };

  var getDeepValue = function (object, keypathArray) {
    var
      ref = object;

    for (var i = 0; i < keypathArray.length; i++) {
      var keyAtNode = keypathArray[i];
      ref = ref[keyAtNode];
      if (_.isUndefined(ref)) { return undefined; }
    }

    return ref;
  };

  var compare = function (deepValue, operator, referenceVal) {
    if (operator === "$eq") { return deepValue === referenceVal; }
    if (operator === "$gt") { return deepValue > referenceVal; }
    if (operator === "$lt") { return deepValue < referenceVal; }
    if (operator === "$gte") { return deepValue >= referenceVal; }
    if (operator === "$lte") { return deepValue <= referenceVal; }
    if (operator === "$neq") { return deepValue !== referenceVal; }
    if (operator === "$regex") { return referenceVal.test(deepValue); }
    if (operator === "$contains") {
      return _.isString(deepValue) &&
        _.isString(referenceVal) &&
        deepValue.indexOf(referenceVal) > 0;
    }
    return false;
  };

  var isComparisonObj = function (comparisonObj) {
    return _.all(comparisonObj, function (val, prop) {
      return _.contains(operators, prop);
    });
  };

  var Query = function (queryLiteral) {
    this.assimilate(queryLiteral);
    return this;
  };

  Query.prototype.assimilate = function (queryLiteral) {
    this._query = _.map(queryLiteral, function (queryAspect, keypath) {
      var conditions;
      if (_.isObject(queryAspect) && isComparisonObj(queryAspect)) {
        conditions = queryAspect;
      } else if (_.isRegExp(queryAspect)) {
        conditions = { $regex: queryAspect };
      } else {
        conditions = { $eq: queryAspect };
      }
      return {
        keypathArray: getKeypathArray(keypath),
        conditions: conditions
      };
    });
  };

  this._query = {
    age: { $lt: 200, $gt: 50 },
    "stuff.otherstuff": 2014, // { $eq: 2014 }
    "employer": /.*lds$/      // { $regex: /.*lds$/ }
  };

  Query.prototype.isMatch = function (obj) {
    return _.all(this._query, function (queryAspect) {
      var deepValue = getDeepValue(obj, queryAspect.keypathArray);
      return !_.isUndefined(deepValue) &&
        _.all(queryAspect.conditions, function (referenceVal, operator) {
          return compare(deepValue, operator, referenceVal);
        });
    });
  };

  return Query;
});
