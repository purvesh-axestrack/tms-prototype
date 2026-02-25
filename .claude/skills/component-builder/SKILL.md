---
name: component-builder
description: Builds React components following the TMS project patterns — shadcn/ui, TanStack React Query v5, Sonner toasts, lucide-react icons. Use when user says "create component", "build a page", "add a modal", "new page for", "create a form", "build UI for", or asks to add frontend for a new feature. Do NOT use for API-only work (use api-endpoint instead) or database work (use db-engineering instead).
metadata:
  author: TMS Prototype
  version: 1.0.0
---

# Component Builder

Builds React components following established TMS project patterns. Handles pages, modals, detail sheets, and sub-components.

## Instructions

### Step 1: Determine Component Type

Pick one based on user request:

| Type | When | Template |
|------|------|----------|
| **Page** | New top-level route (e.g., Carriers page) | Table + search + Sheet detail + Dialog form |
| **Modal (Dialog)** | Create/edit form that overlays | Dialog + form fields + submit |
| **Detail (Sheet)** | Slide-out panel for viewing/editing a record | Sheet from right, navy header, card body |
| **Sub-component** | Reusable piece inside a page (e.g., AccessorialEditor) | Card-based, self-contained queries |
| **Board column** | Kanban-style grouped view | Grid columns with cards |

### Step 2: Set Up Imports

Every component follows this import order. Consult `references/component-patterns.md` for details.

```js
// 1. React
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 2. API functions
import { getItems, createItem, ... } from '../services/api';

// 3. shadcn/ui components (only what's used)
import { Button } from '@/components/ui/button';
// ... (see references for full list per component type)

// 4. Icons
import { Plus, Search, Loader2, ... } from 'lucide-react';

// 5. Toast
import { toast } from 'sonner';
```

### Step 3: Build the Component

Follow the patterns in `references/component-patterns.md` for your component type. Key rules:

1. **Query keys**: Always arrays — `['resource']` for list, `['resource', id]` for detail
2. **Conditional queries**: Use `enabled: !!id` for detail fetches
3. **Mutations**: Always invalidate related query keys on success
4. **Toast errors**: Extract `err.response?.data?.error || 'Fallback message'`
5. **Form state**: Separate `editing` (metadata) from `formData` (values)
6. **Loading**: Skeleton for initial, Loader2 spinner for buttons
7. **Empty state**: Icon + text, differentiate "no results" from "no data yet"
8. **Status colors**: Define as constant object at file top, use with Badge
9. **Soft delete**: Status-based deactivation, never hard delete from UI
10. **No native HTML**: No `<select>`, `<input>`, `<button>` — always shadcn equivalents

### Step 4: Register (if Page)

For new pages:
1. Add route to `App.jsx` inside the `<Routes>` block
2. Add nav entry to `NAV_SECTIONS` array in `App.jsx`
3. Import the page component

### Step 5: Validate

Before presenting:

1. All imports from `@/components/ui/*` (not raw HTML)?
2. Icons from `lucide-react` (not inline SVG)?
3. `useQuery` with array query keys?
4. `useMutation` with `onSuccess` invalidation + toast?
5. Error handling with `err.response?.data?.error` fallback?
6. Loading state with Skeleton or Loader2?
7. Empty state for zero results?
8. AlertDialog for destructive confirmations (not `window.confirm`)?
9. Sonner toast for success/error (not `window.alert`)?
10. Status colors defined as constant object?

## Examples

Example 1: New CRUD page
User says: "Build a carriers page"
Actions:
1. Determine type: Page (table + search + sheet + dialog)
2. Create `frontend/src/pages/CarriersPage.jsx`
3. Add table with search, sheet for detail, dialog for create/edit
4. Add route to App.jsx, nav entry to NAV_SECTIONS
5. Validate against checklist
Result: Full page at `/carriers` with list, detail, create, edit, deactivate

Example 2: New modal
User says: "Add a modal for creating a carrier"
Actions:
1. Determine type: Modal (Dialog)
2. Create `frontend/src/components/CarrierCreateModal.jsx`
3. Dialog with form fields, validation, submit mutation
4. Validate against checklist
Result: Reusable modal component with form and API integration

Example 3: Detail sheet
User says: "Add a detail view for settlements"
Actions:
1. Determine type: Sheet (detail panel)
2. Navy header with title + badge, card body sections
3. Edit mode toggle, action buttons, nested sub-components
4. Validate against checklist
Result: Sheet sliding from right with full settlement details

## Troubleshooting

Error: Select component doesn't show placeholder
Cause: shadcn Select doesn't support empty string values
Solution: Use `value={val || undefined}` with `<SelectValue placeholder="Choose..." />`

Error: Sheet/Dialog doesn't close on backdrop click
Cause: `onOpenChange` not wired correctly
Solution: Use `onOpenChange={(open) => !open && onClose()}`

Error: Query refetches on every render
Cause: Inline function in queryFn creating new reference each render
Solution: Use `() => getItem(id)` not `getItem(id)` (wrap in arrow function)

Error: Mutation success but data doesn't update
Cause: Missing `queryClient.invalidateQueries()`
Solution: Always invalidate both list and detail query keys after mutation
