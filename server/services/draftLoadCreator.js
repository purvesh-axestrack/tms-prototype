import { EQUIPMENT_TYPES, RATE_TYPES, STOP_TYPES, EQUIPMENT_ALIASES, STOP_ALIASES, normalizeEnum } from '../lib/constants.js';
import { calculateLoadTotal } from '../lib/rateCalculator.js';

export async function createDraftLoad(db, emailImportId, extractedData, dispatcherId = null) {
  const data = extractedData.data;

  // Fuzzy-match broker name to existing customer
  let customerId = null;
  const brokerName = data.broker_name?.value;

  if (brokerName) {
    const customers = await db('customers').where({ is_active: true });
    const matchedCustomer = fuzzyMatchCustomer(customers, brokerName);
    if (matchedCustomer) {
      customerId = matchedCustomer.id;
    }
  }

  // If no match found by name, try MC number
  if (!customerId && data.broker_mc_number?.value) {
    const mcCustomer = await db('customers')
      .where({ mc_number: data.broker_mc_number.value, is_active: true })
      .first();
    if (mcCustomer) customerId = mcCustomer.id;
  }

  // All writes in a single transaction to prevent orphaned records
  const load = await db.transaction(async (trx) => {
    // Create the load
    // Rate con reference is the customer's ref, not ours — auto-generate internal ref
    const rateAmount = data.rate_amount?.value ?? 0;
    const [newLoad] = await trx('loads').insert({
      reference_number: `RC-${Date.now().toString(36).toUpperCase()}`,
      customer_ref_number: data.reference_number?.value || null,
      customer_id: customerId,
      driver_id: null,
      dispatcher_id: dispatcherId,
      status: 'OPEN',
      email_import_id: emailImportId,
      confidence_score: extractedData.confidence || null,
      rate_amount: rateAmount,
      rate_type: normalizeEnum(data.rate_type?.value, RATE_TYPES, 'FLAT'),
      loaded_miles: data.loaded_miles?.value ?? 0,
      empty_miles: 0,
      commodity: data.commodity?.value || '',
      weight: data.weight?.value ?? 0,
      equipment_type: normalizeEnum(data.equipment_type?.value, EQUIPMENT_TYPES, 'DRY_VAN', EQUIPMENT_ALIASES),
      special_instructions: data.special_instructions?.value || null,
      fuel_surcharge_amount: 0,
      total_amount: calculateLoadTotal(parseFloat(rateAmount), 0, 0),
    }).returning('*');

    // Insert stops
    const stops = data.stops || [];
    if (stops.length > 0) {
      const stopRows = stops.map((stop, index) => ({
        id: `s${Date.now()}-${index}`,
        load_id: newLoad.id,
        sequence_order: index + 1,
        stop_type: normalizeEnum(stop.stop_type, STOP_TYPES, index === 0 ? 'PICKUP' : 'DELIVERY', STOP_ALIASES),
        facility_name: stop.facility_name || '',
        address: stop.address || '',
        city: stop.city || '',
        state: stop.state || '',
        zip: stop.zip || '',
        appointment_start: stop.appointment_start || null,
        appointment_end: stop.appointment_end || null,
      }));
      await trx('stops').insert(stopRows);
    }

    // Link load to email import
    await trx('email_imports').where({ id: emailImportId }).update({
      load_id: newLoad.id,
      processing_status: 'DRAFT_CREATED',
    });

    // Update documents to link to load
    await trx('documents').where({ email_import_id: emailImportId }).update({ load_id: newLoad.id });

    return newLoad;
  });

  return load;
}

function fuzzyMatchCustomer(customers, brokerName) {
  if (!brokerName) return null;

  const normalized = brokerName.toLowerCase().trim();

  // Exact match
  const exact = customers.find(c => c.company_name.toLowerCase() === normalized);
  if (exact) return exact;

  // Contains match
  const contains = customers.find(c =>
    normalized.includes(c.company_name.toLowerCase()) ||
    c.company_name.toLowerCase().includes(normalized)
  );
  if (contains) return contains;

  // Word overlap scoring
  const brokerWords = normalized.split(/\s+/);
  let bestMatch = null;
  let bestScore = 0;

  for (const customer of customers) {
    const custWords = customer.company_name.toLowerCase().split(/\s+/);
    const overlap = brokerWords.filter(w => custWords.some(cw => cw.includes(w) || w.includes(cw))).length;
    const score = overlap / Math.max(brokerWords.length, custWords.length);

    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = customer;
    }
  }

  return bestMatch;
}
