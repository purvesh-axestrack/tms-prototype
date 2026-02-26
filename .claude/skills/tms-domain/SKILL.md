---
name: tms-domain
description: Provides TMS (Transportation Management System) domain knowledge — freight terminology, business rules, entity relationships, status workflows, and rate calculations. Use when building any TMS feature, when user mentions freight/trucking concepts like "loads", "carriers", "detention", "BOL", "settlements", "dispatch", "accessorials", or when Claude needs domain context to make correct design decisions. Also use when user says "what should this table look like" or asks about TMS business logic.
metadata:
  author: TMS Prototype
  version: 1.0.0
---

# TMS Domain Knowledge

Reference for freight and trucking business rules. Consult this before building any TMS feature to avoid domain mistakes.

## Instructions

### When to Consult This Skill

- Before designing any new table or entity
- Before adding status fields or workflows
- Before building rate/payment/settlement features
- When user uses freight terminology you need to interpret correctly
- When deciding what fields an entity needs

### How to Use

1. Check `references/glossary.md` for terminology
2. Check `references/entities.md` for what fields/relationships an entity needs
3. Check `references/workflows.md` for status transitions and business rules
4. Check `references/loadstop-model.md` for additional domain coverage from the reference DB

### Key Principles

1. **Every load has a customer, rate, and at least 2 stops** (pickup + delivery)
2. **Driver pay is calculated, not entered** — derived from pay_model (CPM/PERCENTAGE/FLAT)
3. **Invoices aggregate loads** — one invoice can cover multiple loads for the same customer
4. **Settlements aggregate loads** — one settlement covers all loads in a driver's pay period
5. **Status transitions are strict** — use the state machine, never skip states
6. **Money is always 2 decimals** — `Math.round(value * 100) / 100`
7. **Enums are SCREAMING_SNAKE_CASE** — never "Dry Van", always "DRY_VAN"
8. **Soft delete everything** — set `is_active = false`, never hard delete

## Examples

Example 1: User says "add carrier support"
Actions:
1. Consult `references/entities.md` for carrier fields (MC#, DOT#, SCAC, insurance, contacts)
2. Consult `references/loadstop-model.md` for carrier sub-tables (contacts, insurance, lanes, equipment)
3. Carrier needs: name, mc_number, dot_number, scac_code, status, insurance info, contact info
4. Load gets: carrier_id FK, carrier_rate, is_brokered flag
Result: Properly modeled carrier with all industry-standard fields

Example 2: User says "add detention charges"
Actions:
1. Consult `references/glossary.md` — detention = waiting time at facility beyond free time
2. Already modeled as accessorial type with unit=PER_HOUR, default=$75
3. Applied per stop, quantity = hours waiting
4. Flows into invoice as ACCESSORIAL line item
Result: Detention handled through existing accessorial system, no new table needed

Example 3: User says "build the settlements page"
Actions:
1. Consult `references/workflows.md` for settlement lifecycle (DRAFT → APPROVED → PAID)
2. Settlement = sum of driver pay for loads in a period, minus deductions
3. Driver pay calculated per load based on pay_model
4. Deductions: recurring (insurance, ELD) + one-time (fuel advance, cash advance)
Result: Correct settlement logic with proper pay calculation

## Troubleshooting

Error: Built a feature that duplicates existing functionality
Cause: Didn't check what's already in the prototype
Solution: Always check existing tables and routes before adding new entities

Error: Modeled something wrong for the freight industry
Cause: Didn't consult domain references
Solution: Check glossary and entities references. When in doubt, check LoadStop DB for how real TMS systems model it.

Error: Rate calculation is off
Cause: Forgot fuel surcharge or accessorials
Solution: Total = rate_amount + fuel_surcharge + SUM(accessorials). Always 3 components.
