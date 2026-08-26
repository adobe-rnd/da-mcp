import { describe, it, expect } from 'vitest';
import { rowsToMap } from '../../src/utils/flags';

describe('rowsToMap', () => {
  it('converts an array of key/value rows into a plain map', () => {
    expect(rowsToMap([
      { key: 'ew.enabled', value: 'true' },
      { key: 'ew.coworker', value: 'false' },
    ])).toEqual({ 'ew.enabled': 'true', 'ew.coworker': 'false' });
  });

  it('returns an empty object for an empty array', () => {
    expect(rowsToMap([])).toEqual({});
  });

  it('later rows win on duplicate keys', () => {
    expect(rowsToMap([
      { key: 'ew.enabled', value: 'false' },
      { key: 'ew.enabled', value: 'true' },
    ])).toEqual({ 'ew.enabled': 'true' });
  });
});
