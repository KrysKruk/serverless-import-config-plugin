import differenceWith from 'lodash.differencewith';
import isEqual from 'lodash.isequal';
import { isObject } from "./utils"

const merge = (target: any, source: any): object => {
  if (source == null) {
    return target
  }

  if (Array.isArray(target) && Array.isArray(source)) {
    // add unique elements of source into target with deep equality comparison
    return target.concat(differenceWith(source, target, isEqual));
  }

  Object.entries(source).forEach(([key, value]) => {
    if (isObject(value) && isObject(target[key])) {
      // merge deeply
      target[key] = merge(target[key], value)
    } else if (target[key] === undefined) {
      // set new value but do not override
      target[key] = value
    }
  })
  return target
}

export default merge
