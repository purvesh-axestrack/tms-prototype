# TMS Entity Reference

What fields each entity needs, based on industry standards and the LoadStop reference DB.

## Core Entities

### Load
The central entity. Everything revolves around loads.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | integer | PK | Auto-increment |
| load_number / reference_number | string | UNIQUE | Customer-facing identifier |
| customer_id | FK → customers | YES | Who's paying |
| carrier_id | FK → carriers | NO | External carrier (if brokered) |
| driver_id | FK → drivers | NO | Null until assigned |
| dispatcher_id | FK → users | NO | Who created/dispatched |
| status | enum | YES | See workflows.md |
| rate_amount | decimal(10,2) | YES | Base freight charge |
| rate_type | enum | YES | FLAT, CPM, PERCENTAGE |
| fuel_surcharge_amount | decimal(10,2) | NO | Dollar amount |
| total_amount | decimal(10,2) | NO | Calculated: rate + fsc + accessorials |
| loaded_miles | integer | NO | Revenue miles |
| empty_miles | integer | NO | Dead head miles |
| commodity | string | NO | What's being shipped |
| weight | integer | NO | Pounds |
| equipment_type | enum | YES | DRY_VAN, REEFER, FLATBED, etc. |
| is_hazmat | boolean | NO | Hazardous materials flag |
| is_tarp_required | boolean | NO | Flatbed tarping |
| truck_id | FK → vehicles | NO | Assigned tractor |
| trailer_id | FK → vehicles | NO | Assigned trailer |
| invoice_id | FK → invoices | NO | Set when invoiced |
| settlement_id | FK → settlements | NO | Set when settled |
| special_instructions | text | NO | Notes for driver |
| assigned_at | timestamptz | NO | When driver assigned |
| picked_up_at | timestamptz | NO | When pickup started |
| delivered_at | timestamptz | NO | When delivery completed |

**LoadStop has additionally:** booking_authority_id, sales_agent_id, booking_terminal_id, brokerage_agent_id, declared_value, settlement_type_id, settlement_amount, target_rate, second driver (team), multiple trailer tracking (dropped_empty, pick_empty).

### Stop
Child of load. Minimum 2 per load.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string/int | PK | |
| load_id | FK → loads | YES | CASCADE delete |
| sequence_order | integer | YES | 1, 2, 3... |
| stop_type | enum | YES | PICKUP, DELIVERY |
| facility_name | string | NO | Location name |
| location_id | FK → locations | NO | If using location master |
| address, city, state, zip | strings | NO | Address fields |
| appointment_start | timestamptz | NO | Scheduled arrival window |
| appointment_end | timestamptz | NO | End of window |
| arrived_at | timestamptz | NO | Actual arrival |
| departed_at | timestamptz | NO | Actual departure |

**LoadStop has additionally:** stop_action (Live Load / Hook Trailer), quantity + qty_type (Pallets/Boxes/etc.), reefer_mode, seal_number, container_number, chassis_number, yard_location, commodity per stop, weight per stop, temperature.

### Customer
Who pays for loads.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string/int | PK | |
| company_name | string | YES | |
| customer_type | enum | NO | BROKER, SHIPPER, PARTNER |
| mc_number | string | UNIQUE | Motor Carrier # |
| dot_number | string | NO | DOT # |
| billing_email | string | NO | |
| payment_terms | integer | YES | Days (30, 45, 60) |
| is_active | boolean | YES | |

**Sub-entities needed:**
- **customer_contacts**: name, email, phone, contact_type (GENERAL, BILLING, TRACKING, SCHEDULING)
- **customer_billing**: billing address, factoring company, quick pay settings

### Carrier (for brokered loads)
External company you broker loads to.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | integer | PK | |
| carrier_name | string | YES | |
| mc_number | string | UNIQUE | Motor Carrier # |
| dot_number | string | UNIQUE | DOT # |
| scac_code | string | NO | 2-4 letter code |
| fed_tax_id | string | NO | EIN for 1099 |
| fleet_size | integer | NO | |
| status | enum | YES | PROSPECT, ACTIVE, SUSPENDED, INACTIVE |
| is_active | boolean | YES | |

**Sub-entities needed:**
- **carrier_contacts**: name, email, phone, type (PRIMARY, FACTORING, INVOICE, REMIT)
- **carrier_insurance**: type (AUTO_LIABILITY, CARGO, GENERAL), policy_number, provider, expiry_date, coverage_amount
- **carrier_lanes**: origin_state, dest_state, equipment_type, rate preferences
- **carrier_equipment**: equipment types available, quantities

