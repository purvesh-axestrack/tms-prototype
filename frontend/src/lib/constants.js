/**
 * Single source of truth for all TMS enum values on the frontend.
 * Mirrors server/lib/constants.js — keep in sync.
 */

// ── Users ──────────────────────────────────────────────────────────────
export const USER_ROLES = ['ADMIN', 'DISPATCHER', 'ACCOUNTANT'];

// ── Loads ──────────────────────────────────────────────────────────────
export const LOAD_STATUSES = ['OPEN', 'SCHEDULED', 'IN_PICKUP_YARD', 'IN_TRANSIT', 'COMPLETED', 'TONU', 'CANCELLED', 'INVOICED', 'BROKERED'];
export const RATE_TYPES = ['FLAT', 'CPM', 'PERCENTAGE'];
export const EQUIPMENT_TYPES = ['DRY_VAN', 'REEFER', 'FLATBED', 'STEP_DECK', 'LOWBOY', 'HOTSHOT', 'CONTAINER', 'POWER_ONLY', 'TANKER', 'STRAIGHT_TRUCK', 'SPRINTER_VAN', 'CARGO_VAN'];
export const STOP_TYPES = ['PICKUP', 'DELIVERY'];
export const REEFER_MODES = ['CONTINUOUS', 'CYCLE_SENTRY', 'OFF'];
export const STOP_ACTION_TYPES = ['LIVE_LOAD', 'LIVE_UNLOAD', 'DROP_TRAILER', 'HOOK_TRAILER'];
export const STOP_STATUSES = ['PENDING', 'EN_ROUTE', 'AT_FACILITY', 'LOADING', 'UNLOADING', 'COMPLETED'];
export const APPOINTMENT_TYPES = ['FCFS', 'APPOINTMENT'];
export const STOP_REEFER_MODES = ['CONTINUOUS', 'CYCLE', 'SPECIAL_SETTING'];
export const QUANTITY_TYPES = [
  'PALLETS','BOXES','BUSHELS','CASES','CRATES','GALLONS','PIECES',
  'TRAILER','ROLLS','DRUMS','BAG','BARREL','CARTON','PACKAGE','SKID','TANK',
  'HAZMAT','POUND','LINEAR_FEET','BULK','MIXED','TON','HOURS','DAYS',
  'FEET','METERS','INCHES','CENTIMETERS','YARDS','TOTES',
];

// ── Drivers ────────────────────────────────────────────────────────────
export const DRIVER_STATUSES = ['AVAILABLE', 'EN_ROUTE', 'OUT_OF_SERVICE', 'INACTIVE'];
export const PAY_MODELS = ['CPM', 'PERCENTAGE', 'FLAT'];
export const DRIVER_TYPES = ['COMPANY_DRIVER', 'OWNER_OPERATOR'];
export const TAX_TYPES = ['W2', '1099'];
export const ROUTE_TYPES = ['LOCAL', 'REGIONAL', 'OTR'];

// ── Customers ──────────────────────────────────────────────────────────
export const CUSTOMER_TYPES = ['BROKER', 'SHIPPER', 'PARTNER'];

// ── Vehicles ───────────────────────────────────────────────────────────
export const VEHICLE_TYPES = ['TRACTOR', 'TRAILER'];
export const VEHICLE_STATUSES = ['ACTIVE', 'IN_SHOP', 'OUT_OF_SERVICE', 'INACTIVE'];

// ── Carriers ───────────────────────────────────────────────────────────
export const CARRIER_STATUSES = ['PROSPECT', 'ACTIVE', 'SUSPENDED', 'INACTIVE'];
export const INSURANCE_TYPES = ['AUTO_LIABILITY', 'CARGO', 'GENERAL'];

// ── Documents ──────────────────────────────────────────────────────────
export const DOC_TYPES = ['RATE_CON', 'BOL', 'POD', 'INVOICE', 'OTHER'];

