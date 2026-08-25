import {
  describe, it, expect, vi,
} from 'vitest';
import { DAAdminClient } from '../../src/da-admin/client';

function createFakeDaadminService(response: Response) {
  return { fetch: vi.fn().mockResolvedValue(response) } as any;
}

describe('DAAdminClient', () => {
  it('createSource constructs its own editUrl but parses previewUrl/liveUrl from the real backend response', async () => {
    // Legacy admin.da.live's real response shape (docs.da.live/developers/api/source) is
    // { source: { editUrl, contentUrl }, aem: { previewUrl, liveUrl } }. We deliberately
    // ignore source.editUrl (constructing our own, consistent with HLX6 which has no
    // equivalent) but DO parse aem.previewUrl/liveUrl through, since legacy actually
    // provides them and there's no reason to discard real information.
    const daadminService = createFakeDaadminService(new Response(JSON.stringify({
      source: { editUrl: 'https://da.live/edit#/should-be-ignored', contentUrl: 'https://content.da.live/x' },
      aem: {
        previewUrl: 'https://main--site1--acme.aem.page/docs/new',
        liveUrl: 'https://main--site1--acme.aem.live/docs/new',
      },
    }), { status: 201, headers: { 'content-type': 'application/json' } }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    const result = await client.createSource('acme', 'site1', 'docs/new.html', '<p>hi</p>');

    expect(result).toEqual({
      success: true,
      path: 'docs/new.html',
      editUrl: 'https://da.live/edit#/acme/site1/docs/new',
      previewUrl: 'https://main--site1--acme.aem.page/docs/new',
      liveUrl: 'https://main--site1--acme.aem.live/docs/new',
    });
  });

  it('updateSource does the same', async () => {
    const daadminService = createFakeDaadminService(new Response(JSON.stringify({
      aem: {
        previewUrl: 'https://main--site1--acme.aem.page/docs/page',
        liveUrl: 'https://main--site1--acme.aem.live/docs/page',
      },
    }), { status: 201, headers: { 'content-type': 'application/json' } }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    const result = await client.updateSource('acme', 'site1', 'docs/page.html', '<p>updated</p>');

    expect(result).toEqual({
      success: true,
      path: 'docs/page.html',
      editUrl: 'https://da.live/edit#/acme/site1/docs/page',
      previewUrl: 'https://main--site1--acme.aem.page/docs/page',
      liveUrl: 'https://main--site1--acme.aem.live/docs/page',
    });
  });

  it('leaves previewUrl/liveUrl undefined when the backend response has no aem field', async () => {
    const daadminService = createFakeDaadminService(new Response('', { status: 201, headers: {} }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    const result = await client.createSource('acme', 'site1', 'docs/new.html', '<p>hi</p>');

    expect(result.previewUrl).toBeUndefined();
    expect(result.liveUrl).toBeUndefined();
  });
});
