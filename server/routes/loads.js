import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateStatusChange, getAvailableTransitions } from '../lib/stateMachine.js';
import { checkDriverConflicts } from '../lib/conflictDetection.js';
import { calculateLoadTotal } from '../lib/rateCalculator.js';

export default function loadsRouter(db) {
  const router = Router();

  // Helper: auto-save stop locations to the locations master table
  async function autoSaveLocations(stops) {
    for (const stop of stops) {
      if (!stop.facility_name || !stop.city || !stop.state) continue;
      const existing = await db('locations')
        .where({ facility_name: stop.facility_name, city: stop.city, state: stop.state })
        .first();
      if (!existing) {
        await db('locations').insert({
          facility_name: stop.facility_name,
          address: stop.address || null,
          city: stop.city,
          state: stop.state,
          zip: stop.zip || null,
        }).catch(() => {}); // Silently ignore duplicates
      }
    }
  }

  // Helper: enrich a load row with stops + names + accessorials
  async function enrichLoad(load) {
    const stops = await db('stops').where({ load_id: load.id }).orderBy('sequence_order');
    const customer = await db('customers').where({ id: load.customer_id }).first();
    const driver = load.driver_id ? await db('drivers').where({ id: load.driver_id }).first() : null;
    const driver2 = load.driver2_id ? await db('drivers').where({ id: load.driver2_id }).first() : null;
    const carrier = load.carrier_id ? await db('carriers').where({ id: load.carrier_id }).first() : null;
    const bookingAuthority = load.booking_authority_id ? await db('carriers').where({ id: load.booking_authority_id }).first() : null;
    const salesAgent = load.sales_agent_id ? await db('users').where({ id: load.sales_agent_id }).first() : null;
    const truck = load.truck_id ? await db('vehicles').where({ id: load.truck_id }).first() : null;
    const trailer = load.trailer_id ? await db('vehicles').where({ id: load.trailer_id }).first() : null;

    // Fetch accessorials
    const accessorials = await db('load_accessorials')
      .join('accessorial_types', 'load_accessorials.accessorial_type_id', 'accessorial_types.id')
      .where({ 'load_accessorials.load_id': load.id })
      .select('load_accessorials.*', 'accessorial_types.code', 'accessorial_types.name as type_name', 'accessorial_types.unit');

    const accessorialsSum = accessorials.reduce((sum, a) => sum + parseFloat(a.total), 0);
    const totalAmount = load.total_amount || calculateLoadTotal(
      parseFloat(load.rate_amount),
      parseFloat(load.fuel_surcharge_amount || 0),
      accessorialsSum
    );

    const firstStop = stops[0];
    const lastStop = stops[stops.length - 1];

    // Notes summary (count + latest note for card preview)
    const notesAgg = await db('load_notes')
      .where({ load_id: load.id })
      .count('id as count')
      .first();
    const notes_count = parseInt(notesAgg?.count || 0);
    const latest_note = notes_count > 0
      ? await db('load_notes')
          .join('users', 'load_notes.user_id', 'users.id')
          .where({ 'load_notes.load_id': load.id })
          .orderBy('load_notes.created_at', 'desc')
          .select('load_notes.note', 'users.full_name as user_name', 'load_notes.created_at')
          .first()
      : null;

    // Split load references
    let parent_load = null;
    let child_loads = [];
    if (load.parent_load_id) {
      const parentRow = await db('loads').where({ id: load.parent_load_id }).first();
      if (parentRow) parent_load = { id: parentRow.id, reference_number: parentRow.reference_number };
    }
    // Check for children (this load is a parent if others reference it)
    const children = await db('loads').where({ parent_load_id: load.id }).select('id', 'reference_number', 'status', 'loaded_miles', 'driver_id');
    if (children.length > 0) {
      child_loads = await Promise.all(children.map(async (child) => {
        const childDriver = child.driver_id ? await db('drivers').where({ id: child.driver_id }).first() : null;
        return { ...child, driver_name: childDriver?.full_name || null };
      }));
    }

    return {
      ...load,
      stops,
      accessorials,
      total_amount: totalAmount,
      customer_name: customer?.company_name,
      driver_name: driver?.full_name,
      driver2_name: driver2?.full_name || null,
      carrier_name: carrier?.company_name,
      booking_authority_name: bookingAuthority?.company_name || null,
      sales_agent_name: salesAgent?.full_name || null,
      truck_unit: truck?.unit_number || null,
      truck_info: truck ? `${truck.year || ''} ${truck.make || ''} ${truck.model || ''}`.trim() : null,
      trailer_unit: trailer?.unit_number || null,
      trailer_info: trailer ? `${trailer.year || ''} ${trailer.make || ''} ${trailer.model || ''}`.trim() : null,
      pickup_city: firstStop?.city,
      pickup_state: firstStop?.state,
      pickup_date: firstStop?.appointment_start || null,
      delivery_city: lastStop?.city,
      delivery_state: lastStop?.state,
      delivery_date: lastStop?.appointment_end || lastStop?.appointment_start || null,
      available_transitions: getAvailableTransitions(load.status),
      parent_load,
      child_loads,
      notes_count,
      latest_note,
    };
  }

  // GET /api/loads
  router.get('/', asyncHandler(async (req, res) => {
    const { status, driver_id, customer_id } = req.query;
    let query = db('loads');

    if (status) query = query.where({ status });
    if (driver_id) query = query.where({ driver_id });
    if (customer_id) query = query.where({ customer_id });

    const loads = await query.orderBy('id', 'desc');
    const enriched = await Promise.all(loads.map(enrichLoad));
    res.json(enriched);
  }));

  // GET /api/loads/:id
  router.get('/:id', asyncHandler(async (req, res) => {
    const load = await db('loads').where({ id: req.params.id }).first();
    if (!load) return res.status(404).json({ error: 'Load not found' });

    const enriched = await enrichLoad(load);
    res.json(enriched);
  }));

  // POST /api/loads
  router.post('/', asyncHandler(async (req, res) => {
    const {
      reference_number,
      customer_id,
      rate_amount,
      rate_type = 'FLAT',
      loaded_miles,
      empty_miles = 0,
      commodity,
      weight,
      equipment_type,
      stops,
      status = 'OPEN',
      email_import_id,
      confidence_score,
      special_instructions,
      fuel_surcharge_amount = 0,
      // New domain fields
      parent_load_id,
      is_reefer = false,
      reefer_mode,
      set_temp,
      reefer_fuel_pct,
      bol_number,
      po_number,
      pro_number,
      pickup_number,
      delivery_number,
      is_ltl = false,
      // New load metadata
      booking_authority_id,
      sales_agent_id,
      customer_ref_number,
    } = req.body;

    if (!customer_id || !rate_amount || !stops || stops.length < 2) {
      return res.status(400).json({
        error: 'Missing required fields: customer_id, rate_amount, and at least 2 stops'
      });
    }

    const totalAmount = calculateLoadTotal(parseFloat(rate_amount), parseFloat(fuel_surcharge_amount), 0);

    const [newLoad] = await db('loads').insert({
      reference_number: reference_number || `LOAD-${Date.now()}`,
      customer_id,
      driver_id: null,
      dispatcher_id: req.user.id,
      status,
      rate_amount,
      rate_type,
      loaded_miles: loaded_miles || 0,
      empty_miles,
      commodity: commodity || '',
      weight: weight || 0,
      equipment_type: equipment_type || 'DRY_VAN',
      email_import_id: email_import_id || null,
      confidence_score: confidence_score || null,
      special_instructions: special_instructions || null,
      fuel_surcharge_amount,
      total_amount: totalAmount,
      parent_load_id: parent_load_id || null,
      is_reefer: !!is_reefer,
      reefer_mode: is_reefer ? (reefer_mode || null) : null,
      set_temp: is_reefer ? (set_temp || null) : null,
      reefer_fuel_pct: is_reefer ? (reefer_fuel_pct || null) : null,
      bol_number: bol_number || null,
      po_number: po_number || null,
      pro_number: pro_number || null,
      pickup_number: pickup_number || null,
      delivery_number: delivery_number || null,
      is_ltl: !!is_ltl,
      booking_authority_id: booking_authority_id || null,
      sales_agent_id: sales_agent_id || null,
      customer_ref_number: customer_ref_number || null,
    }).returning('*');

    // Insert stops
    const stopRows = stops.map((stop, index) => ({
      id: `s${Date.now()}-${index}`,
      load_id: newLoad.id,
      sequence_order: index + 1,
      stop_type: stop.stop_type,
      facility_name: stop.facility_name || '',
      address: stop.address || '',
      city: stop.city || '',
      state: stop.state || '',
      zip: stop.zip || '',
      appointment_start: stop.appointment_start || null,
      appointment_end: stop.appointment_end || null,
      action_type: stop.action_type || null,
      free_time_minutes: stop.free_time_minutes ?? 120,
      appointment_type: stop.appointment_type || 'APPOINTMENT',
      quantity: stop.quantity || null,
      quantity_type: stop.quantity_type || null,
      commodity: stop.commodity || null,
      weight: stop.weight || null,
      stop_reefer_mode: stop.stop_reefer_mode || null,
      stop_set_temp: stop.stop_set_temp || null,
      bol_number: stop.bol_number || null,
      po_number: stop.po_number || null,
      ref_number: stop.ref_number || null,
      instructions: stop.instructions || null,
    }));

    await db('stops').insert(stopRows);
    await autoSaveLocations(stops);

    const enriched = await enrichLoad(newLoad);
    res.status(201).json(enriched);
  }));

  // PATCH /api/loads/:id/assign
  router.patch('/:id/assign', asyncHandler(async (req, res) => {
    const load = await db('loads').where({ id: req.params.id }).first();
    if (!load) return res.status(404).json({ error: 'Load not found' });

    const { driver_id } = req.body;
    if (!driver_id) return res.status(400).json({ error: 'driver_id is required' });

    const driver = await db('drivers').where({ id: driver_id }).first();
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    if (driver.status === 'OUT_OF_SERVICE') {
      return res.status(400).json({ error: 'Cannot assign driver who is out of service' });
    }

    // Check for conflicts
    const stops = await db('stops').where({ load_id: load.id }).orderBy('sequence_order');
    const pickupDate = stops[0]?.appointment_start;
    const deliveryDate = stops[stops.length - 1]?.appointment_end;

    // Get driver's other loads with stop info for conflict check
    const driverLoads = await db('loads')
      .where({ driver_id })
      .whereIn('status', ['SCHEDULED', 'IN_PICKUP_YARD', 'IN_TRANSIT'])
      .select('loads.*');

    const driverLoadsWithStops = await Promise.all(driverLoads.map(async (dl) => {
      const dlStops = await db('stops').where({ load_id: dl.id }).orderBy('sequence_order');
      return {
        ...dl,
        pickup_start: dlStops[0]?.appointment_start,
        delivery_end: dlStops[dlStops.length - 1]?.appointment_end,
        pickup_city: dlStops[0]?.city,
        delivery_city: dlStops[dlStops.length - 1]?.city,
      };
    }));

    const availability = checkDriverConflicts(driverLoadsWithStops, pickupDate, deliveryDate);

    if (!availability.available) {
      return res.status(409).json({
        error: 'Driver has conflicting loads',
        conflicts: availability.conflicts
      });
    }

    // Assign driver
    const updates = {
      driver_id,
      assigned_at: new Date().toISOString(),
    };

    // Auto-transition to SCHEDULED if currently OPEN
    if (load.status === 'OPEN') {
      updates.status = 'SCHEDULED';
    }

    await db('loads').where({ id: load.id }).update(updates);
    await db('drivers').where({ id: driver_id }).update({ status: 'EN_ROUTE' });

    const updatedLoad = await db('loads').where({ id: load.id }).first();
    const enriched = await enrichLoad(updatedLoad);
    res.json(enriched);
  }));

  // PATCH /api/loads/:id/status
  router.patch('/:id/status', asyncHandler(async (req, res) => {
    const load = await db('loads').where({ id: req.params.id }).first();
    if (!load) return res.status(404).json({ error: 'Load not found' });

    const { status, carrier_id, carrier_rate } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });

    const validation = validateStatusChange(load, status);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    const updates = { status };
    const oldStatus = load.status;

    // BROKERED requires carrier assignment
    if (status === 'BROKERED') {
      if (!carrier_id) {
        return res.status(400).json({ error: 'Must select a carrier to broker this load' });
      }
      const carrier = await db('carriers').where({ id: carrier_id }).first();
      if (!carrier) return res.status(400).json({ error: 'Carrier not found' });
      if (carrier.status !== 'ACTIVE') {
        return res.status(400).json({ error: 'Carrier must be ACTIVE to accept brokered loads' });
      }
      updates.carrier_id = carrier_id;
      if (carrier_rate) updates.carrier_rate = carrier_rate;
    }

    if (status === 'IN_PICKUP_YARD' && !load.picked_up_at) {
      updates.picked_up_at = new Date().toISOString();
    }

    if (status === 'COMPLETED' && !load.delivered_at) {
      updates.delivered_at = new Date().toISOString();
      if (load.driver_id) {
        await db('drivers').where({ id: load.driver_id }).update({ status: 'AVAILABLE' });
      }
    }

    if (status === 'TONU') {
      if (load.driver_id) {
        await db('drivers').where({ id: load.driver_id }).update({ status: 'AVAILABLE' });
      }
    }

    await db('loads').where({ id: load.id }).update(updates);

    console.log(`Load #${load.id} status changed: ${oldStatus} -> ${status}`);

    const updatedLoad = await db('loads').where({ id: load.id }).first();
    const enriched = await enrichLoad(updatedLoad);
    res.json(enriched);
  }));

  // PATCH /api/loads/:id
  router.patch('/:id', asyncHandler(async (req, res) => {
    const load = await db('loads').where({ id: req.params.id }).first();
    if (!load) return res.status(404).json({ error: 'Load not found' });

    const allowedUpdates = [
      'reference_number', 'customer_id', 'rate_amount', 'loaded_miles',
      'empty_miles', 'commodity', 'weight', 'equipment_type', 'special_instructions',
      'carrier_id', 'carrier_rate', 'truck_id', 'trailer_id',
      'is_reefer', 'reefer_mode', 'set_temp', 'reefer_fuel_pct',
      'bol_number', 'po_number', 'pro_number', 'pickup_number', 'delivery_number',
      'is_ltl', 'exclude_from_settlement', 'driver2_id',
      'booking_authority_id', 'sales_agent_id', 'customer_ref_number',
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle stops update
    if (req.body.stops) {
      await db('stops').where({ load_id: load.id }).del();
      const stopRows = req.body.stops.map((stop, index) => ({
        id: stop.id || `s${Date.now()}-${index}`,
        load_id: load.id,
        sequence_order: index + 1,
        stop_type: stop.stop_type,
        facility_name: stop.facility_name || '',
        address: stop.address || '',
        city: stop.city || '',
        state: stop.state || '',
        zip: stop.zip || '',
        appointment_start: stop.appointment_start || null,
        appointment_end: stop.appointment_end || null,
        arrived_at: stop.arrived_at || null,
        departed_at: stop.departed_at || null,
        action_type: stop.action_type || null,
        arrival_time: stop.arrival_time || null,
        departure_time: stop.departure_time || null,
        free_time_minutes: stop.free_time_minutes ?? 120,
        trailer_id: stop.trailer_id || null,
        trailer_dropped: !!stop.trailer_dropped,
        stop_status: stop.stop_status || null,
        appointment_type: stop.appointment_type || 'APPOINTMENT',
        quantity: stop.quantity || null,
        quantity_type: stop.quantity_type || null,
        commodity: stop.commodity || null,
        weight: stop.weight || null,
        stop_reefer_mode: stop.stop_reefer_mode || null,
        stop_set_temp: stop.stop_set_temp || null,
        bol_number: stop.bol_number || null,
        po_number: stop.po_number || null,
        ref_number: stop.ref_number || null,
        instructions: stop.instructions || null,
      }));
      await db('stops').insert(stopRows);
      await autoSaveLocations(req.body.stops);
    }

    if (Object.keys(updates).length > 0) {
      await db('loads').where({ id: load.id }).update(updates);
    }

    const updatedLoad = await db('loads').where({ id: load.id }).first();
    const enriched = await enrichLoad(updatedLoad);
    res.json(enriched);
  }));

  // POST /api/loads/:id/split — create a child split load
  router.post('/:id/split', asyncHandler(async (req, res) => {
    const parent = await db('loads').where({ id: req.params.id }).first();
    if (!parent) return res.status(404).json({ error: 'Load not found' });

    if (parent.parent_load_id) {
      return res.status(400).json({ error: 'Cannot split a child load. Only parent/standalone loads can be split.' });
    }

    const [child] = await db('loads').insert({
      reference_number: `${parent.reference_number}-S${Date.now().toString(36).slice(-4).toUpperCase()}`,
      customer_id: parent.customer_id,
      parent_load_id: parent.id,
      dispatcher_id: req.user.id,
      status: 'OPEN',
      rate_amount: 0,
      rate_type: parent.rate_type,
      loaded_miles: 0,
      empty_miles: 0,
      commodity: parent.commodity,
      weight: 0,
      equipment_type: parent.equipment_type,
      is_reefer: parent.is_reefer,
      reefer_mode: parent.reefer_mode,
      fuel_surcharge_amount: 0,
      total_amount: 0,
    }).returning('*');

    // Create 2 empty stops for the child
    await db('stops').insert([
      { id: `s${Date.now()}-0`, load_id: child.id, sequence_order: 1, stop_type: 'PICKUP', facility_name: '', address: '', city: '', state: '', zip: '' },
      { id: `s${Date.now()}-1`, load_id: child.id, sequence_order: 2, stop_type: 'DELIVERY', facility_name: '', address: '', city: '', state: '', zip: '' },
    ]);

    const enriched = await enrichLoad(child);
    res.status(201).json(enriched);
  }));

  // ── Load Notes CRUD ────────────────────────────────────────────────────

  // GET /api/loads/:id/notes
  router.get('/:id/notes', asyncHandler(async (req, res) => {
    const load = await db('loads').where({ id: req.params.id }).first();
    if (!load) return res.status(404).json({ error: 'Load not found' });

    const notes = await db('load_notes')
      .join('users', 'load_notes.user_id', 'users.id')
      .where({ 'load_notes.load_id': load.id })
      .select('load_notes.*', 'users.full_name as user_name')
      .orderBy('load_notes.created_at', 'desc');

    res.json(notes);
  }));

  // POST /api/loads/:id/notes
  router.post('/:id/notes', asyncHandler(async (req, res) => {
    const load = await db('loads').where({ id: req.params.id }).first();
    if (!load) return res.status(404).json({ error: 'Load not found' });

    const { note } = req.body;
    if (!note?.trim()) return res.status(400).json({ error: 'note is required' });

    const [created] = await db('load_notes').insert({
      load_id: load.id,
      user_id: req.user.id,
      note: note.trim(),
    }).returning('*');

    const user = await db('users').where({ id: req.user.id }).first();
    res.status(201).json({ ...created, user_name: user?.full_name });
  }));

  // PATCH /api/loads/:id/notes/:noteId
  router.patch('/:id/notes/:noteId', asyncHandler(async (req, res) => {
    const existing = await db('load_notes').where({ id: req.params.noteId, load_id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Note not found' });
    if (existing.user_id !== req.user.id) return res.status(403).json({ error: 'Can only edit your own notes' });

    const { note } = req.body;
    if (!note?.trim()) return res.status(400).json({ error: 'note is required' });

    await db('load_notes').where({ id: existing.id }).update({ note: note.trim() });
    const updated = await db('load_notes')
      .join('users', 'load_notes.user_id', 'users.id')
      .where({ 'load_notes.id': existing.id })
      .select('load_notes.*', 'users.full_name as user_name')
      .first();
    res.json(updated);
  }));

  // DELETE /api/loads/:id/notes/:noteId
  router.delete('/:id/notes/:noteId', asyncHandler(async (req, res) => {
    const existing = await db('load_notes').where({ id: req.params.noteId, load_id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Note not found' });
    if (existing.user_id !== req.user.id) return res.status(403).json({ error: 'Can only delete your own notes' });

    await db('load_notes').where({ id: existing.id }).del();
    res.json({ message: 'Note deleted' });
  }));

  // DELETE /api/loads/:id
  router.delete('/:id', asyncHandler(async (req, res) => {
    const load = await db('loads').where({ id: req.params.id }).first();
    if (!load) return res.status(404).json({ error: 'Load not found' });

    if (!['OPEN', 'CANCELLED'].includes(load.status)) {
      return res.status(400).json({ error: `Cannot delete a load with status ${load.status}. Only OPEN or CANCELLED loads can be deleted.` });
    }

    if (load.invoice_id) {
      return res.status(400).json({ error: 'Cannot delete a load that is linked to an invoice' });
    }

    if (load.settlement_id) {
      return res.status(400).json({ error: 'Cannot delete a load that is linked to a settlement' });
    }

    // Cascade-delete related records
    const docs = await db('documents').where({ load_id: load.id });
    for (const doc of docs) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', doc.storage_path);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {}
    }
    await db('documents').where({ load_id: load.id }).del();
    await db('load_accessorials').where({ load_id: load.id }).del();
    await db('stops').where({ load_id: load.id }).del();
    await db('loads').where({ id: load.id }).del();

    console.log(`Load #${load.id} (${load.reference_number}) deleted`);
    res.json({ message: 'Load deleted' });
  }));

  return router;
}
