# TMS Feature Document

## Product Overview

A transportation management system for small-to-mid-size trucking companies (1–50 trucks) that handles the full lifecycle: **receive load → dispatch → track → deliver → invoice customer → pay driver**. The system integrates Gmail for automated rate confirmation ingestion, Anthropic Claude for AI-powered PDF extraction, and will integrate Samsara for real-time fleet telematics.

---

## User Roles

| Role | Description | Access Level |
|------|-------------|-------------|
| **Admin** | Company owner / operations manager | Full access to all features, user management, system config |
| **Dispatcher** | Plans and assigns loads to drivers | Loads, dispatch board, drivers, customers, email imports |
| **Accountant** | Handles billing, payments, settlements | Invoices, settlements, aging reports, customer billing |
| **Driver** *(future)* | Operates the truck | Mobile: assigned loads, documents, status updates, HOS |

---

## Current State (What Exists Today)

### Implemented Features

| Feature | Status | Notes |
|---------|--------|-------|
| JWT auth with refresh tokens | Done | 3 seeded users, role-based middleware |
| Dispatch board (Kanban) | Done | 7-column board, drag-free, click-to-open |
| Load CRUD + state machine | Done | DRAFT → CREATED → ASSIGNED → DISPATCHED → PICKED_UP → IN_TRANSIT → DELIVERED |
| Load editing | Done | Edit rate, miles, customer, commodity, equipment, FSC |
| Multi-stop routing | Done | Ordered stops with appointment windows |
| Driver assignment + conflict detection | Done | Date overlap checking prevents double-booking |
| Customer CRUD | Done | Create, edit, soft-delete, detail view with stats |
| Driver CRUD | Done | Create, edit, soft-delete, detail view with deductions/earnings |
| Gmail OAuth2 integration | Done | Email polling, sender whitelist, keyword filtering |
| AI PDF extraction (Claude) | Done | Extracts structured load data from rate confirmations |
| Email import queue | Done | Review, approve, reject, retry workflow |
| Invoicing | Done | Create from delivered loads, line items, status workflow, payments |
| Aging report | Done | By customer, JSON + CSV export |
| Settlements | Done | Batch generate, CPM/percentage/flat pay, approve/pay workflow |
| Accessorial charges | Done | Configurable types, add/remove per load |
| Driver deductions | Done | Recurring/one-time, per-driver management |
| Document storage | Done | Local filesystem, serve PDFs |
| CSV exports | Done | Invoices, settlements, aging report |
| Search/filtering | Done | Dispatch board, invoices, settlements, customers, drivers |
| Sidebar navigation | Done | Grouped: Operations, Directory, Accounting, System |
| shadcn/ui component library | Done | Professional UI with consistent design system |

---

## Feature Roadmap

### Phase 1: Core Gaps (High Priority)

These are features that a trucking company cannot operate without.

---

#### 1.1 Samsara Fleet Integration

**Epic:** As a dispatcher, I need real-time visibility into where my trucks are so I can make informed dispatch decisions and provide accurate ETAs to customers.

##### User Stories

**S-1: Connect Samsara Account**
> As an admin, I want to connect my Samsara account via API key so that the TMS can pull live fleet data.

- Acceptance Criteria:
  - Settings page has a "Samsara Integration" card
  - Admin enters Samsara API key
  - System validates the key by calling Samsara API
  - Connection status shows connected/disconnected with org name
  - API key stored encrypted in database

**S-2: Sync Vehicle List**
> As a dispatcher, I want to see all vehicles from Samsara so I know what equipment is available.

- Acceptance Criteria:
  - New `vehicles` table: id, samsara_id, name, vin, make, model, year, license_plate, status
  - Background job syncs vehicle list from Samsara every 15 minutes
  - Fleet page shows all vehicles with current status
  - Vehicle can be assigned to a driver

**S-3: Real-Time Vehicle Locations**
> As a dispatcher, I want to see live GPS positions of all trucks on a map so I can track fleet movement.

- Acceptance Criteria:
  - Dispatch board has a "Map View" toggle
  - Map shows vehicle markers with driver name, speed, heading
  - Markers update every 30 seconds via polling
  - Click marker to see vehicle details and assigned load
  - Color-coded by status (idle = gray, moving = green, stopped = yellow)

**S-4: Load Tracking with Live ETA**
> As a dispatcher, I want to see a truck's live position on the load detail so I can give customers accurate ETAs.