### Driver

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string/int | PK | |
| full_name | string | YES | |
| phone | string | NO | |
| email | string | NO | |
| license_number | string | UNIQUE | CDL number |
| license_state | string | NO | Issuing state |
| status | enum | YES | AVAILABLE, EN_ROUTE, OUT_OF_SERVICE |
| driver_type | enum | NO | COMPANY_DRIVER, OWNER_OPERATOR |
| tax_type | enum | NO | W2, 1099 |
| route_type | enum | NO | LOCAL, REGIONAL, OTR |
| pay_model | enum | YES | CPM, PERCENTAGE, FLAT |
| pay_rate | decimal(10,2) | YES | Rate per model |
| minimum_per_mile | decimal(10,2) | NO | Floor for percentage model |
| is_active | boolean | YES | |

**Sub-entities needed (from LoadStop):**
- **driver_contacts**: emergency contact, next of kin
- **driver_endorsements**: endorsement type (HAZMAT, TANKER, DOUBLES_TRIPLES), expiry date
- **driver_rate_cards**: multiple rate tiers by equipment type or lane
- **driver_teams**: team driver pairings with shared rate cards

### Vehicle (Tractor)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string/int | PK | |
| unit_number | string | UNIQUE | Fleet number (T-101) |
| type | enum | YES | TRACTOR, TRAILER |
| vin | string | UNIQUE | 17-char VIN |
| year | integer | NO | |
| make, model | strings | NO | |
| license_plate | string | NO | |
| license_state | string | NO | |
| status | enum | YES | ACTIVE, IN_SHOP, OUT_OF_SERVICE, INACTIVE |
| current_driver_id | FK → drivers | NO | |
| is_leased | boolean | NO | Owned vs leased |

**LoadStop has additionally:** tank_capacity, average_mpg, fleet_group_id, terminal_id, lease_carrier_id.

### Location (Facility Master)
Reusable pickup/delivery locations.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | integer | PK | |
| location_name | string | YES | Facility name |
| address | string | YES | |
| city, state, zip | strings | YES | |
| lat, lng | decimal | NO | Geocoded |
| is_active | boolean | YES | |

**LoadStop has 159 locations.** Stops reference locations via FK instead of storing address inline.

---

## Supporting Entities

### Invoice
Groups loads for customer billing.

| Field | Notes |
|-------|-------|
| invoice_number | UNIQUE, sequential |
| customer_id | FK, one customer per invoice |
| status | DRAFT → SENT → PAID/OVERDUE → VOID |
| subtotal, fuel_surcharge_total, accessorial_total, total_amount | Aggregated |
| amount_paid, balance_due | Payment tracking |
| issue_date, due_date, sent_at, paid_at | Lifecycle dates |

### Settlement
Driver pay for a period.

| Field | Notes |
|-------|-------|
| settlement_number | UNIQUE, sequential |
| driver_id | FK, one driver per settlement |
| period_start, period_end | Pay period |
| status | DRAFT → APPROVED → PAID |
| gross_pay, total_deductions, net_pay | Calculated |

### Documents (Polymorphic)
Attached to loads, carriers, drivers, vehicles.

| Field | Notes |
|-------|-------|
| ref_type | LOAD, CARRIER, DRIVER, VEHICLE |
| ref_id | FK to the parent entity |
| doc_type | BOL, POD, RATE_CON, INSURANCE, CDL, etc. |
| file_url / storage_path | Where it's stored |
| expiry_date | For insurance, CDL, medical card |

### Events / Audit Trail
Log of all status changes and significant actions.

| Field | Notes |
|-------|-------|
| ref_type, ref_id | Polymorphic reference |
| event_type | LOAD_CREATED, STATUS_CHANGED, DRIVER_ASSIGNED, etc. |
| old_value, new_value | What changed |
| timestamp | When |
| user_id | Who did it |
| lat, lng | Where (from ELD/GPS) |

---

## What Our Prototype Has vs What's Missing

### Currently Built (18 tables)
users, customers, drivers, loads, stops, documents, email_imports, gmail_settings, refresh_tokens, accessorial_types, load_accessorials, invoices, invoice_line_items, settlements, settlement_line_items, deduction_types, driver_deductions, vehicles, samsara_settings

### Missing (from LoadStop + industry needs)
| Entity | Priority | Why |
|--------|----------|-----|
| **carriers** | HIGH | Needed for broker mode |
| **carrier_contacts** | HIGH | With carrier |
| **carrier_insurance** | HIGH | Compliance requirement |
| **locations** | MEDIUM | Reusable facility master |
| **events / audit_trail** | MEDIUM | Status change logging |
| **notes** | MEDIUM | Polymorphic notes on any entity |
| **customer_contacts** | MEDIUM | Multiple contacts per customer |
| **driver_endorsements** | LOW | CDL endorsement tracking |
| **driver_teams** | LOW | Team driving support |
| **terminal** | LOW | Multi-terminal operations |
| **fleet_group** | LOW | Vehicle grouping |
| **routes** | LOW | Predefined lane corridors |
| **leases** | LOW | Vehicle/trailer lease tracking |
