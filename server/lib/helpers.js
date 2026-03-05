/**
 * Shared utilities for route handlers.
 */

/**
 * Pick only allowed fields from a request body.
 * Coerces empty strings to null for non-text fields (dates, FKs, enums).
 * @param {object} body - req.body
 * @param {string[]} allowed - whitelisted field names
 * @returns {object} filtered updates (only keys present in body AND in allowed)
 */
export function pickAllowedFields(body, allowed) {
  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key] === '' ? null : body[key];
    }
  }
  return updates;
}
