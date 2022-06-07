import { merge } from '../utils';

it.each`
  destination                                             | sources                                                         | merged
  ${{}}                                                   | ${[{ name: 'A', age: 50 }]}                                     | ${{ name: 'A', age: 50 }}
  ${{ name: 'A' }}                                        | ${[{ name: 'B', age: 50 }]}                                     | ${{ name: 'B', age: 50 }}
  ${{ name: 'A' }}                                        | ${[{ age: 50 }, { age: 1000 }]}                                 | ${{ name: 'A', age: 1000 }}
  ${{ name: 'A' }}                                        | ${[{ age: 50 }, { age: 1000 }, { name: 'C' }]}                  | ${{ name: 'C', age: 1000 }}
  ${{ people: { A: 50, B: 100 } }}                        | ${[{ people: { A: 50, B: 600 } }]}                              | ${{ people: { A: 50, B: 600 } }}
  ${{ names: ['A', 'B'] }}                                | ${[{ names: ['A', 'C'] }]}                                      | ${{ names: ['A', 'C'] }}
  ${{ names: ['A', 'B'] }}                                | ${[{ names: ['A', 'C'] }]}                                      | ${{ names: ['A', 'C'] }}
  ${{ people: [{ name: 'A' }, { name: 'C', age: 100 }] }} | ${[{ people: [{ age: 50 }, { name: 'D' }] }]}                   | ${{ people: [{ name: 'A', age: 50 }, { name: 'D', age: 100 }] }}
  ${{ people: [{ names: [{ name: 'A' }, 'B'] }] }}        | ${[{ people: [{ names: [{ name: 'B' }, 'C'] }] }]}              | ${{ people: [{ names: [{ name: 'B' }, 'C'] }] }}
  ${{ people: [{ names: [{ name: 'A' }, 'B'] }] }}        | ${[{ people: [{ names: [{ name: 'B' }, 'C'] }] }]}              | ${{ people: [{ names: [{ name: 'B' }, 'C'] }] }}
  ${{ people: { names: [{ name: 'A', age: 10 }] } }}      | ${[{ people: { names: [{ name: 'B' }] } }]}                     | ${{ people: { names: [{ name: 'B', age: 10 }] } }}
  ${{ name: 'A' }}                                        | ${[{ name: 'B' }, { name: 'C' }, { name: 'D' }, { name: 'E' }]} | ${{ name: 'E' }}
`('should handle the merge util correctly', ({ destination, sources, merged }) => {
  expect(destination).not.toEqual(merged);
  expect(merge(destination, ...sources)).toEqual(merged);
  expect(destination).not.toEqual(merged);
});

it('should assign null to the destination correctly', () => {
  const destination = { handleNull: 1 };
  const source = { handleNull: null };
  const merged = { handleNull: null };
  expect(destination).not.toEqual(merged);
  expect(merge(destination, source)).toEqual(merged);
  expect(destination).not.toEqual(merged);
});

it('should not assign undefined to the destination if the object value already exists', () => {
  const destination = { handleUndefined: 1 };
  const source = { handleUndefined: undefined };
  const merged = { handleUndefined: 1 };
  expect(destination).toEqual(merged);
  expect(merge(destination, source)).toEqual(merged);
  expect(destination).toEqual(merged);
});

it('should not assign undefined to the destination if the array value already exists', () => {
  const source: any[] = [1];
  source[1] = undefined;
  source[3] = 3;

  expect(merge([4, 5, 6, 7], source)).toEqual([1, 5, 6, 3]);
});

it('should assign functions to the destination correctly', () => {
  const destination = { fn: () => {} };
  const source = { fn: () => {} };
  const merged = { fn: source.fn };
  expect(destination).not.toEqual(merged);
  expect(merge(destination, source)).toEqual(merged);
  expect(destination).not.toEqual(merged);
});

it('should not mutate the destination or source objects', () => {
  let destination: { a?: any } = {};
  let source1: { a?: any } = { a: [{ a: 1 }] };
  let source2: { a?: any } = { a: [{ b: 2 }] };
  let merged: { a?: any } = { a: [{ a: 1, b: 2 }] };

  expect(merge(destination, source1, source2)).toEqual(merged);

  expect(destination).toEqual({});
  expect(source1).toEqual({ a: [{ a: 1 }] });
  expect(source2).toEqual({ a: [{ b: 2 }] });

  destination = {};
  source1 = { a: [[1, 2, 3]] };
  source2 = { a: [[3, 4]] };
  merged = { a: [[3, 4, 3]] };

  expect(merge(destination, source1, source2)).toEqual(merged);

  expect(destination).toEqual({});
  expect(source1).toEqual({ a: [[1, 2, 3]] });
  expect(source2).toEqual({ a: [[3, 4]] });
});
