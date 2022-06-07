import type { Configs, Data } from './deep-state.type';

/**
 * Core Utils
 */
export function mapObj<T, U>(obj: Record<string, T>, fn: (value: T, key: string) => U) {
  const map: Record<string, U> = {};
  Object.entries(obj).forEach(([key, value]) => {
    map[key] = fn(value, key);
  });
  return map;
}

export function filterObj<T>(obj: Record<string, T>, fn: (value: T, key: string) => boolean) {
  const filter: Record<string, T> = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (fn(value, key)) {
      filter[key] = value;
    }
  });
  return filter;
}

export function walkObj<T>(obj: Record<string, T>, fn: (value: T, key: string) => void) {
  Object.entries(obj).forEach(([key, value]) => fn(value, key));
}

/**
 * Graph Utils
 */
export function buildDependencyMap(configMap: Configs) {
  const dependencyMap: Record<string, Set<string>> = mapObj(configMap, () => new Set());

  walkObj(configMap, ({ dependencies }, key) => {
    dependencies?.forEach((dependency) => {
      const dependencyKeys = dependency.keys || [dependency.key];
      dependencyKeys.forEach((dependencyKey) => {
        dependencyMap[dependencyKey].add(key);
      });
    });
  });

  return dependencyMap;
}

/**
 * Merge Utils
 */
function getMergeValue(destinationValue: any, sourceValue: any) {
  if (Array.isArray(destinationValue) && Array.isArray(sourceValue)) {
    return mergeArray(destinationValue, sourceValue);
  }

  if (typeof destinationValue === 'object' && typeof sourceValue === 'object') {
    return mergeObj(destinationValue, sourceValue);
  }

  if (typeof sourceValue === 'undefined') {
    return destinationValue;
  }

  return sourceValue;
}

function mergeArray(destination: any[], source: any[]) {
  const mergedArray = [...destination];

  source.forEach((value, index) => {
    mergedArray[index] = getMergeValue(mergedArray[index], value);
  });

  return mergedArray;
}

function mergeObj(destination: Data | null, source: Data | null) {
  if (!destination || !source) return destination || source;

  const mergedObj = { ...destination };

  walkObj(source, (value, key) => {
    mergedObj[key] = getMergeValue(mergedObj[key], value);
  });

  return mergedObj;
}

export function merge(...sources: any[]) {
  return sources.reduce(getMergeValue);
}

/**
 * Deep Equals Utils
 */
export function deepEquals(a: any, b: any) {
  if (!a || !b) return a === b;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
      if (!deepEquals(a[i], b[i])) return false;
    }

    return true;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;
    if (keysA.some((key) => !keysB.includes(key))) return false;

    for (let i = 0; i < keysA.length; i++) {
      const key = keysA[i];
      if (!deepEquals(a[key], b[key])) return false;
    }

    return true;
  }

  return a === b;
}