- Acceptance Criteria:
  - Load detail sheet shows a mini-map with truck position and route
  - ETA calculated based on current position + remaining distance
  - ETA auto-updates as truck moves
  - Alert when truck is within 50 miles of destination
  - Share tracking link with customer (public, no auth)

**S-5: Geofence Auto-Status Updates**
> As a dispatcher, I want load status to update automatically when a truck arrives at or departs from a stop so I don't have to manually click status buttons.

- Acceptance Criteria:
  - System creates geofences around stop addresses via Samsara API
  - When truck enters pickup geofence → auto-update load to PICKED_UP
  - When truck departs pickup → auto-update to IN_TRANSIT
  - When truck enters delivery geofence → auto-update to DELIVERED
  - Arrived/departed timestamps recorded on stops
  - Dispatcher notified via toast when auto-transition occurs
  - Manual override still available

**S-6: Hours of Service Dashboard**
> As a dispatcher, I want to see each driver's remaining HOS hours before assigning a load so I don't create compliance violations.

- Acceptance Criteria:
  - Driver card in assignment modal shows remaining drive hours, on-duty hours
  - Warning badge if driver has < 3 hours remaining
  - Block assignment if driver would violate HOS for the load's estimated duration
  - Dedicated HOS tab on driver detail page showing duty status log
  - Data pulled from Samsara HOS API

**S-7: Driver Safety Scores**
> As an admin, I want to see safety event data from Samsara (harsh braking, speeding, following distance) so I can coach drivers.

- Acceptance Criteria:
  - Driver detail page shows safety score and recent events
  - Events: harsh braking, harsh cornering, speeding, distracted driving
  - Trend chart showing score over last 30 days
  - Alert threshold configurable in settings

**S-8: Fuel & IFTA Data**
> As an accountant, I want fuel consumption data from Samsara so I can generate IFTA reports.

- Acceptance Criteria:
  - Samsara provides fuel usage and odometer data per vehicle
  - System tracks miles driven per state (from GPS breadcrumbs)
  - IFTA report generator: miles by state, fuel by state, net tax
  - Quarterly export for filing

---

#### 1.2 Vehicle & Equipment Management

**Epic:** As a dispatcher, I need to track company trucks and trailers so I can assign equipment to loads and schedule maintenance.

##### User Stories

**V-1: Vehicle Registry**
> As an admin, I want to manage a list of trucks and trailers so I know what equipment we own.

- Acceptance Criteria:
  - New page: `/fleet` under Operations section
  - Table with: unit number, type (tractor/trailer), VIN, year, make, model, plate, status
  - CRUD operations: add, edit, deactivate
  - Status: Active, In Shop, Out of Service
  - Search by unit number, VIN, or plate

**V-2: Equipment Assignment**
> As a dispatcher, I want to assign a truck and trailer to a load so I know which equipment is being used.

- Acceptance Criteria:
  - Load create/edit modal has truck and trailer dropdowns
  - Only show available (not assigned to active loads) equipment
  - Load detail shows assigned equipment
  - Equipment detail shows current assignment

**V-3: Maintenance Tracking**
> As an admin, I want to track maintenance schedules and history so I can keep trucks road-ready.

- Acceptance Criteria:
  - Vehicle detail page has a "Maintenance" tab
  - Add maintenance record: date, type (PM, repair, inspection), description, cost, vendor, odometer
  - PM schedule: configurable intervals (miles or days)
  - Alert when PM is due within 7 days or 1,000 miles
  - Maintenance history table with filters

---

#### 1.3 PDF Invoice Generation

**Epic:** As an accountant, I need to generate professional PDF invoices to send to customers instead of just CSV exports.

##### User Stories

**INV-1: Generate PDF Invoice**
> As an accountant, I want to generate a branded PDF invoice so I can email it to the customer.

- Acceptance Criteria:
  - Invoice detail has "Generate PDF" button
  - PDF includes: company logo/name, invoice number, dates, customer billing info, line items table (load charges, FSC, accessorials), totals, payment terms, remit-to address
  - PDF stored as a document linked to the invoice
  - Download and preview in browser

**INV-2: Email Invoice to Customer**
> As an accountant, I want to email the PDF invoice directly to the customer so I don't have to do it manually.

- Acceptance Criteria:
  - Invoice detail has "Send" button (when status is DRAFT)
  - Sends email to customer's billing_email with PDF attached
  - Auto-updates invoice status to SENT
  - Sent timestamp recorded
  - Email template configurable in settings

**INV-3: Payment Reminder Automation**
> As an accountant, I want automatic payment reminders for overdue invoices so I don't have to track them manually.

