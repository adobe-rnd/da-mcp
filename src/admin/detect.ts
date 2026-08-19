/**
 * HLX6 detection
 * Determines whether a given org/repo has been migrated from the legacy
 * admin.hlx.page stack to the HLX6 api.aem.live stack, via a ping check
 * against the legacy admin host, cached in KV.
 */

export const DEFAULT_HLX_ADMIN_BASE_URL = 'https://admin.hlx.page';
export const DEFAULT_HLX6_CACHE_TTL_SECONDS = 604800; // 7 days

export interface Hlx6DetectOptions {
  pingBaseUrl?: string;
  ttlSeconds?: number;
}

/**
 * Checks (with caching) whether org/repo has been upgraded to HLX6.
 * Positive results are cached in KV for `ttlSeconds` (default 7 days).
 * Negative results are never cached, so a later migration is picked up
 * on the next call. Any ping failure fails safe to `false` (legacy).
 */
export async function isHlx6(
  org: string,
  repo: string,
  kv: KVNamespace,
  options: Hlx6DetectOptions = {},
): Promise<boolean> {
  const pingBaseUrl = options.pingBaseUrl || DEFAULT_HLX_ADMIN_BASE_URL;
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_HLX6_CACHE_TTL_SECONDS;
  const cacheKey = `${org}/${repo}`;

  const cached = await kv.get(cacheKey);
  if (cached === 'true') {
    return true;
  }

  try {
    const response = await fetch(`${pingBaseUrl}/ping/${org}/${repo}`);
    const upgraded = response.headers.get('x-api-upgrade-available') !== null;

    if (upgraded) {
      await kv.put(cacheKey, 'true', { expirationTtl: ttlSeconds });
    }

    return upgraded;
  } catch (error) {
    console.log('HLX6 ping failed, defaulting to legacy backend:', error);
    return false;
  }
}
