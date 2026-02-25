# TMS Glossary

## Core Concepts

| Term | Definition |
|------|-----------|
| **Load** | A shipment job. Has a customer, rate, driver, truck, and stops. The central entity in TMS. |
| **Lane** | A route corridor (origin → destination). Used for rate quoting and carrier matching. |
| **Stop** | A pickup or delivery location on a load. Minimum 2 per load. |
| **Dispatch** | Assigning a load to a driver/truck and sending them to execute it. |
| **Broker** | Entity that arranges freight between shippers and carriers. Takes a margin. |
| **Carrier** | Company that owns trucks and moves freight. Can be external (brokered) or self (asset). |
| **Shipper** | The customer who needs freight moved. Pays the rate. |

## Financial Terms

| Term | Definition |
|------|-----------|
| **Rate / Line Haul** | Base price charged to customer for moving the freight. |
| **Fuel Surcharge (FSC)** | Additional charge on top of rate, usually a percentage. Covers fuel cost fluctuations. |
| **Accessorial** | Extra charge beyond rate + FSC. Examples: detention, lumper, layover, stop-off. |
| **Total Amount** | rate + fuel_surcharge + SUM(accessorials). What the customer pays. |
| **CPM** | Cents Per Mile. Driver pay model: `loaded_miles × rate_per_mile`. |
| **Percentage** | Driver pay model: `total_amount × percentage`. |
| **Flat** | Driver pay model: fixed amount per load regardless of miles. |
| **Settlement** | Driver payment document for a period. Gross pay minus deductions. |
| **Deduction** | Amount withheld from driver pay. Recurring (insurance, ELD lease) or one-time (cash advance). |
| **Aging** | How overdue an invoice is. Buckets: current, 1-30, 31-60, 61-90, 90+ days. |
| **Payment Terms** | Days until invoice is due (typically 30, 45, or 60 days). Set per customer. |
| **Factoring** | Selling invoices to a third party for immediate cash (at a discount). |
| **TONU** | Truck Order Not Used. Load cancelled after driver dispatched. Usually incurs a flat fee ($250+). |

## Accessorial Types

| Type | Unit | Typical Rate | When Applied |
|------|------|-------------|--------------|
| **Detention** | Per hour | $75/hr | Driver waits at facility beyond free time (usually 2 hrs) |
| **Layover** | Per day | $300/day | Overnight stay required between pickup and delivery |
| **Lumper** | Flat | Varies | Third-party unloading service at warehouse |
| **Driver Assist** | Flat | $100 | Driver helps load/unload (not typical) |
| **Liftgate** | Flat | $75 | Hydraulic lift needed for non-dock deliveries |
| **Stop-off** | Flat | $150 | Extra stop beyond standard pickup + delivery |
| **Tarp** | Flat | $75-150 | Tarping flatbed loads for weather protection |
| **Hazmat** | Flat | $200+ | Hazardous materials surcharge |

## Driver Deduction Types

| Type | Recurring? | Typical Amount |
|------|-----------|---------------|
| **Insurance** | Yes | $150/period |
| **ELD Lease** | Yes | $25/period |
| **Trailer Lease** | Yes | $200/period |
| **Escrow/Maintenance Reserve** | Yes | $50/period |
| **Parking** | Yes | $75/period |
| **Toll Pass** | Yes | $35/period |
| **Fuel Advance** | No | Varies |
| **Cash Advance** | No | Varies |

## Equipment Types

| Type | Code | Description |
|------|------|-------------|
| Dry Van | DRY_VAN | Enclosed trailer for general freight. Most common. |
| Reefer | REEFER | Temperature-controlled trailer for perishables. |
| Flatbed | FLATBED | Open trailer for oversized/heavy loads. |
| Step Deck | STEP_DECK | Lower deck flatbed for taller loads. |
| Lowboy | LOWBOY | Very low deck for heavy equipment. |
| Hotshot | HOTSHOT | Smaller flatbed, faster delivery. |
| Container | CONTAINER | Intermodal shipping container on chassis. |
| Power Only | POWER_ONLY | Tractor only, customer provides trailer. |
| Tanker | TANKER | Liquid cargo. |
| Sprinter Van | SPRINTER_VAN | Small van for expedited/small loads. |
| Straight Truck | STRAIGHT_TRUCK | Non-articulated truck with integrated cargo area. |
| LTL | LTL | Less Than Truckload. Shared trailer, partial loads. |
| TL | TL | Truckload. Full trailer, single shipper. |

## Regulatory / ID Terms

| Term | Definition |
|------|-----------|
| **MC Number** | Motor Carrier number. FMCSA-issued operating authority. Format: MC-XXXXXX. |
| **DOT Number** | Department of Transportation number. Required for interstate commerce. |
| **SCAC Code** | Standard Carrier Alpha Code. 2-4 letter carrier identifier. |
| **CDL** | Commercial Driver's License. Required for vehicles over 26,001 lbs. |
| **ELD** | Electronic Logging Device. Tracks driver hours of service (HOS). Mandated by FMCSA. |
| **BOL** | Bill of Lading. Legal document listing freight details. Signed at pickup. |
| **POD** | Proof of Delivery. Signed BOL or delivery receipt. Required for invoicing. |
| **Rate Con** | Rate Confirmation. Contract between broker and carrier for a specific load. |
| **VIN** | Vehicle Identification Number. 17-character unique vehicle identifier. |
| **HOS** | Hours of Service. Federal limits on driving hours (11 hrs driving, 14 hrs on-duty). |

## Driver Types

| Type | Tax | Description |
|------|-----|-------------|
| **Company Driver** | W-2 | Employee of the carrier. Drives company equipment. |
| **Owner Operator** | 1099 | Independent contractor. Owns their own truck. Higher per-mile rate. |
| **Lease Operator** | 1099 | Leases truck from carrier. Deductions for lease payments. |

## Customer Types

| Type | Description |
|------|-------------|
| **Broker** | Arranges loads between shippers and carriers. Your customer is a broker. |
| **Shipper** | Direct customer who has freight to move. |
| **Partner** | Recurring shipper with contracted rates. |

## Route Types

| Type | Description |
|------|-------------|
| **Local** | Same-day, within ~150 miles. Driver home nightly. |
| **Regional** | Multi-day, within a geographic region (~500 miles). Home weekly. |
| **Long Haul / OTR** | Over The Road. Cross-country. Home every 2-4 weeks. |

## Load Lifecycle Summary

```
Email arrives → AI extracts → Draft created → User reviews/approves
  → Load OPEN → Driver assigned → SCHEDULED
  → Truck arrives at pickup → IN_PICKUP_YARD
  → Freight loaded, truck departs → IN_TRANSIT
  → Delivered, POD signed → COMPLETED
  → Invoice created → INVOICED
  → Driver settlement generated → Settlement DRAFT → APPROVED → PAID
```

Or alternatively:
```
Load OPEN → Brokered to external carrier → BROKERED → SCHEDULED → ...
Load OPEN → Cancelled → CANCELLED (terminal)
Load SCHEDULED → Truck Order Not Used → TONU (terminal, $250 fee)
```
