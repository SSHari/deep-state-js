import { createStore } from '../deep-state';
import type { Configs } from '../deep-state.type';

it('overwrites the old data on a static update', () => {
  const depState = createStore(createConfig());
  expect(depState.getSnapshot()['key-one']).toEqual({ key: 1 });
  depState.update('key-one', { updated: true });
  expect(depState.getSnapshot()['key-one']).toEqual({ updated: true });
});

it('a dynamic (function) update gets the previous data', () => {
  const depState = createStore(createConfig());
  expect(depState.getSnapshot()['key-one']).toEqual({ key: 1 });
  depState.update('key-one', (prev) => ({ ...prev, updated: true }));
  expect(depState.getSnapshot()['key-one']).toEqual({ key: 1, updated: true });
});

// Dependency Chain: key-one --(depends on)--> key-one (self-dependency)
it('returns the expected effects for key-one when key-one changes', () => {
  const depState = createStore(createConfig());
  expect(depState.getSnapshot()['key-one']).toEqual({ key: 1 });

  depState.update('key-one', { isValid: false });
  expect(depState.getSnapshot()['key-one']).toEqual({ isValid: false, name: 'key one effect applied' });

  depState.update('key-one', { isValid: true });
  expect(depState.getSnapshot()['key-one']).toEqual({ isValid: true });
});

// Dependency Chain: key-one --(depends on)--> key-two
it('returns the expected effects for key-one when key-two changes', () => {
  const depState = createStore(createConfig());
  expect(depState.getSnapshot()['key-one']).toEqual({ key: 1 });

  depState.update('key-two', { age: 21 });
  expect(depState.getSnapshot()['key-one']).toEqual({ key: 1, name: 'key two effect applied' });

  depState.update('key-two', {});
  expect(depState.getSnapshot()['key-one']).toEqual({ key: 1 });
});

// Dependency Chain: key-one --(depends on)--> key-three (effect one)
it('returns the expected effects for key-one when key-three changes (effect one)', () => {
  const depState = createStore(createConfig());
  expect(depState.getSnapshot()['key-one']).toEqual({ key: 1 });

  depState.update('key-three', { person: { age: 30 } });
  expect(depState.getSnapshot()['key-one']).toEqual({ key: 1, name: 'key three effect one applied' });

  depState.update('key-three', {});
  expect(depState.getSnapshot()['key-one']).toEqual({ key: 1 });
});

// Dependency Chain: key-one --(depends on)--> key-three (effect two overwrites effect one)
it('returns the expected effects for key-one when key-three changes (effect two)', () => {
  const depState = createStore(createConfig());
  expect(depState.getSnapshot()['key-one']).toEqual({ key: 1 });

  depState.update('key-three', { person: { age: 30, name: 'key one effect' } });
  expect(depState.getSnapshot()['key-one']).toEqual({ key: 1, name: 'key three effect two applied' });

  depState.update('key-three', { person: { age: 30 } });
  expect(depState.getSnapshot()['key-one']).toEqual({ key: 1, name: 'key three effect one applied' });

  depState.update('key-three', {});
  expect(depState.getSnapshot()['key-one']).toEqual({ key: 1 });
});

// Dependency Chain: key-one --(depends on)--> key-two --(depends on)--> key-three
it('returns the expected effects for key-one and key-two when key-three changes', () => {
  const depState = createStore(createConfig());
  expect(depState.getSnapshot()['key-one']).toEqual({ key: 1 });
  expect(depState.getSnapshot()['key-two']).toEqual({ key: 2, age: 20 });

  depState.update('key-three', { person: { age: 20 } });
  expect(depState.getSnapshot()['key-one']).toEqual({ key: 1, name: 'key two effect applied' });
  expect(depState.getSnapshot()['key-two']).toEqual({ key: 2, age: 21 });

  depState.update('key-three', {});
  expect(depState.getSnapshot()['key-one']).toEqual({ key: 1 });
  expect(depState.getSnapshot()['key-two']).toEqual({ key: 2, age: 20 });
});

// Dependency Chain: (cyclic dependency)
//    - key-four --(depends on)--> key-five
//    - key-five --(depends on)--> key-four
it('returns the expected effects for key-four and key-five when both change (cyclic dependency)', () => {
  const depState = createStore(createConfig());
  expect(depState.getSnapshot()['key-five']).toEqual({ key: 5 });

  depState.update('key-one', { composite: true });
  expect(depState.getSnapshot()['key-five']).toEqual({ key: 5 });

  depState.update('key-two', { composite: true });
  expect(depState.getSnapshot()['key-five']).toEqual({ key: 5 });

  depState.update('key-three', { composite: true });
  expect(depState.getSnapshot()['key-five']).toEqual({ key: 5, name: 'multi key (1, 2, 3) composite dependency applied' });

  depState.update('key-three', {});
  expect(depState.getSnapshot()['key-five']).toEqual({ key: 5 });
});

