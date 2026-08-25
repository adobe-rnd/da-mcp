/**
 * Shared helpers for DA config "flags" sheets: a config doc's `flags`
 * sheet is a list of { key, value } rows (per docs.da.live's config
 * convention), used e.g. to check the `ew.enabled` (Experience Workspace)
 * flag. Each backend (DAAdminClient, AemAdminClient) parses its own raw
 * config response shape into this common row format.
 */

export interface FlagRow {
  key: string;
  value: string;
}

/**
 * Converts an array of { key, value } rows into a plain lookup map.
 * When a key appears more than once, the last row wins.
 */
export function rowsToMap(rows: FlagRow[]): Record<string, string> {
  return rows.reduce((acc: Record<string, string>, { key, value }) => {
    acc[key] = value;
    return acc;
  }, {});
}
