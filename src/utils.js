import Errors from "./errors";


const KEYPATH_DELIM = ".";
const ESCAPED_DELIM = "\\.";


/**
 * Splits keypath on non-escaped delimiter.
 *
 * @param  {String} keypath  "Escapeable\\.period.delimited.keypath"
 *
 * @return {Array}           ["Escapeable.period", "delimited", "keypath"]
 */
export function getKeypathArray (keypath) {
  // "hello\\.how.are.you"
  return keypath
    // ["hello", "how.are.you"]
    .split(ESCAPED_DELIM)
    // [["hello"], ["how", "are", "you"]]
    .map(segment => segment.split(KEYPATH_DELIM))
    // ["hello.how", "are", "you"]
    .reduce((combined, segmentArray) => {
      return combined && combined.length && segmentArray.length ?
        // if this is the second or greater segment
        combined
          // return everything but the last element of the combined array so far...
          .slice(0, -1)
          .concat(
            // plus the combined array's last element joined witt the segment's first...
            combined[combined.length - 1] + KEYPATH_DELIM + segmentArray[0],
            // plus the rest of the segment...
            segmentArray.slice(1)
          )
          // making sure to remove any empty strings at the end.
          .filter(x => x) :
        // but, if it is the first or only segment, just return that
        segmentArray;
    }, null);
}

export function getDeepValue (object, keypathArray) {
  let ref = object;
  for (const key of keypathArray) {
    ref = ref[key];
    if (ref === void 0) { return undefined; }
  }
  return ref;
}

export function setDeepValue (object, keypathArray, value) {
  const lastKey = keypathArray[keypathArray.length - 1];
  const anscestors = keypathArray.slice(0, -1);

  let ref = object;
  for (const key of anscestors) {
    if (ref[key] === void 0) {
      ref[key] = {};
    }
    ref = ref[key];
  }
  ref[lastKey] = value;
}

export function normalizeOptions (options, requiredOptions, defaults) {
  (requiredOptions || []).forEach(requiredOption => {
    if (!(requiredOption in options)) {
      throw new Errors.InvalidArgumentError(`${requiredOption} is a required option.`);
    }
  });
  return Object.assign({}, defaults, options);
}

export function all (iterable, condition) {
  for (const a of iterable) {
    if (!condition(a)) {
      return false;
    }
  }
  return true;
}
