define([
  "lodash",
  "./errors"
], function (_, Errors) {

  var normalizeOptions = function (options, requiredOptions, defaults) {
    _.each(requiredOptions, function (requiredOption) {
      if (!(requiredOption in options)) {
        throw new Errors.InvalidArgumentError(requiredOption + " is a required option.");
      }
    });
    return _.extend({}, defaults, options);
  };

  return {
    normalizeOptions: normalizeOptions
  };
});