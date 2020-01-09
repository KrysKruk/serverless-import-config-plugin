import { isObject } from './utils'

const merge = (target: any, source: any): object => {
  if (source == null) {
    return target
  }

  if (Array.isArray(target) && Array.isArray(source)) {
    // add unique elements of source into target
    return target.concat(source.filter(elem => !target.includes(elem)))
  }

  Object.entries(source).forEach(([key, value]) => {
    if (isObject(value) && isObject(target[key])) {
      // merge deeply
      target[key] = merge(target[key], value)
    } else if (!(key in target)) {
      // set new value but do not override
      target[key] = value
    }
  })
  return target
}

export default merge
