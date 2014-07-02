define(["lodash", "./errors"], function (_) {
  var
    splitOn = /\./;

  var isEqlRegex = function (objA, objB) {
    return _.isRegExp(objA) &&
      _.isRegExp(objB) &&
      objA.source === objB.source &&
      objA.global === objB.global &&
      objA.ignoreCase === objB.ignoreCase &&
      objA.multiline === objB.multiline;
  };

  var operators = {
    $eq: function (deepValue, referenceValue) {
      return isEqlRegex(deepValue, referenceValue) || deepValue === referenceValue;
    },
    $gt: function (deepValue, referenceValue) {
      return deepValue > referenceValue;
    },
    $lt: function (deepValue, referenceValue) {
      return deepValue < referenceValue;
    },
    $gte: function (deepValue, referenceValue) {
      return deepValue >= referenceValue;
    },
    $lte: function (deepValue, referenceValue) {
      return deepValue <= referenceValue;
    },
    $neq: function (deepValue, referenceValue) {
      return deepValue !== referenceValue;
    },
    $contains: function (deepValue, referenceValue) {
      return _.isString(deepValue) &&
        _.isString(referenceValue) &&
        deepValue.indexOf(referenceValue) > 0;
    },
    $regex: function (deepValue, regex) {
      return regex.test(deepValue);
    },
    $fn: function (deepValue, testFn) {
      return testFn(deepValue);
    }
  };

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

  var isComparisonObj = function (comparisonObj) {
    return _.all(comparisonObj, function (referenceValue, operator) {
      return operator in operators;
    });
  };

  var Query = function (queryLiteral) {
    this.assimilate(queryLiteral);
    return this;
  };

  Query.prototype.assimilate = function (queryLiteral) {
    this._query = _.map(queryLiteral, function (queryAspect, keypath) {
      var conditions = null;
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

  Query.prototype.isMatch = function (obj) {
    return _.all(this._query, function (queryAspect) {
      var deepValue = getDeepValue(obj, queryAspect.keypathArray);
      return !_.isUndefined(deepValue) && queryAspect.conditions &&
        _.all(queryAspect.conditions, function (referenceValue, operator) {
          return operators[operator](deepValue, referenceValue);
        });
    });
  };

  return Query;
});
