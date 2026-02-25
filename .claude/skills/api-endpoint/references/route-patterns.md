# Route Patterns Reference

Extracted from the actual TMS codebase. Follow these exactly.

## File Structure

```
server/
├── index.js                    # Route registration + middleware
├── middleware/
│   ├── auth.js                 # authenticate(db), requireRole(...roles)
│   └── errorHandler.js         # errorHandler, asyncHandler
├── routes/
│   ├── loads.js                # export default function loadsRouter(db) {}
│   ├── drivers.js
│   ├── vehicles.js
│   └── ...
└── lib/
    ├── stateMachine.js         # Status transition validation
    ├── conflictDetection.js    # Business logic helpers
    └── rateCalculator.js
```

## Route File Template

```js
import { Router } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../middleware/errorHandler.js';
// import { requireRole } from '../middleware/auth.js';  // only if needed

export default function {resource}Router(db) {
  const router = Router();

  // GET /api/{resource}
  router.get('/', asyncHandler(async (req, res) => {
    const { status, ...filters } = req.query;
    let query = db('{table_name}').orderBy('created_at', 'desc');

    if (status) query = query.where('status', status);
    // Add more filters as needed

    const items = await query;
    res.json(items);
  }));

  // GET /api/{resource}/:id
  router.get('/:id', asyncHandler(async (req, res) => {
    const item = await db('{table_name}').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: '{Resource} not found' });
    res.json(item);
  }));

  // POST /api/{resource}
  router.post('/', asyncHandler(async (req, res) => {
    const { field1, field2 } = req.body;

    // Validate required fields
    if (!field1) return res.status(400).json({ error: 'field1 is required' });

    // Validate enums inline
    if (field2 && !['VALUE_A', 'VALUE_B'].includes(field2)) {
      return res.status(400).json({ error: 'Invalid field2 value' });
    }

    // For string-PK tables:
    const id = `prefix_${crypto.randomUUID().slice(0, 8)}`;

    // For integer-PK tables, omit id (auto-increment)
    const [insertedId] = await db('{table_name}').insert({ id, field1, field2 }).returning('id');

    const item = await db('{table_name}').where({ id: id || insertedId }).first();
    res.status(201).json(item);
  }));

  // PATCH /api/{resource}/:id
  router.patch('/:id', asyncHandler(async (req, res) => {
    const item = await db('{table_name}').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: '{Resource} not found' });

    const allowed = ['field1', 'field2', 'status'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // Validate enums if present
    if (updates.status && !['ACTIVE', 'INACTIVE'].includes(updates.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.updated_at = db.fn.now();
    await db('{table_name}').where({ id: req.params.id }).update(updates);
    const updated = await db('{table_name}').where({ id: req.params.id }).first();
    res.json(updated);
  }));

  // DELETE /api/{resource}/:id (soft delete)
  router.delete('/:id', asyncHandler(async (req, res) => {
    const item = await db('{table_name}').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: '{Resource} not found' });

    // Check for dependent records before deactivating
    // const deps = await db('child_table').where({ parent_id: req.params.id }).count('id as count').first();
    // if (parseInt(deps.count) > 0) return res.status(400).json({ error: 'Cannot delete with active dependencies' });

    await db('{table_name}').where({ id: req.params.id }).update({
      status: 'INACTIVE',
      updated_at: db.fn.now(),
    });
    res.json({ message: '{Resource} deactivated' });
  }));

  return router;
}
```

## Registration in server/index.js

```js
// Public routes (before auth middleware)
app.use('/api/auth', authRouter(db));

// Auth middleware
app.use(authenticate(db));

// Protected routes (after auth middleware)
app.use('/api/{resource}', {resource}Router(db));
```

## Role-Restricted Routes

```js
import { requireRole } from '../middleware/auth.js';

// Only ADMIN can create
router.post('/', requireRole('ADMIN'), asyncHandler(async (req, res) => { ... }));

// Available roles: ADMIN, DISPATCHER, ACCOUNTANT
```

## Frontend api.js Pattern

