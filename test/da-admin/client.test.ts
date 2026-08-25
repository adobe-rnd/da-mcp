import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import { DAAdminClient } from '../../src/da-admin/client';

function createFakeDaadminService(response: Response) {
  return { fetch: vi.fn().mockResolvedValue(response) } as any;
}

describe('DAAdminClient.createVersion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1700000000000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes the given label through unchanged', async () => {
    const daadminService = createFakeDaadminService(new Response('', { status: 201, headers: {} }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    await client.createVersion('acme', 'site1', 'docs/a.html', 'Before redesign');

    const request = daadminService.fetch.mock.calls[0][0] as Request;
    expect(await request.text()).toBe(JSON.stringify({ label: 'Before redesign' }));
  });

  it('defaults to a timestamp-based label when none is given, since admin.da.live rejects an empty body', async () => {
    const daadminService = createFakeDaadminService(new Response('', { status: 201, headers: {} }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    await client.createVersion('acme', 'site1', 'docs/a.html');

    const request = daadminService.fetch.mock.calls[0][0] as Request;
    expect(await request.text()).toBe(JSON.stringify({ label: 'Version 1700000000000' }));
  });
});
