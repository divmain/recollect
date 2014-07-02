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

  var inherit = function (Child, Parent) {
    var hasOwn = Object.prototype.hasOwnProperty;

    var Intermediate = function () {
      this.constructor = Child;
      this.constructor$ = Parent;
      for (var prop in Parent.prototype) {
        if (hasOwn.call(Parent.prototype, prop) && prop.slice(-1) !== "$") {
          this[prop + "$"] = Parent.prototype[prop]
        }
      }
    };

    Intermediate.prototype = Parent.prototype;
    Child.prototype = new Intermediate();
    return Child.prototype;
  };

  return {
    normalizeOptions: normalizeOptions,
    inherit: inherit
  };
});