- Acceptance Criteria:
  - Configurable reminder schedule: 7 days before due, on due date, 7/14/30 days overdue
  - Auto-send email reminder to customer billing_email
  - Auto-mark invoice as OVERDUE when past due date
  - Reminder history visible on invoice detail

---

#### 1.4 User Management

**Epic:** As an admin, I need to manage team members and their access levels so the right people have the right permissions.

##### User Stories

**U-1: User CRUD**
> As an admin, I want to create, edit, and deactivate user accounts so I can onboard and offboard team members.

- Acceptance Criteria:
  - New page: `/settings/users` (or tab within settings)
  - Table: name, email, role, status, last login
  - Create user: name, email, role, temp password
  - Edit: name, role, active status
  - Deactivate (soft delete) — can't deactivate yourself
  - Password reset sends email (or generates temp password)

**U-2: Role-Based Access Control**
> As an admin, I want to restrict what each role can see and do so that accountants can't dispatch and dispatchers can't void invoices.

- Acceptance Criteria:
  - Dispatcher: Dispatch board, loads, drivers, customers, email imports (no invoices, no settlements, no settings)
  - Accountant: Invoices, settlements, aging report, customers (read-only), loads (read-only)
  - Admin: Everything
  - Sidebar nav only shows accessible pages per role
  - API enforces role checks on all mutation endpoints

---

### Phase 2: Operational Efficiency (Medium Priority)

These features improve daily operations but the company can function without them initially.

---

#### 2.1 Advanced Dispatch

**D-1: Dispatch Calendar View**
> As a dispatcher, I want to see loads and driver schedules on a calendar so I can plan the week ahead.

- Acceptance Criteria:
  - Toggle between Kanban board and calendar view
  - Calendar shows loads as bars spanning pickup → delivery dates
  - Color-coded by status
  - Click to open load detail
  - Filter by driver, customer, status

**D-2: Load Templates**
> As a dispatcher, I want to create loads from templates for recurring lanes so I don't re-enter the same info every time.

- Acceptance Criteria:
  - Save any load as a template (customer, stops, rate, equipment, commodity)
  - Template library accessible from "New Load" flow
  - One-click create from template, just update dates
  - CRUD for templates

**D-3: Bulk Status Update**
> As a dispatcher, I want to update status on multiple loads at once so I can process deliveries faster at end of day.

- Acceptance Criteria:
  - Checkbox selection on dispatch board or list view
  - Bulk action bar: "Mark Selected as Delivered" (or other valid transitions)
  - Confirmation dialog showing all affected loads
  - Audit trail for bulk updates

**D-4: Load Board Integration (DAT/Truckstop)**
> As a dispatcher, I want to search external load boards for available freight so I can keep trucks moving.

- Acceptance Criteria:
  - DAT or Truckstop API integration
  - Search by origin, destination, equipment type, date range
  - Results shown in a table with rate, miles, age
  - One-click import to create a new load from a posting
  - Post our own loads to load boards

---

#### 2.2 Customer Portal

**CP-1: Customer Tracking Link**
> As a customer, I want a link to track my shipment's live location without logging in.

- Acceptance Criteria:
  - Public URL: `/track/:token` (no auth required)
  - Shows: load status, current location on map, ETA, stop details
  - Token is unique per load, expires after delivery + 7 days
  - Link included in load confirmation email

**CP-2: Customer Self-Service Portal**
> As a customer, I want to log in and see my loads, invoices, and documents without calling the carrier.

- Acceptance Criteria:
  - Separate login for customer contacts
  - Dashboard: active loads, recent invoices, outstanding balance
  - View load details and tracking
  - Download PODs, BOLs, invoices
  - Submit load requests (creates load in DRAFT)

---

#### 2.3 Document Management

**DOC-1: Document Upload**
> As a dispatcher, I want to upload documents (BOL, POD, rate con) to a load so all paperwork is in one place.

- Acceptance Criteria:
  - Load detail has "Documents" section with upload button
  - Drag-and-drop or file picker
  - Supports PDF, PNG, JPG
  - Select document type: RATE_CON, BOL, POD, INVOICE, OTHER
  - Document list with type badge, filename, date, size
  - Click to preview/download

**DOC-2: Document Browse Page**
> As a dispatcher, I want a central document library so I can find any document across all loads.

- Acceptance Criteria:
  - New page: `/documents` under Operations
  - Table: filename, type, linked load, linked customer, date
  - Search by load number, customer, document type
  - Filter by type and date range
  - Bulk download as ZIP

