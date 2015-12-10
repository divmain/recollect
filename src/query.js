define([
  "lodash",
  "./utils"
], function (_, utils) {

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
      return isEqlRegex(deepValue, referenceValue) || _.isEqual(deepValue, referenceValue);
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
      var isMatch = false;
      try {
        isMatch = testFn(deepValue);
      } catch (e) {
        isMatch = false;
      }
      return isMatch;
    }
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
        keypathArray: utils.getKeypathArray(keypath),
        conditions: conditions
      };
    });
  };

  Query.prototype.isMatch = function (obj) {
    return _.all(this._query, function (queryAspect) {
      var deepValue = utils.getDeepValue(obj, queryAspect.keypathArray);
      return !_.isUndefined(deepValue) && queryAspect.conditions &&
        _.all(queryAspect.conditions, function (referenceValue, operator) {
          return operators[operator](deepValue, referenceValue);
        });
    });
  };

  return Query;
});
