<div align="center">

# deep-state-js

A reactive JS store that intelligently recalculates state based on dependency chains.

</div>

## Contents

- [Installation](#installation)
- [What is this?](#what-is-this)
- [How To](#how-to)
- [Examples](#examples)
  - [Example: Jack and Jill](#example-jack-and-jill)
  - [Example: Basic Dependencies](#example-basic-dependencies)
  - [Example: Dependency Stacking](#example-dependency-stacking)
  - [Example: Dynamic Effects](#example-dynamic-effects)
  - [Example: Cyclic Dependencies](#example-cyclic-dependencies)
  - [Example: Composite Dependencies](#example-composite-dependencies)
- [Types](#types)

## Installation

This module is distributed via npm and can be installed as a project dependency:

```bash
npm install --save deep-state-js
```

## What is this?

A reactive state management tool built on dependency chains. Define the initial state and initial set of dependencies upfront and then allow `deep-state-js` to recalculate dependent state as updates are made to keys in the state.

A dependency is comprised of a `key`, a `cond` predicate function and a set of `effects` to be applied to the main `key`.

```js
{
  A: {
    data: { value: 'I am A' },
  },
  B: {
    data: { value: 'I am B' },
    dependencies: [{
      // B is dependent on A (if A's data changes, we re-calculate B)
      key: 'A',
      // The `cond` gets the key's (i.e. A) data and returns a boolean
      cond: data => data.value === 'I am A',
      // If the `cond` evaluates to true, these
      // `effects` are applied on top of B's data
      effects: { value: 'Not B' }
    }]
  },
  C: {
    data: { value: 'I am C' },
    // If B updates as a result of a manual update or
    // dependency calculation then C re-calculates too
    dependencies: [{
      key: 'B',
      cond: data => data.value === 'Not B',
      effects: { value: 'Not C' }
    }]
  }
}
```

In the example above, `C` is dependent on `B` and `B` is dependent on `A`. In other words, any time `A's` data is updated, `B` is recalculated. In this case, `B's` dependency is true, so the effects are applied on top of `B's` data, so its value is `Not B`. The interesting thing is that the dependency chain is followed. Because `B` changed as a result of the dependency on `A`, `C` recalculates too because it's dependent on `B` and ends up with the value `Not C`.

An important note is that effects don't overwrite data, they're simply applied on top of the data. So if the value of `A` changes, then `B` would recalculate and its dependency would be false. In this case its value would be set back to what it originally was (i.e. `I am B`). Then because `B` changed, `C` would recalculate and go back to its original value `I am C`.

## How To

The following gives a quick overview of how to interact with the `deep-state-js` store:

```js
import { createStore } from 'deep-state-js';

const store = createStore({
  A: { data: { type: 'uppercase', value: '' } },
  b: { data: { type: 'lowercase', value: '' }, dependencies: [{ key: 'A', cond: (data) => data.value === 'Test', effects: { value: 'Test' } }] },
});

/* Update a value */
store.update('A', { value: 'Test' }); // Overwrites the data for `A`, so we lose the 'type'
store.update('A', (prev) => ({ ...prev, value: 'Test' })); // Uses the previous data for `A`, so we don't lose the 'type'

/* Reset the store state (the default value for the second argument is { data: true, dependencies: false }) */
// Only resets the data for the key `b` (overwrites all data)
store.reset({ b: { data: { value: 'b' } } }, { data: true, dependencies: false });
// Only resets the dependencies for the key `b`
store.reset({ b: { dependencies: [] } }, { data: false, dependencies: true });
// Only resets the data and dependencies for the key `b` (overwrites all data)
store.reset({ b: { data: { value: 'b' }, dependencies: [] } }, { data: true, dependencies: true });

/* Subscribe */
store.subscribe(() => {
  // Runs every time the store updates
  console.log(store.getSnapshot()); // Gets the current state of the store
});
```

## Examples

### Example: Jack and Jill

```js
import { createStore } from 'deep-state-js';

const store = createStore({
  Jack: { data: { isUpTheHill: false } },
  Jill: { data: { isUpTheHill: false } },
});
```

Jack and Jill went up the hill...

```js
store.update('Jack', { isUpTheHill: true });
```

Oh no! Where's Jill? No worries. She's on the way too...

```js
store.update('Jill', { isUpTheHill: true });
```

A better way...

```js
import { createStore } from 'deep-state-js';

const store = createStore({
  Jack: { data: { isUpTheHill: false } },
  Jill: {
    data: { isUpTheHill: false },
    dependencies: [
      {
        key: 'Jack',
        cond: (data) => data.isUpTheHill,
        effects: { isUpTheHill: true },
      },
    ],
  },
});
```

Jack and Jill went up the hill...

```js
store.update('Jack', { isUpTheHill: true });
```

Jill is dependent on Jack, so she automagically follows...

### Example: Basic Dependencies

Imagine a form with a subscribe to newsletter checkbox and an associated email text field. The email text field should only be enabled and have a value if the subscribe checkbox is checked (i.e. has a `true` value). Here's how you'd establish that relationship.

```js
import { createStore } from 'deep-state-js';

const store = createStore({
  // Checkbox
  subscribeToNewsletter: { data: { value: true } },
  // Text Field
  email: {
    data: { value: '', disabled: false },
    dependencies: [
      {
        key: 'subscribeToNewsletter',
        cond: (data) => !data.value,
        effects: { value: '', disabled: true },
      },
    ],
  },
});
```

### Example: Dependency Stacking

You may have noticed that the dependencies property is an array which means that multiple dependencies can be applied to a given key. This begs the question, what happens if dependencies clash. In this case, the order of the dependencies matters.

The dependencies stack. In other words, the dependencies that come later in the list are applied on top of those which come earlier in the list.

Let's take the example above and add another checkbox that subscribes to all emails. If that checkbox is checked then the `subscribeToNewsletter` checkbox should be ignored and the email text field should be re-enabled.

```js
import { createStore } from 'deep-state-js';

const store = createStore({
  // Checkbox
  subscribeToAllEmails: { data: { value: true } },
  // Checkbox
  subscribeToNewsletter: { data: { value: true } },
  // Text Field
  email: {
    data: { value: '', disabled: false },
    dependencies: [
      {
        key: 'subscribeToNewsletter',
        cond: (data) => !data.value,
        effects: { value: '', disabled: true },
      },
      {
        key: 'subscribeToAllEmails',
        cond: (data) => !!data.value,
        effects: { disabled: false },
      },
    ],
  },
});
```

While the example above may work for the situation we described, it's not the best way to model that scenario. A better way would be to make the `subscribeToNewsletter` checkbox dependent on the `subscribeToAllEmails` checkbox and just disable it and make sure it's checked if the `subscribeToAllEmails` checkbox is checked. This has the added benefit of undoing the `subscribeToNewsletter` dependency on the email field and reverting the email field's value back to what it was before the effect was applied.

```js
import { createStore } from 'deep-state-js';

const store = createStore({
  // Checkbox
  subscribeToAllEmails: { data: { value: true } },
  // Checkbox
  subscribeToNewsletter: {
    data: { value: true, disabled: false },
    dependencies: [
      {
        key: 'subscribeToAllEmails',
        cond: (data) => !!data.value,
        // Forcing the value to `true` reverts the dependency on the
        // email field because the cond predicate evaluates to `false`
        effects: { value: true, disabled: true },
      },
    ],
  },
  // Text Field
  email: {
    data: { value: '', disabled: false },
    dependencies: [
      {
        key: 'subscribeToNewsletter',
        cond: (data) => !data.value,
        effects: { value: '', disabled: true },
      },
    ],
  },
});
```

### Example: Dynamic Effects

Until now, all the effects we've seen have been static objects that are applied on top of a given key's data. Effects have a secondary functional form which allows for a more dynamic experience.

Let's say that we wanted to keep the value of two keys in sync. We wouldn't be able to do this with a basic dependency because the effects object is fixed. Instead we can make the effects a function and generate the effects to apply dynamically. The effects function receives the same data that the `cond` predicate receives, which makes it perfect for this task.

```js
import { createStore } from 'deep-state-js';

const store = createStore({
  MainKey: { data: { value: 'I am the main key' } },
  FollowerKey: {
    data: {},
    dependencies: [
      {
        key: 'MainKey',
        // In addition to functions, cond can be set directly
        // to true to force effects to always be applied
        cond: true,
        // The value of FollowerKey is set to the value of MainKey
        effects: (data) => ({ value: data.value }),
      },
    ],
  },
});
```

### Example: Cyclic Dependencies

Let's go back to our example of Jack and Jill. If Jack goes up the hill first, then Jill should automatically follow. However, if Jill goes up the hill first, then Jack should automatically follow. To accomplish this, each person needs to be dependent on the other person. `deep-state-js` supports cyclic dependencies, so accomplishing this is trivial...

```js
import { createStore } from 'deep-state-js';

const store = createStore({
  Jack: {
    data: { isUpTheHill: false },
    dependencies: [
      {
        key: 'Jill',
        cond: (data) => data.isUpTheHill,
        effects: { isUpTheHill: true },
      },
    ],
  },
  Jill: {
    data: { isUpTheHill: false },
    dependencies: [
      {
        key: 'Jack',
        cond: (data) => data.isUpTheHill,
        effects: { isUpTheHill: true },
      },
    ],
  },
});
```

### Example: Composite Dependencies

Imagine a form with two fields that represent a range such as a start date and an end date. The start date is only valid if it's less than the end date and the end date is only valid if it's greater than the start date. In other words, this has the same problem as the previous example that each field is dependent on one another. However, there's a twist because not only do we need the data of the other field, but we need to be able to compare it with the current field's data.

This is where composite dependencies come into play. By passing an array of `keys` in a dependency, we can retrieve the data for every key in the array in the `cond` predicate function. This allows us to do complex calculations that span multiple keys in the state.

```js
import { createStore } from 'deep-state-js';

const store = createStore({
  startDate: {
    data: { value: 'Jan. 1, 1900', valid: true },
    dependencies: [
      {
        key: ['startDate', 'endDate'],
        cond: (data) => data.startDate.value >= data.endDate.value,
        effects: { valid: false },
      },
    ],
  },
  endDate: {
    data: { value: 'Jan. 1, 2000', valid: true },
    dependencies: [
      {
        key: ['startDate', 'endDate'],
        cond: (data) => data.startDate.value >= data.endDate.value,
        effects: { valid: false },
      },
    ],
  },
});
```

## Types

This package exports a `createStore` function with the following type:

```ts
type CreateStore = <Collection extends DataCollection = DataCollection>(configs: Configs<Collection>) => Store<Collection>;
```

The core types that make up `createStore` are as follows:

```ts
export type Data = Record<string, any>;

export type DataCollection = Record<string, Data>;

export type Configs<Collection extends DataCollection = DataCollection> = {
  [Key in keyof Collection]: {
    data?: Collection[Key];
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

export type Store<Collection extends DataCollection = DataCollection> = {
  getSnapshot(): Collection;
  reset(configs: Configs<Collection>, options?: { data?: boolean; dependencies?: boolean }): void;
  update(key: string, updater: Updater<Data>): void;
  subscribe(fn: () => void): () => void;
};
```

While the above might be somewhat confusing, the only thing that's really needed to create a typed output for the `createStore` function is a custom `DataCollection` type:

```ts
// A collection is a key value pair where the keys are the keys
// in your state and the values are the data for a given key
type CustomDataCollection = {
  KeyOne: { value: string };
  KeyTwo: { value: number };
};

const configs: Configs<CustomDataCollection> = {
  KeyOne: { data: { value: 'A string' } },
  KeyTwo: { data: { value: 1 } },
};

// Because `configs` is typed, `store` will be typed
const store = createStore(configs);
```
