type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[] ? RecursivePartial<U>[] : T[P] extends object ? RecursivePartial<T[P]> : T[P];
};

export type Data = Record<string, any>;

export type DataCollection = Record<string, Data>;

export type Configs<Collection extends DataCollection = DataCollection> = {
  [Key in keyof Collection]: {
    data?: Collection[Key];
    // Conditional key / keys never type needed for proper Discriminated Union Type Guard
    dependencies?: (
      | {
          [DependencyKey in keyof Collection]: {
            key: DependencyKey;
            keys?: never;
            cond: true | ((data: Collection[DependencyKey]) => boolean);
            effects: RecursivePartial<Collection[Key]> | ((data: Collection[DependencyKey]) => RecursivePartial<Collection[Key]>);
          };
        }[keyof Collection]
      | {
          key?: never;
          keys: (keyof Collection)[];
          cond: true | ((data: Collection) => boolean);
          effects: RecursivePartial<Collection[Key]> | ((data: Collection) => RecursivePartial<Collection[Key]>);
        }
    )[];
  };
};

export type Graph = {
  [x: string]: {
    readonly data: Record<string, any>;
    calculateNextEffects(graph: Graph): boolean;
    resetData: (data?: Data) => void;
    resetDependencies: (dependencies?: Configs[keyof Configs]['dependencies']) => void;
    setData: (updater: Updater<Data>) => void;
  };
};

export type Subscribers = Set<() => void>;

export type Updater<T extends any> = T | ((prev: T) => T);

export type Store<Collection extends DataCollection = DataCollection> = {
  getSnapshot(): Collection;
  reset(configs: Configs<Collection>, options?: { data?: boolean; dependencies?: boolean }): void;
  update(key: string, updater: Updater<Data>): void;
  subscribe(fn: () => void): () => void;
};
