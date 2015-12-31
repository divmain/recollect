import isRegExp from "lodash/lang/isRegExp";
import isString from "lodash/lang/isString";
import isObject from "lodash/lang/isObject";
import isEqual from "lodash/internal/baseIsEqual";

import * as utils from "./utils";


function isEqlRegex (objA, objB) {
  return isRegExp(objA) &&
    isRegExp(objB) &&
    objA.source === objB.source &&
    objA.global === objB.global &&
    objA.ignoreCase === objB.ignoreCase &&
    objA.multiline === objB.multiline;
}

const operators = {
  $eq(deepValue, referenceValue) {
    return isEqlRegex(deepValue, referenceValue) || isEqual(deepValue, referenceValue);
  },
  $gt(deepValue, referenceValue) {
    return deepValue > referenceValue;
  },
  $lt(deepValue, referenceValue) {
    return deepValue < referenceValue;
  },
  $gte(deepValue, referenceValue) {
    return deepValue >= referenceValue;
  },
  $lte(deepValue, referenceValue) {
    return deepValue <= referenceValue;
  },
  $neq(deepValue, referenceValue) {
    return deepValue !== referenceValue;
  },
  $contains(deepValue, referenceValue) {
    return isString(deepValue) &&
      isString(referenceValue) &&
      deepValue.indexOf(referenceValue) > 0;
  },
  $regex(deepValue, regex) {
    return regex.test(deepValue);
  },
  $fn(deepValue, testFn) {
    let isMatch = false;
    try {
      isMatch = testFn(deepValue);
    } catch (e) {
      isMatch = false;
    }
    return isMatch;
  },
  $fnUnsafe(deepValue, testFn) {
    return testFn(deepValue);
  }
};

function isComparisonObj (comparisonObj) {
  return Object.keys(comparisonObj)
    .map(operator => operator in operators)
    .reduce((result, opOkay) => result && opOkay, true);
}

function constructCondition (queryAspect) {
  if (isObject(queryAspect) && isComparisonObj(queryAspect)) {
    const subconditions = Object.keys(queryAspect).map(operator => operators[operator]);
    return val => utils.all(subconditions, subcondition => subcondition(val));
  } else if (isRegExp(queryAspect)) {
    return operators.$regex;
  }
  return operators.$eq;
}

export default function query (queryLiteral) {
  const conditions = Object.keys(queryLiteral).map(keypath => {
    const keypathArray = utils.getKeypathArray(keypath);
    const condition = constructCondition(queryLiteral[keypath]);

    return obj => {
      const deepValue = utils.getDeepValue(obj, keypathArray);
      return condition(deepValue);
    };
  });

  // TODO: refactor to remove `isMatch` object wrapper - just return `isMatch` itself.
  return {
    isMatch(obj) {
      return utils.all(conditions, condition => condition(obj));
    }
  };
}
