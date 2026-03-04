/**
 * Shared utilities for route handlers.
 */

/**
 * Pick only allowed fields from a request body.
 * @param {object} body - req.body
 * @param {string[]} allowed - whitelisted field names
 * @returns {object} filtered updates (only keys present in body AND in allowed)
 */
export function pickAllowedFields(body, allowed) {
  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  return updates;
}
