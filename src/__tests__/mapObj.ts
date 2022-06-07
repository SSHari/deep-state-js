import { mapObj } from '../utils';

it('should handle mapping objects correctly', () => {
  expect(mapObj({ A: 2, B: 10 }, (value) => value * 2)).toEqual({ A: 4, B: 20 });
  expect(mapObj({ A: 2, B: 10 }, (value) => value.toString())).toEqual({ A: '2', B: '10' });
  expect(mapObj({ A: 2, B: 10 }, (_, key) => key)).toEqual({ A: 'A', B: 'B' });
});