All API functions live in `frontend/src/services/api.js`. Pattern:

```js
// === {Resources} ===
export const get{Resources} = (params) => api.get('/{resource}', { params }).then(r => r.data);
export const get{Resource} = (id) => api.get(`/{resource}/${id}`).then(r => r.data);
export const create{Resource} = (data) => api.post('/{resource}', data).then(r => r.data);
export const update{Resource} = (id, data) => api.patch(`/{resource}/${id}`, data).then(r => r.data);
export const delete{Resource} = (id) => api.delete(`/{resource}/${id}`).then(r => r.data);
```

For action endpoints:
```js
export const approve{Resource} = (id) => api.post(`/{resource}/${id}/approve`).then(r => r.data);
export const assign{Resource} = (id, data) => api.patch(`/{resource}/${id}/assign`, data).then(r => r.data);
```

## React Query v5 Patterns

```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// List query
const { data: items = [], isLoading } = useQuery({
  queryKey: ['{resource}'],
  queryFn: get{Resources},
});

// Detail query (conditional)
const { data: detail, isLoading: detailLoading } = useQuery({
  queryKey: ['{resource}', selectedId],
  queryFn: () => get{Resource}(selectedId),
  enabled: !!selectedId,
});

// Mutation with invalidation
const queryClient = useQueryClient();
const createMutation = useMutation({
  mutationFn: create{Resource},
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['{resource}'] });
    toast.success('{Resource} created');
  },
  onError: (err) => toast.error(err.response?.data?.error || 'Failed to create'),
});
```

## ID Generation Conventions

| Table | PK Type | Format | Example |
|-------|---------|--------|---------|
| users | string | `user_{uuid8}` | `user_a1b2c3d4` |
| customers | string | `cust_{uuid8}` | `cust_e5f6g7h8` |
| drivers | string | `drv_{uuid8}` | `drv_i9j0k1l2` |
| vehicles | string | `v_{uuid8}` | `v_m3n4o5p6` |
| stops | string | `stop_{uuid8}` | `stop_q7r8s9t0` |
| loads | integer | auto-increment | `1`, `2`, `3` |
| invoices | integer | auto-increment | `1`, `2`, `3` |
| settlements | integer | auto-increment | `1`, `2`, `3` |

New tables: use **integer auto-increment** unless there's a reason for string PKs (client-generated IDs, external system sync).

## Enrichment Pattern (for detail endpoints)

When a resource has FK relationships, enrich the response:

```js
async function enrichItem(item) {
  const related = await db('related_table').where({ parent_id: item.id });
  const parent = await db('parent_table').where({ id: item.parent_id }).first();
  return {
    ...item,
    related_items: related,
    parent_name: parent?.name,
  };
}
```

## Error Response Format

Always `{ error: 'Human-readable message' }`:

```js
// 400 - Bad request (validation)
res.status(400).json({ error: 'Unit number is required' });

// 401 - Unauthorized (handled by middleware)
res.status(401).json({ error: 'Authentication required' });

// 403 - Forbidden (handled by requireRole)
res.status(403).json({ error: 'Insufficient permissions' });

// 404 - Not found
res.status(404).json({ error: 'Vehicle not found' });

// 500 - Server error (handled by errorHandler middleware)
res.status(500).json({ error: 'Internal server error' });
```

## Knex Query Patterns

```js
// Basic select with filter
db('table').where({ status: 'ACTIVE' }).orderBy('created_at', 'desc');

// Join with qualified column names
db('loads')
  .leftJoin('customers', 'loads.customer_id', 'customers.id')
  .select('loads.*', 'customers.company_name as customer_name');

// Count for dependency checks
const deps = await db('loads')
  .where({ driver_id: id })
  .whereNotIn('status', ['COMPLETED', 'CANCELLED'])
  .count('id as count')
  .first();

// Insert and return
await db('table').insert({ ... });
const item = await db('table').where({ id }).first();

// Update with timestamp
await db('table').where({ id }).update({ ...updates, updated_at: db.fn.now() });
```