// Dependency Chain: key-five --(depends on)--> key-one, key-two, key-three (composite dependency)
it('returns the expected effects for key-five when key-one, key-two and key-three change (composite dependency)', () => {
  const depState = createStore(createConfig());
  expect(depState.getSnapshot()['key-four']).toEqual({ key: 4 });
  expect(depState.getSnapshot()['key-five']).toEqual({ key: 5 });

  depState.update('key-five', (prev) => ({ ...prev, cyclic: true }));
  expect(depState.getSnapshot()['key-four']).toEqual({ key: 4, name: 'cyclic dependency applied' });
  expect(depState.getSnapshot()['key-five']).toEqual({ key: 5, cyclic: true });

  depState.update('key-four', (prev) => ({ ...prev, cyclic: true }));
  expect(depState.getSnapshot()['key-four']).toEqual({ key: 4, cyclic: true, name: 'cyclic dependency applied' });
  expect(depState.getSnapshot()['key-five']).toEqual({ key: 5, cyclic: true, name: 'cyclic dependency applied' });

  depState.update('key-four', {});
  expect(depState.getSnapshot()['key-four']).toEqual({ name: 'cyclic dependency applied' });
  expect(depState.getSnapshot()['key-five']).toEqual({ key: 5, cyclic: true });

  depState.update('key-five', {});
  expect(depState.getSnapshot()['key-four']).toEqual({});
  expect(depState.getSnapshot()['key-five']).toEqual({});
});

it("doesn't allow access to key data in a composite dependency if the key isn't listed in the keys array", () => {
  expect(() =>
    createStore({
      'key-one': { data: { key: 0 }, dependencies: [{ keys: [], cond: (data) => !!data['key-one'].key, effects: {} }] },
    }),
  ).toThrowError("To access 'key-one' in dependency 1 of 'key-one' add it to the 'keys' array");

  const depState = createStore({
    'key-one': {
      data: { updated: false },
    },
    'key-two': {
      data: { key: 2 },
      dependencies: [{ keys: ['key-one'], cond: (data) => data['key-one'].updated, effects: (data) => ({ key: data['key-two'].key }) }],
    },
    'key-three': {
      data: { key: 3, updated: false },
      dependencies: [
        { key: 'key-three', cond: () => true, effects: {} },
        { keys: ['key-three'], cond: (data) => data['key-three'].updated, effects: (data) => ({ key: data['key-two'].key }) },
      ],
    },
  });

  expect(() => depState.update('key-one', { updated: true })).toThrowError(
    "To access 'key-two' in dependency 1 of 'key-two' add it to the 'keys' array",
  );

  expect(() => depState.update('key-three', { updated: true })).toThrowError(
    "To access 'key-two' in dependency 2 of 'key-three' add it to the 'keys' array",
  );
});

it('correctly notifies subscribers on an update while subscribed', () => {
  const depState = createStore({ 'key-one': { data: {} }, 'key-two': { data: {} } });

  const subscriber = jest.fn();
  const unsubscribe = depState.subscribe(subscriber);

  depState.update('key-one', { updated: true });
  expect(subscriber).toHaveBeenCalledTimes(1);

  unsubscribe();
  depState.update('key-one', { updated: false });
  expect(subscriber).toHaveBeenCalledTimes(1);
});

it('notifies a subscriber if a key has updated as a result of a dependency calculation', () => {
  const depState = createStore({
    'key-one': { data: { updated: false } },
    'key-two': { data: {}, dependencies: [{ key: 'key-one', cond: (data) => data.updated, effects: { updatedByKeyOne: true } }] },
    'key-three': { data: {}, dependencies: [{ keys: ['key-one'], cond: (data) => data['key-one'].updated, effects: { updatedByKeyOne: true } }] },
  });

  const subscriber = jest.fn();
  depState.subscribe(subscriber);

  depState.update('key-one', { updated: true });
  expect(subscriber).toHaveBeenCalledTimes(1);
  expect(depState.getSnapshot()).toEqual({
    'key-one': { updated: true },
    'key-two': { updatedByKeyOne: true },
    'key-three': { updatedByKeyOne: true },
  });
});

