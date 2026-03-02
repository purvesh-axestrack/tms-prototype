import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateStatusChange, getAvailableTransitions } from '../lib/stateMachine.js';
import { checkDriverConflicts } from '../lib/conflictDetection.js';
import { calculateLoadTotal } from '../lib/rateCalculator.js';
import { EQUIPMENT_TYPES, RATE_TYPES, STOP_TYPES, EQUIPMENT_ALIASES, STOP_ALIASES, normalizeEnum } from '../lib/constants.js';

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
        }).catch(e => {
          // Ignore unique constraint violations (race condition with concurrent inserts)
          if (e.code !== '23505') console.error('autoSaveLocations error:', e.message);
        });
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

    // Fetch truck's assigned driver names
    let truck_driver_name = null;
    let truck_driver2_name = null;
    if (truck) {
      if (truck.current_driver_id) {
        const td1 = await db('drivers').where({ id: truck.current_driver_id }).first();
        truck_driver_name = td1?.full_name || null;
      }
      if (truck.current_driver2_id) {
        const td2 = await db('drivers').where({ id: truck.current_driver2_id }).first();
        truck_driver2_name = td2?.full_name || null;
      }
    }

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
      truck_driver_name,
      truck_driver2_name,
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

  // Batch enrich for list endpoint — replaces N+1 with 5 queries total
  async function enrichLoadList(loads) {
    if (loads.length === 0) return [];
    const loadIds = loads.map(l => l.id);

    // 1. Batch stops — get first and last per load
    const allStops = await db('stops').whereIn('load_id', loadIds).orderBy(['load_id', 'sequence_order']);
    const stopsByLoad = {};
    for (const s of allStops) {
      if (!stopsByLoad[s.load_id]) stopsByLoad[s.load_id] = [];
      stopsByLoad[s.load_id].push(s);
    }

    // 2. Collect all referenced IDs for batch lookups
    const customerIds = [...new Set(loads.map(l => l.customer_id).filter(Boolean))];
    const driverIds = [...new Set(loads.flatMap(l => [l.driver_id, l.driver2_id]).filter(Boolean))];
    const carrierIds = [...new Set(loads.flatMap(l => [l.carrier_id, l.booking_authority_id]).filter(Boolean))];
    const vehicleIds = [...new Set(loads.flatMap(l => [l.truck_id, l.trailer_id]).filter(Boolean))];
    const userIds = [...new Set(loads.map(l => l.sales_agent_id).filter(Boolean))];

    const [customersArr, driversArr, carriersArr, vehiclesArr, usersArr] = await Promise.all([
      customerIds.length ? db('customers').whereIn('id', customerIds).select('id', 'company_name') : [],
      driverIds.length ? db('drivers').whereIn('id', driverIds).select('id', 'full_name') : [],
      carrierIds.length ? db('carriers').whereIn('id', carrierIds).select('id', 'company_name') : [],
      vehicleIds.length ? db('vehicles').whereIn('id', vehicleIds).select('id', 'unit_number', 'year', 'make', 'model') : [],
      userIds.length ? db('users').whereIn('id', userIds).select('id', 'full_name') : [],
    ]);

    const customersMap = Object.fromEntries(customersArr.map(c => [c.id, c]));
    const driversMap = Object.fromEntries(driversArr.map(d => [d.id, d]));
    const carriersMap = Object.fromEntries(carriersArr.map(c => [c.id, c]));
    const vehiclesMap = Object.fromEntries(vehiclesArr.map(v => [v.id, v]));
    const usersMap = Object.fromEntries(usersArr.map(u => [u.id, u]));

    // 3. Batch accessorial totals
    const accessorialSums = await db('load_accessorials')
      .whereIn('load_id', loadIds)
      .groupBy('load_id')
      .select('load_id')
      .sum('total as accessorials_sum');
    const accMap = Object.fromEntries(accessorialSums.map(a => [a.load_id, parseFloat(a.accessorials_sum || 0)]));

    // 4. Batch notes counts + latest note
    const notesCounts = await db('load_notes')
      .whereIn('load_id', loadIds)
      .groupBy('load_id')
      .select('load_id')
      .count('id as count');
    const notesMap = Object.fromEntries(notesCounts.map(n => [n.load_id, parseInt(n.count)]));

    const loadIdsWithNotes = notesCounts.filter(n => parseInt(n.count) > 0).map(n => n.load_id);
    let latestNotesMap = {};
    if (loadIdsWithNotes.length > 0) {
      const latestNotes = await db.raw(`
        SELECT DISTINCT ON (ln.load_id) ln.load_id, ln.note, u.full_name as user_name, ln.created_at
        FROM load_notes ln JOIN users u ON ln.user_id = u.id
        WHERE ln.load_id = ANY(?)
        ORDER BY ln.load_id, ln.created_at DESC
      `, [loadIdsWithNotes]);
      latestNotesMap = Object.fromEntries(latestNotes.rows.map(n => [n.load_id, { note: n.note, user_name: n.user_name, created_at: n.created_at }]));
    }

    // 5. Assemble
    return loads.map(load => {
      const stops = stopsByLoad[load.id] || [];
      const firstStop = stops[0];
      const lastStop = stops[stops.length - 1];
      const customer = customersMap[load.customer_id];
      const driver = driversMap[load.driver_id];
      const driver2 = driversMap[load.driver2_id];
      const carrier = carriersMap[load.carrier_id];
      const bookingAuth = carriersMap[load.booking_authority_id];
      const salesAgent = usersMap[load.sales_agent_id];
      const truck = vehiclesMap[load.truck_id];
      const trailer = vehiclesMap[load.trailer_id];
      const accSum = accMap[load.id] || 0;
      const totalAmount = load.total_amount || calculateLoadTotal(
        parseFloat(load.rate_amount), parseFloat(load.fuel_surcharge_amount || 0), accSum
      );

      return {
        ...load,
        stops,
        total_amount: totalAmount,
        customer_name: customer?.company_name || null,
        driver_name: driver?.full_name || null,
        driver2_name: driver2?.full_name || null,
        carrier_name: carrier?.company_name || null,
        booking_authority_name: bookingAuth?.company_name || null,
        sales_agent_name: salesAgent?.full_name || null,
        truck_unit: truck?.unit_number || null,
        truck_info: truck ? `${truck.year || ''} ${truck.make || ''} ${truck.model || ''}`.trim() : null,
        trailer_unit: trailer?.unit_number || null,
        trailer_info: trailer ? `${trailer.year || ''} ${trailer.make || ''} ${trailer.model || ''}`.trim() : null,
        pickup_city: firstStop?.city || null,
        pickup_state: firstStop?.state || null,
        pickup_date: firstStop?.appointment_start || null,
        delivery_city: lastStop?.city || null,
        delivery_state: lastStop?.state || null,
        delivery_date: lastStop?.appointment_end || lastStop?.appointment_start || null,
        available_transitions: getAvailableTransitions(load.status),
        notes_count: notesMap[load.id] || 0,
        latest_note: latestNotesMap[load.id] || null,
      };
    });
  }

  // GET /api/loads
  router.get('/', asyncHandler(async (req, res) => {
    const { status, driver_id, customer_id } = req.query;
    let query = db('loads');

    if (status) query = query.where({ status });
    if (driver_id) query = query.where({ driver_id });
    if (customer_id) query = query.where({ customer_id });

    const loads = await query.orderBy('id', 'desc');
    const enriched = await enrichLoadList(loads);
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

    const newLoad = await db.transaction(async (trx) => {
      const [load] = await trx('loads').insert({
        reference_number: reference_number || `LOAD-${Date.now()}`,
        customer_id,
        driver_id: null,
        dispatcher_id: req.user.id,
        status,
        rate_amount,
        rate_type: normalizeEnum(rate_type, RATE_TYPES, 'FLAT'),
        loaded_miles: loaded_miles || 0,
        empty_miles,
        commodity: commodity || '',
        weight: weight || 0,
        equipment_type: normalizeEnum(equipment_type, EQUIPMENT_TYPES, 'DRY_VAN', EQUIPMENT_ALIASES),
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

      // Link document if this came from a rate con extraction
      if (req.body.document_id) {
        await trx('documents').where({ id: req.body.document_id }).update({ load_id: load.id });
      }

      // Insert stops
      const stopRows = stops.map((stop, index) => ({
        id: `s${Date.now()}-${index}`,
        load_id: load.id,
        sequence_order: index + 1,
        stop_type: normalizeEnum(stop.stop_type, STOP_TYPES, index === 0 ? 'PICKUP' : 'DELIVERY', STOP_ALIASES),
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

      await trx('stops').insert(stopRows);
      return load;
    });

    await autoSaveLocations(stops);

    const enriched = await enrichLoad(newLoad);
    res.status(201).json(enriched);
  }));

  // PATCH /api/loads/:id/assign
  router.patch('/:id/assign', asyncHandler(async (req, res) => {
    const { driver_id, truck_id, trailer_id, driver2_id } = req.body;
    if (!driver_id) return res.status(400).json({ error: 'driver_id is required' });

    // All reads and writes in a single transaction to prevent double-booking
    await db.transaction(async (trx) => {
      const load = await trx('loads').where({ id: req.params.id }).forUpdate().first();
      if (!load) {
        throw Object.assign(new Error('Load not found'), { status: 404 });
      }

      const driver = await trx('drivers').where({ id: driver_id }).first();
      if (!driver) {
        throw Object.assign(new Error('Driver not found'), { status: 404 });
      }

      if (driver.status === 'OUT_OF_SERVICE') {
        throw Object.assign(new Error('Cannot assign driver who is out of service'), { status: 400 });
      }

      // Check for conflicts inside the transaction
      const stops = await trx('stops').where({ load_id: load.id }).orderBy('sequence_order');
      const pickupDate = stops[0]?.appointment_start;
      const deliveryDate = stops[stops.length - 1]?.appointment_end;

      const driverLoads = await trx('loads')
        .where({ driver_id })
        .whereNot({ id: load.id })
        .whereIn('status', ['SCHEDULED', 'IN_PICKUP_YARD', 'IN_TRANSIT'])
        .select('loads.*');

      const driverLoadsWithStops = await Promise.all(driverLoads.map(async (dl) => {
        const dlStops = await trx('stops').where({ load_id: dl.id }).orderBy('sequence_order');
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
        throw Object.assign(
          new Error('Driver has conflicting loads'),
          { status: 409, conflicts: availability.conflicts }
        );
      }

      const updates = {
        driver_id,
        assigned_at: db.fn.now(),
      };

      if (truck_id !== undefined) updates.truck_id = truck_id;
      if (trailer_id !== undefined) updates.trailer_id = trailer_id;
      if (driver2_id !== undefined) updates.driver2_id = driver2_id;

      if (load.status === 'OPEN') {
        updates.status = 'SCHEDULED';
      }

      // Release old driver(s) if reassigning
      if (load.driver_id && load.driver_id !== driver_id) {
        const oldDriverOtherLoads = await trx('loads')
          .where({ driver_id: load.driver_id })
          .whereNot({ id: load.id })
          .whereIn('status', ['SCHEDULED', 'IN_PICKUP_YARD', 'IN_TRANSIT'])
          .first();
        if (!oldDriverOtherLoads) {
          await trx('drivers').where({ id: load.driver_id }).update({ status: 'AVAILABLE' });
        }
      }
      if (load.driver2_id && driver2_id !== undefined && load.driver2_id !== driver2_id) {
        const oldD2OtherLoads = await trx('loads')
          .where({ driver_id: load.driver2_id })
          .orWhere({ driver2_id: load.driver2_id })
          .whereNot({ id: load.id })
          .whereIn('status', ['SCHEDULED', 'IN_PICKUP_YARD', 'IN_TRANSIT'])
          .first();
        if (!oldD2OtherLoads) {
          await trx('drivers').where({ id: load.driver2_id }).update({ status: 'AVAILABLE' });
        }
      }

      await trx('loads').where({ id: load.id }).update(updates);
      await trx('drivers').where({ id: driver_id }).update({ status: 'EN_ROUTE' });

      if (driver2_id) {
        await trx('drivers').where({ id: driver2_id }).update({ status: 'EN_ROUTE' });
      }
    });

    const updatedLoad = await db('loads').where({ id: req.params.id }).first();
    const enriched = await enrichLoad(updatedLoad);
    res.json(enriched);
  }));

  // Helper: release a driver only if they have no other active loads
  async function releaseDriverIfIdle(trx, driverId, excludeLoadId) {
    const otherActiveLoad = await trx('loads')
      .where(function () {
        this.where({ driver_id: driverId }).orWhere({ driver2_id: driverId });
      })
      .whereNot({ id: excludeLoadId })
      .whereIn('status', ['SCHEDULED', 'IN_PICKUP_YARD', 'IN_TRANSIT'])
      .first();
    if (!otherActiveLoad) {
      await trx('drivers').where({ id: driverId }).update({ status: 'AVAILABLE' });
    }
  }

  // Helper: release both drivers on a load (used by COMPLETED, TONU, CANCELLED)
  async function releaseDrivers(trx, load) {
    if (load.driver_id) {
      await releaseDriverIfIdle(trx, load.driver_id, load.id);
    }
    if (load.driver2_id) {
      await releaseDriverIfIdle(trx, load.driver2_id, load.id);
    }
  }

  // PATCH /api/loads/:id/status
  router.patch('/:id/status', asyncHandler(async (req, res) => {
    const { status, carrier_id, carrier_rate } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });

    let oldStatus;

    await db.transaction(async (trx) => {
      const load = await trx('loads').where({ id: req.params.id }).forUpdate().first();
      if (!load) {
        throw Object.assign(new Error('Load not found'), { status: 404 });
      }

      const validation = validateStatusChange(load, status);
      if (!validation.valid) {
        throw Object.assign(new Error(validation.error), { status: 400 });
      }

      const updates = { status };
      oldStatus = load.status;

      // BROKERED requires carrier assignment
      if (status === 'BROKERED') {
        if (!carrier_id) {
          throw Object.assign(new Error('Must select a carrier to broker this load'), { status: 400 });
        }
        const carrier = await trx('carriers').where({ id: carrier_id }).first();
        if (!carrier) {
          throw Object.assign(new Error('Carrier not found'), { status: 400 });
        }
        if (carrier.status === 'INACTIVE' || carrier.status === 'SUSPENDED') {
          throw Object.assign(new Error('Cannot broker to an INACTIVE or SUSPENDED carrier'), { status: 400 });
        }
        updates.carrier_id = carrier_id;
        if (carrier_rate) updates.carrier_rate = carrier_rate;
      }

      // SCHEDULED → OPEN: clear assignment, release drivers
      if (status === 'OPEN' && load.status === 'SCHEDULED') {
        if (load.driver_id) await releaseDriverIfIdle(trx, load.driver_id, load.id);
        if (load.driver2_id) await releaseDriverIfIdle(trx, load.driver2_id, load.id);
        updates.driver_id = null;
        updates.driver2_id = null;
        updates.truck_id = null;
        updates.trailer_id = null;
        updates.assigned_at = null;
      }

      // BROKERED → OPEN: clear carrier
      if (status === 'OPEN' && load.status === 'BROKERED') {
        updates.carrier_id = null;
        updates.carrier_rate = null;
      }

      // BROKERED → SCHEDULED: clear carrier (driver_id validated by state machine)
      if (status === 'SCHEDULED' && load.status === 'BROKERED') {
        updates.carrier_id = null;
        updates.carrier_rate = null;
      }

      // Set picked_up_at for IN_PICKUP_YARD or IN_TRANSIT (skip pickup yard)
      if ((status === 'IN_PICKUP_YARD' || status === 'IN_TRANSIT') && !load.picked_up_at) {
        updates.picked_up_at = db.fn.now();
      }

      // COMPLETED: set delivered_at, release drivers
      if (status === 'COMPLETED' && !load.delivered_at) {
        updates.delivered_at = db.fn.now();
        await releaseDrivers(trx, load);
      }

      // TONU: release drivers
      if (status === 'TONU') {
        await releaseDrivers(trx, load);
      }

      // CANCELLED: release drivers (bug fix — was missing)
      if (status === 'CANCELLED') {
        await releaseDrivers(trx, load);
      }

      // Accept cancellation_reason for CANCELLED/TONU
      if (status === 'CANCELLED' || status === 'TONU') {
        if (req.body.reason) {
          updates.cancellation_reason = req.body.reason;
        }
      }

      await trx('loads').where({ id: load.id }).update(updates);
    });

    console.log(`Load #${req.params.id} status changed: ${oldStatus} -> ${status}`);

    const updatedLoad = await db('loads').where({ id: req.params.id }).first();
    const enriched = await enrichLoad(updatedLoad);
    res.json(enriched);
  }));

  // PATCH /api/loads/:id
  router.patch('/:id', asyncHandler(async (req, res) => {
    const allowedUpdates = [
      'reference_number', 'customer_id', 'rate_amount', 'rate_type', 'loaded_miles',
      'empty_miles', 'commodity', 'weight', 'equipment_type', 'special_instructions',
      'carrier_id', 'carrier_rate', 'truck_id', 'trailer_id',
      'is_reefer', 'reefer_mode', 'set_temp', 'reefer_fuel_pct',
      'bol_number', 'po_number', 'pro_number', 'pickup_number', 'delivery_number',
      'is_ltl', 'exclude_from_settlement',
      'booking_authority_id', 'sales_agent_id', 'customer_ref_number',
      'fuel_surcharge_amount',
    ];
    // driver_id/driver2_id excluded — must use /assign endpoint for conflict detection

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    // Normalize enums on update
    if (updates.equipment_type) updates.equipment_type = normalizeEnum(updates.equipment_type, EQUIPMENT_TYPES, 'DRY_VAN', EQUIPMENT_ALIASES);
    if (updates.rate_type) updates.rate_type = normalizeEnum(updates.rate_type, RATE_TYPES, 'FLAT');

    await db.transaction(async (trx) => {
      const load = await trx('loads').where({ id: req.params.id }).forUpdate().first();
      if (!load) {
        throw Object.assign(new Error('Load not found'), { status: 404 });
      }

      // Field-level guards
      if (updates.customer_id === null && !['OPEN'].includes(load.status)) {
        throw Object.assign(new Error('Cannot remove customer from a non-OPEN load'), { status: 400 });
      }
      if (updates.rate_amount !== undefined && parseFloat(updates.rate_amount) <= 0 && ['COMPLETED', 'INVOICED'].includes(load.status)) {
        throw Object.assign(new Error('Cannot zero out rate on a completed/invoiced load'), { status: 400 });
      }

      if (req.body.stops) {
        await trx('stops').where({ load_id: load.id }).del();
        const stopRows = req.body.stops.map((stop, index) => ({
          id: stop.id || `s${Date.now()}-${index}`,
          load_id: load.id,
          sequence_order: index + 1,
          stop_type: normalizeEnum(stop.stop_type, STOP_TYPES, index === 0 ? 'PICKUP' : 'DELIVERY', STOP_ALIASES),
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
        await trx('stops').insert(stopRows);
      }

      if (Object.keys(updates).length > 0) {
        // Recalculate total_amount when rate or FSC changes
        if (updates.rate_amount !== undefined || updates.fuel_surcharge_amount !== undefined) {
          const rateAmt = parseFloat(updates.rate_amount ?? load.rate_amount);
          const fsc = parseFloat(updates.fuel_surcharge_amount ?? load.fuel_surcharge_amount ?? 0);
          const accessorials = await trx('load_accessorials').where({ load_id: load.id });
          const accSum = accessorials.reduce((sum, a) => sum + parseFloat(a.total), 0);
          updates.total_amount = calculateLoadTotal(rateAmt, fsc, accSum);
        }
        await trx('loads').where({ id: load.id }).update(updates);
      }
    });

    if (req.body.stops) await autoSaveLocations(req.body.stops);

    const updatedLoad = await db('loads').where({ id: req.params.id }).first();
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

    const child = await db.transaction(async (trx) => {
      const [c] = await trx('loads').insert({
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
      await trx('stops').insert([
        { id: `s${Date.now()}-0`, load_id: c.id, sequence_order: 1, stop_type: 'PICKUP', facility_name: '', address: '', city: '', state: '', zip: '' },
        { id: `s${Date.now()}-1`, load_id: c.id, sequence_order: 2, stop_type: 'DELIVERY', facility_name: '', address: '', city: '', state: '', zip: '' },
      ]);

      return c;
    });

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
    // Collect file paths to delete after DB commit succeeds
    let filePaths = [];

    await db.transaction(async (trx) => {
      const load = await trx('loads').where({ id: req.params.id }).forUpdate().first();
      if (!load) {
        throw Object.assign(new Error('Load not found'), { status: 404 });
      }

      if (!['OPEN', 'CANCELLED'].includes(load.status)) {
        throw Object.assign(new Error(`Cannot delete a load with status ${load.status}. Only OPEN or CANCELLED loads can be deleted.`), { status: 400 });
      }

      if (load.invoice_id) {
        throw Object.assign(new Error('Cannot delete a load that is linked to an invoice'), { status: 400 });
      }

      if (load.settlement_id) {
        throw Object.assign(new Error('Cannot delete a load that is linked to a settlement'), { status: 400 });
      }

      // Collect file paths before deleting DB records
      const docs = await trx('documents').where({ load_id: load.id });
      const path = await import('path');
      filePaths = docs
        .filter(d => d.storage_path)
        .map(d => path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', d.storage_path));

      // Cascade-delete related records
      await trx('documents').where({ load_id: load.id }).del();
      await trx('load_accessorials').where({ load_id: load.id }).del();
      await trx('load_notes').where({ load_id: load.id }).del();
      await trx('stops').where({ load_id: load.id }).del();
      await trx('loads').where({ id: load.id }).del();

      console.log(`Load #${load.id} (${load.reference_number}) deleted`);
    });

    // Delete files AFTER transaction commits — if this fails, DB is still consistent
    const fs = await import('fs');
    for (const fp of filePaths) {
      try {
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      } catch (e) {
        console.error(`Failed to delete file ${fp}:`, e.message);
      }
    }

    res.json({ message: 'Load deleted' });
  }));

  return router;
}
