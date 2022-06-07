import { mapObj, filterObj, buildDependencyMap, merge, deepEquals, walkObj } from './utils';
import type { Configs, Data, DataCollection, Graph, ResetConfig, Subscribers, Updater } from './deep-state.type';

function buildGraphNode(config: Configs[string], nodeKey: string): Graph[string] {
  let currentDependencies = config.dependencies ?? [];
  let currentData = config.data ?? {};
  let prevMergedData: Data;
  let mergedData: Data;

  return {
    get data() {
      return mergedData || currentData;
    },
    calculateNextEffects(graph) {
      mergedData = currentData;

      currentDependencies.forEach((dependency, index) => {
        if (dependency.key) {
          const { data } = graph[dependency.key];
          if (dependency.cond(data)) {
            const dependencyEffects = typeof dependency.effects === 'function' ? dependency.effects(data) : dependency.effects;
            mergedData = merge(mergedData, dependencyEffects);
          }
        } else if (dependency.keys) {
          const filteredGraph = filterObj(graph, (_, key) => dependency.keys.includes(key));
          const dataCollection = mapObj(filteredGraph, (value) => value.data);
          const dataCollectionProxy = new Proxy(dataCollection, {
            get(collection, prop) {
              if (prop in collection) return collection[prop as string];
              throw new Error(`To access '${prop.toString()}' in dependency ${index + 1} of '${nodeKey}' add it to the 'keys' array`);
            },
          });

          if (dependency.cond(dataCollectionProxy)) {
            const dependencyEffects = typeof dependency.effects === 'function' ? dependency.effects(dataCollectionProxy) : dependency.effects;
            mergedData = merge(mergedData, dependencyEffects);
          }
        }
      });

      if (!deepEquals(mergedData, prevMergedData)) {
        prevMergedData = mergedData;
        return true;
      }

      return false;
    },
    resetData: (data) => {
      currentData = data ?? {};
      prevMergedData = {};
      mergedData = {};
    },
    resetDependencies: (dependencies) => {
      currentDependencies = dependencies ?? [];
    },
    setData: (updater) => {
      currentData = typeof updater === 'function' ? updater(currentData) : updater;
    },
  };
}

export function createStore<Collection extends DataCollection = DataCollection>(config: Configs<Collection>) {
  const graph: Graph = mapObj(config as Configs, buildGraphNode);
  const subscribers: Subscribers = new Set();
  let dependencyMap = buildDependencyMap(config as Configs);

  /**
   * Dependencies
   */
  function calculateDependencies(changedKeys = Object.keys(graph)) {
    const dependentKeysToCalculate = new Set(changedKeys);

    while (dependentKeysToCalculate.size > 0) {
      const filteredGraph = filterObj(graph, (_, key) => dependentKeysToCalculate.has(key));
      // calculateNextEffects returns `true` if the calculation resulted in a new set of effects
      const results = mapObj(filteredGraph, (value) => value.calculateNextEffects(graph));
      // Only follow a dependency chain if it changed
      const filteredResults = filterObj(results, (value) => !!value);

      dependentKeysToCalculate.clear();
      walkObj(filteredResults, (_, key) => {
        for (const dependentKey of dependencyMap[key]) {
          dependentKeysToCalculate.add(dependentKey);
        }
      });
    }
  }

  /**
   * Updaters
   */
  function reset(config: Configs<Collection>, { data = true, dependencies = false }: ResetConfig = {}) {
    walkObj(config as Configs, (value, key) => {
      data && graph[key].resetData(value.data);
      dependencies && graph[key].resetDependencies(value.dependencies);
    });
    dependencyMap = buildDependencyMap(config as Configs);
    calculateDependencies();
    snapshot = mapObj(graph, (value) => value.data);
    subscribers.forEach((subscriber) => subscriber());
  }

  function update(key: string, updater: Updater<Data>) {
    graph[key].setData(updater);
    calculateDependencies([key]);
    snapshot = mapObj(graph, (value) => value.data);
    subscribers.forEach((subscriber) => subscriber());
  }

  /**
   * Subscribers
   */
  function subscribe(fn: () => void) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }

  /**
   * Initialize
   */
  calculateDependencies();
  let snapshot = mapObj(graph, (value) => value.data);

  return {
    getSnapshot() {
      return snapshot;
    },
    reset,
    update,
    subscribe,
  };
}

/* Re-export types */
export type { Configs, Data, DataCollection, Graph, Updater } from './deep-state.type';