// ── Email Imports ──────────────────────────────────────────────────────
export const IMPORT_STATUSES = ['PENDING', 'PROCESSING', 'EXTRACTED', 'DRAFT_CREATED', 'APPROVED', 'REJECTED', 'FAILED', 'SKIPPED'];

// ── Accessorials ───────────────────────────────────────────────────────
export const ACCESSORIAL_UNITS = ['FLAT', 'PER_HOUR', 'PER_DAY', 'PER_MILE', 'PERCENTAGE'];

// ── Invoices ───────────────────────────────────────────────────────────
export const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID'];
export const INVOICE_LINE_TYPES = ['LOAD_CHARGE', 'FUEL_SURCHARGE', 'ACCESSORIAL', 'ADJUSTMENT'];

// ── Settlements ────────────────────────────────────────────────────────
export const SETTLEMENT_STATUSES = ['DRAFT', 'APPROVED', 'PAID'];
export const SETTLEMENT_LINE_TYPES = ['LOAD_PAY', 'BONUS', 'FUEL_ADVANCE', 'DEDUCTION'];

// ── Display labels ─────────────────────────────────────────────────────
export const PAY_MODEL_LABELS = { CPM: 'Per Mile', PERCENTAGE: '% of Load', FLAT: 'Flat Rate' };
export const INSURANCE_TYPE_LABELS = { AUTO_LIABILITY: 'Auto Liability', CARGO: 'Cargo', GENERAL: 'General Liability' };

// ── US States ──────────────────────────────────────────────────────────
export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

// ── Status color maps (Tailwind badge classes) ─────────────────────────
export const LOAD_STATUS_COLORS = {
  OPEN: 'bg-blue-100 text-blue-700',
  SCHEDULED: 'bg-indigo-100 text-indigo-700',
  IN_PICKUP_YARD: 'bg-purple-100 text-purple-700',
  IN_TRANSIT: 'bg-sky-100 text-sky-700',
  COMPLETED: 'bg-green-100 text-green-700',
  TONU: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
  INVOICED: 'bg-emerald-100 text-emerald-700',
  BROKERED: 'bg-amber-100 text-amber-700',
};

export const DRIVER_STATUS_COLORS = {
  AVAILABLE: 'bg-green-100 text-green-700',
  EN_ROUTE: 'bg-blue-100 text-blue-700',
  OUT_OF_SERVICE: 'bg-red-100 text-red-700',
  INACTIVE: 'bg-slate-200 text-slate-500',
};

export const VEHICLE_STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-700',
  IN_SHOP: 'bg-amber-100 text-amber-700',
  OUT_OF_SERVICE: 'bg-red-100 text-red-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
};

export const CARRIER_STATUS_COLORS = {
  PROSPECT: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-amber-100 text-amber-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
};

export const INVOICE_STATUS_COLORS = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SENT: 'bg-blue-100 text-blue-700',
  OVERDUE: 'bg-red-100 text-red-700',
  PAID: 'bg-green-100 text-green-700',
  VOID: 'bg-slate-200 text-slate-400',
};

export const SETTLEMENT_STATUS_COLORS = {
  DRAFT: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
};