**DOC-3: Required Document Checklist**
> As an accountant, I want to see which loads are missing required documents (POD, signed BOL) so I can follow up before invoicing.

- Acceptance Criteria:
  - Load detail shows document checklist: Rate Con ✓, BOL ✓, POD ✗
  - Invoice creation warns if loads are missing PODs
  - Report: "Loads missing documents" filtered by type
  - Configurable required documents per customer

---

#### 2.4 Rate Management

**R-1: Customer Lane Rates**
> As a dispatcher, I want to store contracted rates per customer per lane so I don't have to look them up every time.

- Acceptance Criteria:
  - Customer detail has "Rate Contracts" tab
  - Rate entry: origin state/city, destination state/city, rate, equipment type, effective dates
  - When creating a load, auto-suggest rate if lane matches a contract
  - Rate history per lane

**R-2: Fuel Surcharge Schedule**
> As an accountant, I want a fuel surcharge schedule linked to the DOE diesel index so FSC auto-calculates on loads.

- Acceptance Criteria:
  - Settings has FSC schedule table: price range → surcharge per mile
  - Option to auto-fetch DOE National Average weekly
  - When load is created, auto-calculate FSC based on miles × current rate
  - Override available per load

**R-3: Accessorial/Deduction Type Admin**
> As an admin, I want to manage accessorial types and deduction types from the UI so I don't need a developer.

- Acceptance Criteria:
  - Settings page has "Accessorial Types" and "Deduction Types" tabs
  - CRUD: name, code, default amount, unit, active/inactive
  - Inline editing in table
  - Deactivated types hidden from dropdowns but preserved on historical records

---

### Phase 3: Compliance & Reporting (Medium-Low Priority)

---

#### 3.1 FMCSA Compliance

**C-1: Driver Qualification Files**
> As an admin, I want to track driver compliance documents (CDL, medical card, MVR, drug test) with expiry dates so I don't get fined.

- Acceptance Criteria:
  - Driver detail has "Compliance" tab
  - Document types: CDL, Medical Card, MVR, Drug Test, Background Check, W-9
  - Each entry: document type, issue date, expiry date, uploaded file
  - Dashboard widget: "Expiring in 30 days" alert
  - Email alert to admin 30/14/7 days before expiry

**C-2: DVIR Integration (via Samsara)**
> As a fleet manager, I want to see pre-trip and post-trip inspection reports from Samsara so I can track vehicle condition.

- Acceptance Criteria:
  - Vehicle detail has "Inspections" tab
  - Pull DVIRs from Samsara API
  - Show: date, driver, type (pre/post), defects found, status (safe/unsafe)
  - Alert if vehicle has unresolved defects

---

#### 3.2 Reporting & Analytics

**RP-1: Revenue Report**
> As an admin, I want to see revenue broken down by customer, driver, lane, and time period so I can understand business performance.

- Acceptance Criteria:
  - New page: `/reports` under a new "Reports" nav section
  - Revenue by customer (table + bar chart)
  - Revenue by driver
  - Revenue by lane (origin-destination pairs)
  - Date range filter
  - Export to CSV

**RP-2: Profitability Report**
> As an admin, I want to see profit per load (revenue minus driver pay, fuel, accessorials) so I know which lanes are profitable.

- Acceptance Criteria:
  - Per-load: revenue, driver cost, accessorial cost, profit, margin %
  - Aggregate by customer and by lane
  - Highlight loads with negative margin
  - Date range filter

**RP-3: Driver Performance Report**
> As a dispatcher, I want to see driver metrics (loads completed, miles, on-time %, revenue per mile) so I can evaluate performance.

- Acceptance Criteria:
  - Per-driver metrics for selected period
  - On-time delivery percentage (delivery within appointment window)
  - Revenue generated, miles driven, loads completed
  - Rank drivers by performance
  - Trend over time

**RP-4: IFTA Report**
> As an accountant, I want to generate quarterly IFTA reports so I can file fuel tax returns.

- Acceptance Criteria:
  - Miles by state/jurisdiction (from Samsara GPS or manual entry)
  - Fuel purchased by state
  - Net tax calculation per jurisdiction
  - Quarterly report format matching IFTA filing requirements
  - Export to CSV/PDF

---

### Phase 4: Scale & Polish (Lower Priority)

---

#### 4.1 Mobile Driver App

**M-1: Driver Load View**
> As a driver, I want to see my assigned loads on my phone so I know where to go.

