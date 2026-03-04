// Driver conflict detection - prevents double-booking

export function checkDriverConflicts(driverLoads, pickupDate, deliveryDate) {
  const activeLoads = driverLoads.filter(load =>
    ['SCHEDULED', 'IN_PICKUP_YARD', 'IN_TRANSIT'].includes(load.status)
  );

  const conflicts = activeLoads.filter(load => {
    const loadPickup = new Date(load.pickup_start);
    const loadDelivery = new Date(load.delivery_end);
    const newPickup = new Date(pickupDate);
    const newDelivery = new Date(deliveryDate);

    return newPickup < loadDelivery && newDelivery > loadPickup;
  });

  return {
    available: conflicts.length === 0,
    conflicts: conflicts.map(load => ({
      id: load.id,
      reference_number: load.reference_number,
      status: load.status,
      pickup: load.pickup_city,
      delivery: load.delivery_city,
      pickup_date: load.pickup_start,
      delivery_date: load.delivery_end
    }))
  };
}

// Vehicle conflict detection - warns about truck/trailer double-booking
export function checkVehicleConflicts(vehicleLoads, pickupDate, deliveryDate) {
  const activeLoads = vehicleLoads.filter(load =>
    ['SCHEDULED', 'IN_PICKUP_YARD', 'IN_TRANSIT'].includes(load.status)
  );

  // If no dates on the new load, any active load is a potential conflict
  if (!pickupDate || !deliveryDate) {
    return {
      clear: activeLoads.length === 0,
      conflicts: activeLoads.map(formatConflict),
    };
  }

  const conflicts = activeLoads.filter(load => {
    // If the existing load has no dates, flag it (can't prove no overlap)
    if (!load.pickup_start || !load.delivery_end) return true;
    const loadPickup = new Date(load.pickup_start);
    const loadDelivery = new Date(load.delivery_end);
    const newPickup = new Date(pickupDate);
    const newDelivery = new Date(deliveryDate);
    return newPickup < loadDelivery && newDelivery > loadPickup;
  });

  return {
    clear: conflicts.length === 0,
    conflicts: conflicts.map(formatConflict),
  };
}

function formatConflict(load) {
  return {
    id: load.id,
    reference_number: load.reference_number,
    status: load.status,
    pickup: load.pickup_city,
    delivery: load.delivery_city,
    pickup_date: load.pickup_start,
    delivery_date: load.delivery_end,
  };
}

export function calculateDriverStats(driverLoads) {
  const activeLoads = driverLoads.filter(load =>
    ['SCHEDULED', 'IN_PICKUP_YARD', 'IN_TRANSIT'].includes(load.status)
  ).length;

  const completedLoads = driverLoads.filter(load =>
    ['COMPLETED', 'INVOICED'].includes(load.status)
  ).length;

  const totalMiles = driverLoads
    .filter(load => ['COMPLETED', 'INVOICED'].includes(load.status))
    .reduce((sum, load) => sum + (load.loaded_miles || 0), 0);

  return {
    active_loads: activeLoads,
    completed_loads: completedLoads,
    total_miles: totalMiles
  };
}
