import { calculateDriverPay } from './rateCalculator.js';

export async function calculateDeductions(db, driverId) {
  const deductions = await db('driver_deductions')
    .join('deduction_types', 'driver_deductions.deduction_type_id', 'deduction_types.id')
    .where({ 'driver_deductions.driver_id': driverId, 'driver_deductions.is_active': true })
    .select('driver_deductions.*', 'deduction_types.name as type_name', 'deduction_types.code');

  return deductions;
}

export async function generateSettlement(db, driverId, periodStart, periodEnd, createdBy) {
  const driver = await db('drivers').where({ id: driverId }).first();
  if (!driver) throw new Error(`Driver ${driverId} not found`);

  return db.transaction(async (trx) => {
    // Lock eligible loads with FOR UPDATE to prevent double-settlement
    const loads = await trx('loads')
      .where({ driver_id: driverId })
      .whereIn('status', ['COMPLETED', 'INVOICED'])
      .whereNull('settlement_id')
      .where('delivered_at', '>=', periodStart)
      .where('delivered_at', '<=', periodEnd + 'T23:59:59Z')
      .where(function () {
        this.where('exclude_from_settlement', false).orWhereNull('exclude_from_settlement');
      })
      .forUpdate();

    if (loads.length === 0) return null;

    // Calculate pay per load
    const lineItems = [];
    let grossPay = 0;
    let totalMiles = 0;

    for (const load of loads) {
      const stops = await trx('stops').where({ load_id: load.id }).orderBy('sequence_order');
      const pickup = stops[0];
      const delivery = stops[stops.length - 1];
      const pay = calculateDriverPay(load, driver);

      lineItems.push({
        load_id: load.id,
        description: `Load #${load.id} - ${load.reference_number} (${pickup?.city}, ${pickup?.state} to ${delivery?.city}, ${delivery?.state})`,
        line_type: 'LOAD_PAY',
        amount: pay,
        miles: load.loaded_miles || 0,
      });

      grossPay += pay;
      totalMiles += (load.loaded_miles || 0);
    }

    // Get active recurring deductions
    const deductions = await calculateDeductions(trx, driverId);
    let totalDeductions = 0;

    for (const ded of deductions) {
      lineItems.push({
        load_id: null,
        description: `${ded.type_name}${ded.notes ? ' - ' + ded.notes : ''}`,
        line_type: 'DEDUCTION',
        amount: -Math.abs(parseFloat(ded.amount)),
        miles: 0,
      });
      totalDeductions += Math.abs(parseFloat(ded.amount));
    }

    const netPay = grossPay - totalDeductions;

    // Generate settlement number
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    const settlementNumber = `SET-${date}-${seq}`;

    // Create settlement
    const [settlement] = await trx('settlements').insert({
      settlement_number: settlementNumber,
      driver_id: driverId,
      period_start: periodStart,
      period_end: periodEnd,
      status: 'DRAFT',
      gross_pay: grossPay,
      total_deductions: totalDeductions,
      net_pay: netPay,
      total_miles: totalMiles,
      total_loads: loads.length,
      created_by: createdBy,
    }).returning('*');

    // Insert line items
    const itemRows = lineItems.map(item => ({
      ...item,
      settlement_id: settlement.id,
    }));
    await trx('settlement_line_items').insert(itemRows);

    // Link loads to settlement
    await trx('loads').whereIn('id', loads.map(l => l.id)).update({ settlement_id: settlement.id });

    return settlement;
  });
}
