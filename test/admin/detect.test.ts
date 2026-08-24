import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import { isHlx6 } from '../../src/admin/detect';

function createFakeKv(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    store,
  };
}

describe('isHlx6', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true from cache without pinging', async () => {
    const kv = createFakeKv({ 'acme/site1': 'true' });

    const result = await isHlx6('acme', 'site1', kv as any);

    expect(result).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('pings and caches on positive detection', async () => {
    const kv = createFakeKv();
    fetchMock.mockResolvedValue(new Response('', {
      status: 200,
      headers: { 'x-api-upgrade-available': 'true' },
    }));

    const result = await isHlx6('acme', 'site2', kv as any);

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('https://admin.hlx.page/ping/acme/site2');
    expect(kv.put).toHaveBeenCalledWith('acme/site2', 'true', { expirationTtl: 604800 });
  });

  it('does not cache a negative result', async () => {
    const kv = createFakeKv();
    fetchMock.mockResolvedValue(new Response('', { status: 200, headers: {} }));

    const result = await isHlx6('acme', 'site3', kv as any);

    expect(result).toBe(false);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('fails safe to false when the ping throws', async () => {
    const kv = createFakeKv();
    fetchMock.mockRejectedValue(new Error('network down'));

    const result = await isHlx6('acme', 'site4', kv as any);

    expect(result).toBe(false);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('supports a custom ping base URL and TTL', async () => {
    const kv = createFakeKv();
    fetchMock.mockResolvedValue(new Response('', {
      status: 200,
      headers: { 'x-api-upgrade-available': '' },
    }));

    const result = await isHlx6('acme', 'site5', kv as any, {
      pingBaseUrl: 'https://custom.example.com',
      ttlSeconds: 60,
    });

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('https://custom.example.com/ping/acme/site5');
    expect(kv.put).toHaveBeenCalledWith('acme/site5', 'true', { expirationTtl: 60 });
  });
});
