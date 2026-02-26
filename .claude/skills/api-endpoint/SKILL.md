---
name: api-endpoint
description: Creates full-stack API endpoints following the TMS project conventions — Express route + Knex queries + frontend api.js function + React Query hook. Use when user says "create endpoint", "add API route", "new route", "build an API for", "add backend for", or asks to connect frontend to a new resource. Do NOT use for database-only work (use db-engineering instead).
allowed-tools: "Bash(node:*) Bash(curl:*)"
metadata:
  author: TMS Prototype
  version: 1.0.0
---

# API Endpoint Creator

Creates full-stack API endpoints following established project patterns. Generates backend route, frontend service function, and React Query integration.

## Instructions

### Step 1: Determine Scope

Ask or infer from context:

1. **Resource name** — singular noun (e.g., "carrier", "location")
2. **CRUD operations needed** — which of: List, Get, Create, Update, Delete, custom actions?
3. **Relations** — FK references to other tables? Nested sub-resources?
4. **Auth requirements** — public, authenticated, or role-restricted?
5. **Frontend needed?** — API-only or full-stack (route + service + hook)?

### Step 2: Create the Route File

Create `server/routes/{resource}.js` following these patterns from `references/route-patterns.md`:

1. **Function signature**: `export default function {resource}Router(db) {`
2. **Import**: `import { Router } from 'express'; import { asyncHandler } from '../middleware/errorHandler.js';`
3. **Wrap every handler** in `asyncHandler()`
4. **ID generation** for string-PK tables: `{prefix}_{crypto.randomUUID().slice(0, 8)}`
5. **Query filters** via `req.query` destructuring
6. **Validation** inline at top of handler — return 400 with `{ error: 'message' }`
7. **404 pattern**: `if (!resource) return res.status(404).json({ error: 'Not found' })`
8. **PATCH updates**: whitelist allowed fields, set `updated_at: db.fn.now()`
9. **Soft delete**: set status to INACTIVE, don't actually DELETE rows
10. **Response format**: always `res.json(data)` — no wrapper objects except for enriched detail endpoints

### Step 3: Register the Route

Add to `server/index.js`:
```js
import {resource}Router from './routes/{resource}.js';
// After authenticate middleware line:
app.use('/api/{resource}', {resource}Router(db));
```

### Step 4: Add Frontend Service Function

Add to `frontend/src/services/api.js`:
```js
// {Resource}
export const get{Resources} = (params) => api.get('/{resource}', { params }).then(r => r.data);
export const get{Resource} = (id) => api.get(`/{resource}/${id}`).then(r => r.data);
export const create{Resource} = (data) => api.post('/{resource}', data).then(r => r.data);
export const update{Resource} = (id, data) => api.patch(`/{resource}/${id}`, data).then(r => r.data);
export const delete{Resource} = (id) => api.delete(`/{resource}/${id}`).then(r => r.data);
```

### Step 5: Frontend Integration

In the consuming component, use TanStack React Query v5:
```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// List
const { data: items = [], isLoading } = useQuery({
  queryKey: ['{resource}'],
  queryFn: get{Resources},
});

// Mutation with cache invalidation
const createMutation = useMutation({
  mutationFn: create{Resource},
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['{resource}'] }),
});
```

### Step 6: Validate

Before presenting:

1. Route uses `asyncHandler()` on every handler?
2. Every handler has error response for bad input (400) and not found (404)?
3. PATCH handler whitelists allowed fields and sets `updated_at: db.fn.now()`?
4. Enum values validated inline (not just trusted from client)?
5. Role guards added where needed (`requireRole('ADMIN')`)?
6. Route registered in `server/index.js` under `/api/{resource}`?
7. Frontend service functions added to `api.js`?
8. No N+1 queries — use JOINs or batch queries for related data?

Consult `references/route-patterns.md` for the complete pattern reference.

## Examples

Example 1: Simple CRUD resource
User says: "Add an API for carriers"
Actions:
1. Create `server/routes/carriers.js` with List, Get, Create, Update, soft-Delete
2. ID format: `car_{uuid_slice}`
3. Add enum validation for carrier status inline
4. Register in `server/index.js`
5. Add 5 functions to `api.js`
6. Validate against checklist
Result: Full CRUD endpoint at `/api/carriers`

Example 2: Sub-resource endpoint
User says: "Add accessorials to loads"
Actions:
1. Create routes inside existing file or new file
2. Nest under `/api/accessorials/load/:loadId`
3. FK to parent table with ON DELETE CASCADE
4. List filtered by parent ID
5. Add service functions and React Query hooks
Result: Nested CRUD at `/api/accessorials/load/:loadId`

Example 3: Action endpoint (not CRUD)
User says: "Add an endpoint to approve a settlement"
Actions:
1. Add `POST /:id/approve` to existing settlements router
2. Validate current status allows transition (use state machine if exists)
3. Update status + set `approved_by` and `approved_at`
4. Return updated record
5. Add `approveSettlement(id)` to api.js
Result: Action endpoint at `POST /api/settlements/:id/approve`

## Troubleshooting

Error: Route not accessible (404)
Cause: Route not registered in server/index.js, or registered before/after auth middleware incorrectly
Solution: Check `server/index.js` — route must be added AFTER `app.use(authenticate(db))` for protected routes

Error: req.user is undefined
Cause: Route is mounted before the authenticate middleware
Solution: Move `app.use('/api/{resource}', ...)` below the `app.use(authenticate(db))` line

Error: PATCH doesn't update timestamp
Cause: Missing `updates.updated_at = db.fn.now()` in the update handler
Solution: Always set updated_at manually since there's no DB trigger (yet)

Error: Frontend gets 401 on new endpoint
Cause: Token not being sent — check if route is behind auth middleware
Solution: Verify the axios interceptor is attaching the Bearer token (it should be automatic via api.js)