it('resets the data for the keys in the reset config', () => {
  const depState = createStore({
    'key-one': { data: { value: 'initial' } },
    'key-two': { data: { value: 'initial' } },
    'key-three': { data: { value: 'initial' } },
  });
  expect(depState.getSnapshot()).toEqual({
    'key-one': { value: 'initial' },
    'key-two': { value: 'initial' },
    'key-three': { value: 'initial' },
  });

  depState.reset(
    {
      'key-one': {
        data: { value: 'initial' },
        dependencies: [{ key: 'key-two', cond: () => true, effects: (data) => ({ value: data.value }) }],
      },
      'key-two': { data: { value: 'reset' } },
      'key-three': { data: { value: 'reset' } },
    },
    { dependencies: true },
  );
  expect(depState.getSnapshot()).toEqual({
    'key-one': { value: 'reset' },
    'key-two': { value: 'reset' },
    'key-three': { value: 'reset' },
  });
});

it('should calculate dependencies for all keys on initialization', () => {
  const depState = createStore({
    'key-one': {
      data: { key: 0 },
      dependencies: [{ key: 'key-one', cond: () => true, effects: { key: 1 } }],
    },
    'key-two': {
      data: { key: 0 },
      dependencies: [{ key: 'key-one', cond: (data) => data.key === 1, effects: { key: 2 } }],
    },
  });

  expect(depState.getSnapshot()).toEqual({ 'key-one': { key: 1 }, 'key-two': { key: 2 } });
});

it('should recalculate dependencies for all keys on a reset and notify subscribers', () => {
  const depState = createStore({
    'key-one': {
      data: { key: 0, updated: false },
      dependencies: [{ key: 'key-one', cond: (data) => data.updated, effects: { key: 1 } }],
    },
    'key-two': {
      data: { key: 0 },
      dependencies: [{ key: 'key-one', cond: (data) => data.key === 1, effects: { key: 2 } }],
    },
    'key-three': {},
  });

  const subscriber = jest.fn();
  depState.subscribe(subscriber);

  expect(depState.getSnapshot()).toEqual({ 'key-one': { key: 0, updated: false }, 'key-two': { key: 0 }, 'key-three': {} });

  depState.reset({
    'key-one': { data: { key: 0, updated: true } },
    'key-two': { data: { key: 22 } },
    'key-three': {},
  });
  expect(subscriber).toHaveBeenCalledTimes(1);
  expect(depState.getSnapshot()).toEqual({ 'key-one': { key: 1, updated: true }, 'key-two': { key: 2 }, 'key-three': {} });
});

type TestCollection = {
  'key-one': { key?: number; name?: string; isValid?: boolean; composite?: boolean };
  'key-two': { key?: number; age?: number; composite?: boolean };
  'key-three': { key?: number; person?: { age?: number; name?: string }; composite?: boolean };
  'key-four': { key?: number; name?: string; cyclic?: boolean };
  'key-five': { key?: number; name?: string; cyclic?: boolean };
};

function createConfig() {
  const configs: Configs<TestCollection> = {
    'key-one': {
      data: { key: 1 },
      dependencies: [
        {
          key: 'key-one',
          cond: (data) => data.isValid === false,
          effects: { name: 'key one effect applied' },
        },
        {
          key: 'key-two',
          cond: (data) => (data.age || 0) === 21,
          effects: { name: 'key two effect applied' },
        },
        {
          key: 'key-three',
          cond: (data) => (data.person?.age || 0) === 30,
          effects: { name: 'key three effect one applied' },
        },
        {
          key: 'key-three',
          cond: (data) => (data.person?.name || '') === 'key one effect',
          effects: () => ({ name: 'key three effect two applied' }),
        },
      ],
    },
    'key-two': {
      data: { key: 2, age: 20 },
      dependencies: [{ key: 'key-three', cond: (data) => (data.person?.age || 0) === 20, effects: { age: 21 } }],
    },
    'key-three': {
      data: { key: 3 },
      dependencies: [],
    },
    'key-four': {
      data: { key: 4 },
      dependencies: [
        {
          key: 'key-five',
          cond: (data) => !!data.cyclic,
          effects: { name: 'cyclic dependency applied' },
        },
      ],
    },
    'key-five': {
      data: { key: 5 },
      dependencies: [
        {
          keys: ['key-one', 'key-two', 'key-three'],
          cond: (data) => !!data['key-one'].composite && !!data['key-two'].composite && !!data['key-three'].composite,
          effects: { name: 'multi key (1, 2, 3) composite dependency applied' },
        },
        {
          key: 'key-four',
          cond: (data) => !!data.cyclic,
          effects: { name: 'cyclic dependency applied' },
        },
      ],
    },
  };

  return configs;
}
