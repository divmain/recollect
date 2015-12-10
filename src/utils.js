define([
  "lodash",
  "./errors"
], function (_, Errors) {

  var
    splitOn = /\./;

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

    return _.compact(kpArray);
  };

  var getDeepValue = function (object, keypathArray) {
    var keyAtNode,
      ref = object;

    for (var i = 0; i < keypathArray.length; i++) {
      keyAtNode = keypathArray[i];
      ref = ref[keyAtNode];
      if (_.isUndefined(ref)) { return undefined; }
    }

    return ref;
  };

  var setDeepValue = function (object, keypathArray, value) {
    var keyAtNode,
      ref = object;

    for (var i = 0; i < keypathArray.length; i++) {
      keyAtNode = keypathArray[i];

      if (_.isUndefined(ref[keyAtNode])) {
        ref[keyAtNode] = {};
      }

      if (i === keypathArray.length - 1) {
        ref[keyAtNode] = value;
      }
      ref = ref[keyAtNode];
    }
  };

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
          this[prop + "$"] = Parent.prototype[prop];
        }
      }
    };

    Intermediate.prototype = Parent.prototype;
    Child.prototype = new Intermediate();
    return Child.prototype;
  };

  return {
    normalizeOptions: normalizeOptions,
    inherit: inherit,
    getKeypathArray: getKeypathArray,
    getDeepValue: getDeepValue,
    setDeepValue: setDeepValue
  };
});