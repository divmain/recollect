define(["lodash", "./errors"], function (_, Errors) {
  var compare = function (operator, a, b) {
    if (operator === "$gt") { return a > b; }
    if (operator === "$lt") { return a < b; }
    if (operator === "$gte") { return a >= b; }
    if (operator === "$lte") { return a <= b; }
    if (operator === "$neq") { return a !== b; }
    if (operator === "$eq") { return a === b; }
    if (operator === "$regex") {
      return (new RegExp(b)).test(a);
    }
    if (operator === "$contains") {
      return _.isString(a) && _.isString(b) && a.indexOf(b) > 0;
    }
    return false;
  };

  var validate = function (conditions, record) {
    return _.all(conditions, function (operator, comparitor) {
      return compare(operator, record.value, comparitor);
    });
  };

  var normalizeOptions = function (options, requiredOptions, defaults) {
    _.each(requiredOptions, function (requiredOption) {
      if (!(requiredOption in options)) {
        throw new Errors.InvalidArgumentError(requiredOption + " is a required option.");
      }
    });
    return _.extend({}, defaults, options);
  };


  // from lodash: partial, extend, each, map, pluck, isObject, isUndefined, isArray, isString

  return {
    compare: compare,
    validate: validate,
    normalizeOptions: normalizeOptions
  };
});