export const STOP_STATUS_COLORS = {
  PENDING: 'bg-slate-100 text-slate-600',
  EN_ROUTE: 'bg-blue-100 text-blue-700',
  AT_FACILITY: 'bg-purple-100 text-purple-700',
  LOADING: 'bg-amber-100 text-amber-700',
  UNLOADING: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

export const STOP_ACTION_TYPE_LABELS = {
  LIVE_LOAD: 'Live Load',
  LIVE_UNLOAD: 'Live Unload',
  DROP_TRAILER: 'Drop Trailer',
  HOOK_TRAILER: 'Hook Trailer',
};

export const STOP_ACTION_TYPE_COLORS = {
  LIVE_LOAD: 'bg-blue-100 text-blue-700',
  LIVE_UNLOAD: 'bg-green-100 text-green-700',
  DROP_TRAILER: 'bg-amber-100 text-amber-700',
  HOOK_TRAILER: 'bg-purple-100 text-purple-700',
};

export const REEFER_MODE_LABELS = {
  CONTINUOUS: 'Continuous',
  CYCLE_SENTRY: 'Cycle Sentry',
  OFF: 'Off',
};

export const APPOINTMENT_TYPE_LABELS = { FCFS: 'FCFS', APPOINTMENT: 'Appointment' };
export const STOP_REEFER_MODE_LABELS = { CONTINUOUS: 'Continuous', CYCLE: 'Cycle', SPECIAL_SETTING: 'Special Setting' };
export const QUANTITY_TYPE_LABELS = {
  PALLETS: 'Pallets', BOXES: 'Boxes', BUSHELS: 'Bushels', CASES: 'Cases', CRATES: 'Crates',
  GALLONS: 'Gallons', PIECES: 'Pieces', TRAILER: 'Trailer', ROLLS: 'Rolls', DRUMS: 'Drums',
  BAG: 'Bag', BARREL: 'Barrel', CARTON: 'Carton', PACKAGE: 'Package', SKID: 'Skid', TANK: 'Tank',
  HAZMAT: 'Hazmat', POUND: 'Pound', LINEAR_FEET: 'Linear Feet', BULK: 'Bulk', MIXED: 'Mixed',
  TON: 'Ton', HOURS: 'Hours', DAYS: 'Days', FEET: 'Feet', METERS: 'Meters', INCHES: 'Inches',
  CENTIMETERS: 'Centimeters', YARDS: 'Yards', TOTES: 'Totes',
};

// ── Load status config (for filters, timeline, etc.) ──────────────────
export const LOAD_STATUS_CONFIG = [
  { key: 'OPEN',           label: 'Open',        dot: '#3b82f6' },
  { key: 'SCHEDULED',      label: 'Scheduled',   dot: '#6366f1' },
  { key: 'IN_PICKUP_YARD', label: 'Pickup Yard', dot: '#a855f7' },
  { key: 'IN_TRANSIT',     label: 'In Transit',  dot: '#0ea5e9' },
  { key: 'COMPLETED',      label: 'Completed',   dot: '#22c55e' },
  { key: 'TONU',           label: 'TONU',        dot: '#ef4444' },
  { key: 'CANCELLED',      label: 'Cancelled',   dot: '#94a3b8' },
  { key: 'INVOICED',       label: 'Invoiced',    dot: '#10b981' },
  { key: 'BROKERED',       label: 'Brokered',    dot: '#f59e0b' },
];

// ── Load status RGB colors (for canvas/timeline rendering) ────────────
export const LOAD_STATUS_RGB = {
  OPEN:           { bg: '#3b82f6', border: '#2563eb', text: '#fff' },
  SCHEDULED:      { bg: '#6366f1', border: '#4f46e5', text: '#fff' },
  IN_PICKUP_YARD: { bg: '#a855f7', border: '#9333ea', text: '#fff' },
  IN_TRANSIT:     { bg: '#0ea5e9', border: '#0284c7', text: '#fff' },
  COMPLETED:      { bg: '#22c55e', border: '#16a34a', text: '#fff' },
  TONU:           { bg: '#ef4444', border: '#dc2626', text: '#fff' },
  CANCELLED:      { bg: '#94a3b8', border: '#64748b', text: '#fff' },
  INVOICED:       { bg: '#10b981', border: '#059669', text: '#fff' },
  BROKERED:       { bg: '#f59e0b', border: '#d97706', text: '#fff' },
};

// ── Invoice line type colors ──────────────────────────────────────────
export const INVOICE_LINE_TYPE_COLORS = {
  LOAD_CHARGE: 'bg-blue-50 text-blue-700',
  FUEL_SURCHARGE: 'bg-orange-50 text-orange-700',
  ACCESSORIAL: 'bg-purple-50 text-purple-700',
  ADJUSTMENT: 'bg-slate-100 text-slate-600',
};
