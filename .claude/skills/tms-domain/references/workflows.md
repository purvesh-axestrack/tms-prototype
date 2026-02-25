# Status Workflows & Business Rules

## Load Status Transitions

```
OPEN ──────────► SCHEDULED ──────► IN_PICKUP_YARD ──────► IN_TRANSIT ──────► COMPLETED ──────► INVOICED
  │                  │                    │                                        │
  ├──► BROKERED ─────┤                    │                                        └──► (settlement)
  │                  │                    │
  ├──► TONU          ├──► TONU            ├──► TONU
  │                  │                    │
  └──► CANCELLED     └──► CANCELLED       └──► CANCELLED
```

### Transition Rules

| From | To | Condition |
|------|----|-----------|
| OPEN | SCHEDULED | Driver must be assigned |
| OPEN | BROKERED | External carrier selected |
| OPEN | TONU | — |
| OPEN | CANCELLED | — |
| BROKERED | SCHEDULED | Driver assigned (external carrier's driver) |
| BROKERED | CANCELLED | — |
| SCHEDULED | IN_PICKUP_YARD | — |
| SCHEDULED | TONU | — |
| SCHEDULED | CANCELLED | — |
| IN_PICKUP_YARD | IN_TRANSIT | — |
| IN_PICKUP_YARD | TONU | — |
| IN_PICKUP_YARD | CANCELLED | — |
| IN_TRANSIT | COMPLETED | loaded_miles > 0 |
| COMPLETED | INVOICED | Invoice created for this load |

### Side Effects

| Transition | Side Effect |
|------------|-------------|
| → SCHEDULED | Sets `assigned_at` timestamp |
| → IN_PICKUP_YARD | Sets `picked_up_at` timestamp |
| → COMPLETED | Sets `delivered_at`, driver status → AVAILABLE |
| → TONU | Driver status → AVAILABLE |
| → CANCELLED | Driver status → AVAILABLE (if was assigned) |

### Terminal States
- **TONU**: No further transitions. Load is dead. TONU fee may apply.
- **CANCELLED**: No further transitions. No charges.
- **INVOICED**: No further transitions from load perspective.

---

## Invoice Status Transitions

```
DRAFT ──────► SENT ──────► PAID
  │             │
  │             ├──► OVERDUE ──────► PAID
  │             │
  └──► VOID    └──► VOID
```

### Rules
- Invoice created from COMPLETED loads only
- `due_date = issue_date + customer.payment_terms` (days)
- Partial payments accepted: updates `amount_paid`, recalculates `balance_due`
- Auto-transitions to PAID when `balance_due <= 0`
- VOID cancels the invoice — load goes back to COMPLETED (can be re-invoiced)

### Invoice Line Item Types
1. **LOAD_CHARGE**: `load.rate_amount` (one per load on invoice)
2. **FUEL_SURCHARGE**: `load.fuel_surcharge_amount` (if > 0)
3. **ACCESSORIAL**: `quantity × rate` per accessorial on each load

### Invoice Totals
```
subtotal            = SUM(LOAD_CHARGE amounts)
fuel_surcharge_total = SUM(FUEL_SURCHARGE amounts)
accessorial_total   = SUM(ACCESSORIAL amounts)
total_amount        = subtotal + fuel_surcharge_total + accessorial_total
balance_due         = total_amount - amount_paid
```

---

## Settlement Status Transitions

```
DRAFT ──────► APPROVED ──────► PAID
```

### Rules
- One settlement per driver per period (period_start → period_end)
- Only COMPLETED loads included (not yet INVOICED loads are fine)
- Loads must not already have a `settlement_id`
- After generation, `load.settlement_id` is set

### Settlement Line Item Types
1. **LOAD_PAY**: Calculated driver pay per load
2. **DEDUCTION**: Active recurring deductions applied once per period

### Driver Pay Calculation
```
if pay_model == 'CPM':
    pay = loaded_miles × pay_rate

if pay_model == 'PERCENTAGE':
    pay = load.total_amount × (pay_rate / 100)

if pay_model == 'FLAT':
    pay = pay_rate (fixed per load)

# Apply minimum floor if set:
if minimum_per_mile:
    minimum = loaded_miles × minimum_per_mile
    pay = MAX(pay, minimum)
```

### Settlement Totals
```
gross_pay        = SUM(LOAD_PAY line items)
total_deductions = SUM(DEDUCTION line items)  # positive number
net_pay          = gross_pay - total_deductions
total_miles      = SUM(loaded_miles across loads)
total_loads      = COUNT(loads in settlement)
```

---

## Driver Status Transitions

```
AVAILABLE ◄──────► EN_ROUTE
    │
    ▼
OUT_OF_SERVICE
```

### Rules
- Assigning a load → driver becomes EN_ROUTE
- Load COMPLETED/TONU/CANCELLED → driver becomes AVAILABLE
- OUT_OF_SERVICE blocks new assignments
- A driver can have multiple active loads (if scheduling permits)

---

## Vehicle Status Transitions

```
ACTIVE ◄──────► IN_SHOP
    │
    ▼
OUT_OF_SERVICE ──► INACTIVE (soft delete)
```

---

## Carrier Status (for brokered loads)

```
PROSPECT ──► ACTIVE ──► SUSPENDED ──► INACTIVE
                │                        ▲
                └────────────────────────┘
```

### Carrier Onboarding Checklist
1. MC# and DOT# verified with FMCSA
2. Insurance certificates on file (auto liability + cargo)
3. W-9 on file
4. Rate agreement signed
5. Contact info confirmed
6. Equipment types documented
7. Preferred lanes documented

---

## Scheduling & Conflict Rules

### Overlap Detection
```
Load A conflicts with Load B if:
  A.pickup_date < B.delivery_date AND A.delivery_date > B.pickup_date
```

### Driver Capacity
- One active load per driver (standard)
- Exceptions: local/short runs where driver can handle sequential loads same day
- Always check availability before assignment

---

## Financial Precision Rules

1. All currency: 2 decimal places, `Math.round(value * 100) / 100`
2. Rate types: FLAT (most common), CPM, PERCENTAGE
3. Fuel surcharge: percentage of rate_amount OR flat dollar amount
4. Accessorials: always quantity × rate per unit
5. Never store calculated totals without also storing the components
6. Invoice aging recalculated on read, not stored
