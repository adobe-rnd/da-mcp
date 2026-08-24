import {
  describe, it, expect, vi,
} from 'vitest';
import { DAAdminClient } from '../../src/da-admin/client';

function createFakeDaadminService(response: Response) {
  return { fetch: vi.fn().mockResolvedValue(response) } as any;
}

describe('DAAdminClient', () => {
  it('createSource constructs an editUrl instead of passing through the raw backend body', async () => {
    // Legacy admin.da.live's real response shape is { source: { editUrl, contentUrl },
    // aem: {...} } - deliberately different from what we return, to prove we build our
    // own editUrl rather than relying on (and mistyping) whatever the backend sends back.
    const daadminService = createFakeDaadminService(new Response(JSON.stringify({
      source: { editUrl: 'https://da.live/edit#/should-be-ignored', contentUrl: 'https://content.da.live/x' },
    }), { status: 201, headers: { 'content-type': 'application/json' } }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    const result = await client.createSource('acme', 'site1', 'docs/new.html', '<p>hi</p>');

    expect(result).toEqual({
      success: true,
      path: 'docs/new.html',
      editUrl: 'https://da.live/edit#/acme/site1/docs/new',
    });
  });

  it('updateSource constructs an editUrl the same way', async () => {
    const daadminService = createFakeDaadminService(new Response('', { status: 201, headers: {} }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    const result = await client.updateSource('acme', 'site1', 'docs/page.html', '<p>updated</p>');

    expect(result).toEqual({
      success: true,
      path: 'docs/page.html',
      editUrl: 'https://da.live/edit#/acme/site1/docs/page',
    });
  });
});
