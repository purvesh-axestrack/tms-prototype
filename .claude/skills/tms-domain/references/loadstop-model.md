# LoadStop Reference Database

Company's existing TMS at `erpdb.xswift.biz`. Use for domain coverage reference, NOT as a pattern to follow (has engineering issues).

## Stats
- 43 tables, 127 loads, 24 customers, 16 drivers, 11 carriers, 16 vehicles, 159 locations

## Good Domain Coverage (learn from)

### Carrier Model (6 tables)
```
carriers
├── carrier_contacts     (Primary, Factoring, Invoice, Remit contacts)
├── carrier_certification
├── carrier_details
├── carrier_dispatch
├── carrier_liability    (insurance policies: auto, cargo, general)
└── carrier_users        (carrier portal users)
```

### Driver Model (8 tables)
```
drivers
├── driver_contact       (emergency, next of kin)
├── driver_details_extended
├── driver_endorsements  (HAZMAT, TANKER, etc.)
├── driver_rate_card     (pay rates by equipment/lane)
├── driver_team          (team driver pairings)
├── driver_team_rate_card
├── driver_timinig       (scheduling/availability)
└── driver_vehicle_mapping (primary/secondary assignment)
```

### Customer Model (3 tables)
```
customers
├── customer_contacts    (General, Billing, Tracking, Scheduling)
├── customer_billing
└── customer_invoice_docs
```

### Load Details
Fields we don't have yet:
- `booking_authority_id` → which authority books (for multi-carrier)
- `brokerage_agent_id` → which broker sourced the load
- `sales_agent_id` → sales attribution
- `target_rate` → rate before negotiation
- `declared_value` → cargo insurance value
- `is_hazmat`, `hazmat_type_id` → hazmat flags
- `is_tarp_required` → flatbed tarping
- `driver_id2` → second driver for team loads
- `dropped_empty_trailer_id`, `pick_empty_trailer_id` → trailer swap tracking
- `settlement_type_id`, `settlement_amount` → per-load settlement override

### Stop Details
Fields we don't have yet:
- `stop_action` → Live Load vs Hook Trailer
- `qty` + `qty_type` → Pallets, Boxes, Bushels, Cases, etc.
- `reefer_mode` → Continuous, Cycle, Off, etc.
- `seal_number`, `container_number`, `chassis_number`
- `yard_location_id` → where trailer was dropped/picked
- `commodity` per stop (not just per load)
- `weight` per stop
- `temperature` settings

### Cross-Cutting Entities
- **locations** (159): Reusable facility master with geocoding
- **documents**: Polymorphic, attached to any entity. Tracks expiry dates.
- **events**: Audit trail with GPS coordinates. Full lifecycle tracking.
- **notes**: Polymorphic notes on any entity
- **accounting**: Tax/vendor info per entity
- **leases**: Vehicle/trailer lease tracking
- **payable_to**: Payment routing (EIN, address, bank details)

### Organizational
- **terminal**: Physical office locations (multi-terminal operations)
- **fleet_group**: Vehicle grouping (by terminal, department, etc.)
- **routes**: Predefined lane corridors

### Geography
- **country** → **states** → **city** (with zip, lat, long)
- Used by locations, terminals, contacts

## Bad Patterns (do NOT copy)

### type_master Anti-Pattern
One table for ALL enums. 36 categories, 271 entries. No FK enforcement from referencing tables.
```
type_master (type_id, id, description)
  type_id=7  → trailer types (28 values)
  type_id=8  → vehicle types (30 values)
  type_id=31 → load trip status (5 values)
  type_id=35 → invoice status (7 values)
  ... 36 categories total
```
**Instead:** Use CHECK constraints for small fixed enums, dedicated lookup tables for large/configurable ones.

### Everything Nullable
Core fields like `carrier_id`, `load_number`, `customer_id` on loads are all nullable. No NOT NULL discipline.

### No Updated_at
Zero `updated_at` columns anywhere. No audit of when records were modified.

### No FK on Type References
Columns like `fee_type_id`, `trip_status_type_id` reference `type_master` but have no FK constraint. Can hold any integer.

### Denormalized Addresses
City, state, country names stored alongside `city_id` FK in multiple tables. Same fact in two places.

### Typos
`driver_timinig` (should be `driver_timing`), `dispatche_dt` (should be `dispatch_date`).

## Equipment Type Mapping

LoadStop uses 28+ equipment types (mixed case). Map to our SCREAMING_SNAKE_CASE:

| LoadStop | Ours |
|----------|------|
| Van | DRY_VAN |
| Reefer | REEFER |
| Flatbed | FLATBED |
| Stepdeck / StepDeck | STEP_DECK |
| Lowboy | LOWBOY |
| Hot Shot | HOTSHOT |
| Container | CONTAINER |
| Power Only | POWER_ONLY |
| Tanker | TANKER |
| Straight Truck | STRAIGHT_TRUCK |
| Sprinter Van | SPRINTER_VAN |
| Cargo Van | CARGO_VAN |
| VanReefer / Van or Reefer | DRY_VAN_REEFER |

## Load Status Mapping

| LoadStop (type_id=31) | Ours |
|-----------------------|------|
| Scheduled | SCHEDULED |
| In Transit | IN_TRANSIT |
| Completed | COMPLETED |
| Cancelled | CANCELLED |
| CompleteTONU | TONU |

We additionally have: OPEN, IN_PICKUP_YARD, BROKERED, INVOICED.

## Invoice Status Mapping

| LoadStop (type_id=35) | Ours |
|-----------------------|------|
| Pending | DRAFT |
| On Hold | (no equivalent) |
| Ready To Send | DRAFT |
| Pending Upload | (no equivalent) |
| Pending Payment | SENT |
| Partially Paid | SENT (partial payment tracked on amount_paid) |
| Payment Received | PAID |

We additionally have: OVERDUE, VOID.