- Acceptance Criteria:
  - Mobile-responsive web app (or React Native)
  - Login with driver credentials
  - List of assigned loads with pickup/delivery details
  - One-tap navigation to next stop (opens Google Maps / Apple Maps)
  - Status update buttons (Arrived, Loaded, Departed, Delivered)

**M-2: Document Capture**
> As a driver, I want to take a photo of the BOL/POD from my phone so the office gets it immediately.

- Acceptance Criteria:
  - Camera button on load view
  - Select document type before capture
  - Auto-upload to server
  - Photo appears in load's document list within seconds

**M-3: Driver Messaging**
> As a dispatcher, I want to send messages to drivers within the TMS instead of texting their personal phone.

- Acceptance Criteria:
  - In-app messaging per load or per driver
  - Dispatcher sees message thread in load detail
  - Driver sees notification on mobile
  - Message history preserved

---

#### 4.2 Accounting Integration

**A-1: QuickBooks Online Sync**
> As an accountant, I want invoices and payments to sync to QuickBooks so I don't double-enter data.

- Acceptance Criteria:
  - Connect QuickBooks via OAuth2
  - When invoice is created → push to QBO as invoice
  - When payment is recorded → push to QBO as payment
  - Customer mapping between TMS and QBO
  - Sync status visible on invoice detail

**A-2: 1099 Generation**
> As an accountant, I want to generate 1099-NEC forms for owner-operators at year end so I can file taxes.

- Acceptance Criteria:
  - Annual report: total payments per driver for the tax year
  - Filter by driver pay model (owner-operators only)
  - Export 1099 data in IRS-compatible format
  - Driver detail shows YTD earnings

---

#### 4.3 Notifications & Alerts

**N-1: In-App Notification Center**
> As a dispatcher, I want a notification bell showing important events so I don't miss anything.

- Acceptance Criteria:
  - Bell icon in sidebar with unread count badge
  - Notification types: new email import, load status change, invoice overdue, driver HOS warning, document expiring, settlement ready
  - Click notification to navigate to relevant page
  - Mark as read, mark all as read
  - Notification preferences in settings (which types to show)

**N-2: Email Alerts**
> As a dispatcher, I want email alerts for critical events so I'm notified even when not in the app.

- Acceptance Criteria:
  - Configurable per user: which events trigger email
  - Critical: load cancelled, invoice overdue 30+ days, driver HOS violation, compliance document expired
  - Daily digest option for non-critical events
  - Unsubscribe link in emails

---

#### 4.4 System & Infrastructure

**SYS-1: Audit Log**
> As an admin, I want to see who changed what and when so I have accountability.

- Acceptance Criteria:
  - Every create/update/delete writes to `audit_log` table
  - Fields: user_id, action, entity_type, entity_id, old_values, new_values, timestamp
  - Audit log viewer in settings (admin only)
  - Filter by user, entity type, date range

**SYS-2: Cloud Document Storage (S3)**
> As an admin, I want documents stored in S3 instead of the local filesystem so they're durable and scalable.

- Acceptance Criteria:
  - Configure S3 bucket, region, credentials in settings
  - New uploads go to S3
  - Existing local files can be migrated
  - Pre-signed URLs for secure access
  - Document schema already has `storage_type` field — implement S3 path

**SYS-3: WebSocket Real-Time Updates**
> As a dispatcher, I want the dispatch board to update in real-time without polling so I see changes instantly.

- Acceptance Criteria:
  - Replace 3-second polling with WebSocket connection
  - Events: load_created, load_status_changed, load_assigned, driver_status_changed
  - Graceful fallback to polling if WebSocket disconnects
  - Reduces server load from constant polling

**SYS-4: API Documentation**
> As a developer, I want auto-generated API docs so I can integrate with the TMS.

- Acceptance Criteria:
  - OpenAPI 3.0 spec generated from route definitions
  - Swagger UI available at `/api/docs`
  - All endpoints documented with request/response schemas
  - Authentication documented

**SYS-5: Automated Testing**
> As a developer, I want test coverage so I can refactor with confidence.

- Acceptance Criteria:
  - Unit tests for business logic (state machine, pay calculation, conflict detection)
  - Integration tests for all API endpoints
  - Frontend component tests for critical flows (load create, invoice create)
  - CI pipeline runs tests on every push
  - Target: 80% coverage on backend

---

## Priority Matrix

| Priority | Phase | Features | Effort |
|----------|-------|----------|--------|
| P0 — Critical | 1 | Samsara GPS tracking, vehicle management, PDF invoices, user management | 4–6 weeks |
| P1 — High | 2 | Customer portal, document management, rate management, dispatch calendar | 4–6 weeks |
| P2 — Medium | 3 | FMCSA compliance, reporting suite, IFTA, HOS dashboard | 4–6 weeks |
| P3 — Low | 4 | Mobile app, QuickBooks, notifications, audit log, S3, WebSockets | 6–8 weeks |

---

## Technical Decisions Needed

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Map library for GPS tracking | Mapbox GL JS, Google Maps, Leaflet | Mapbox — best price/performance for fleet use |
| PDF generation | Puppeteer, @react-pdf/renderer, PDFKit | @react-pdf/renderer — stays in JS ecosystem |
| Email sending | SendGrid, AWS SES, Nodemailer + SMTP | SendGrid — simple API, delivery tracking |
| Mobile approach | React Native, PWA, responsive web | PWA first — low dev cost, cross-platform |
| Real-time protocol | WebSocket (ws/socket.io), SSE | socket.io — reconnection handling built in |
| IFTA mileage tracking | Samsara GPS breadcrumbs, PC Miler API | Samsara — already integrated for GPS |
| Cloud storage | AWS S3, GCS, Cloudflare R2 | R2 — no egress fees, S3-compatible API |

---

## Database Tables Needed

### New Tables for Phase 1

```
vehicles
  id, samsara_id, unit_number, type (TRACTOR/TRAILER), vin, year, make,
  model, license_plate, status (ACTIVE/IN_SHOP/OUT_OF_SERVICE),
  current_driver_id, current_location_lat, current_location_lng,
  last_location_update, odometer, created_at, updated_at

vehicle_assignments
  id, vehicle_id, driver_id, load_id, assigned_at, released_at

samsara_settings
  id, api_key_encrypted, org_id, org_name, is_active,
  last_vehicle_sync, last_location_sync, created_at, updated_at

geofences
  id, samsara_geofence_id, stop_id, load_id, name, latitude, longitude,
  radius_meters, status (ACTIVE/COMPLETED), created_at

tracking_events
  id, load_id, vehicle_id, event_type (GEOFENCE_ENTRY/GEOFENCE_EXIT/LOCATION_UPDATE),
  latitude, longitude, speed, heading, timestamp, created_at
```

### New Tables for Phase 2–3

```
rate_contracts
  id, customer_id, origin_state, origin_city, dest_state, dest_city,
  equipment_type, rate_amount, rate_type, effective_start, effective_end,
  is_active, created_at, updated_at

fuel_surcharge_schedules
  id, name, is_active, created_at, updated_at

fuel_surcharge_tiers
  id, schedule_id, price_min, price_max, surcharge_per_mile

compliance_documents
  id, driver_id, doc_type (CDL/MEDICAL_CARD/MVR/DRUG_TEST/W9),
  issue_date, expiry_date, document_id (FK → documents), notes,
  created_at, updated_at

maintenance_records
  id, vehicle_id, type (PM/REPAIR/INSPECTION), description, cost,
  vendor, odometer_at_service, service_date, next_due_date,
  next_due_odometer, created_at, updated_at

notifications
  id, user_id, type, title, message, entity_type, entity_id,
  is_read, created_at

audit_log
  id, user_id, action (CREATE/UPDATE/DELETE), entity_type, entity_id,
  old_values (jsonb), new_values (jsonb), ip_address, created_at

messages
  id, sender_id, recipient_id, load_id, body, is_read, created_at

ifta_records
  id, vehicle_id, quarter, year, state, miles, fuel_gallons,
  fuel_cost, tax_rate, tax_owed, created_at
```

---

## Success Metrics

| Metric | Current | Phase 1 Target | Phase 2 Target |
|--------|---------|----------------|----------------|
| Time from email to dispatched load | ~15 min (manual review) | < 5 min (auto-extract + approve) | < 2 min (auto-approve high-confidence) |
| Invoice turnaround (delivery → sent) | Manual CSV + email | Same day (PDF + auto-email) | Automated on delivery |
| Settlement turnaround | Manual batch | Weekly batch + approve | Auto-generate weekly |
| Driver location visibility | None (call driver) | Real-time map | Geofence auto-updates |
| Customer ETA accuracy | "I'll call you back" | Live ETA from GPS | Automated ETA notifications |
| FMCSA compliance gap | No tracking | Expiry alerts | Full DQ file management |
| Avg loads dispatched per day | Limited by manual entry | 2× with email automation | 3× with templates + load boards |
