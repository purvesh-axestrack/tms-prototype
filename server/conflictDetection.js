// Driver conflict detection - prevents double-booking

export function checkDriverAvailability(loads, driverId, pickupDate, deliveryDate) {
  const driverLoads = loads.filter(load =>
    load.driver_id === driverId &&
    ['ASSIGNED', 'DISPATCHED', 'PICKED_UP', 'IN_TRANSIT'].includes(load.status)
  );

  const conflicts = driverLoads.filter(load => {
    // Get the date range for this load
    const loadPickup = new Date(load.stops[0].appointment_start);
    const loadDelivery = new Date(load.stops[load.stops.length - 1].appointment_end);

    const newPickup = new Date(pickupDate);
    const newDelivery = new Date(deliveryDate);

    // Check for date overlap
    // Loads overlap if: newStart < existingEnd AND newEnd > existingStart
    return newPickup < loadDelivery && newDelivery > loadPickup;
  });

  return {
    available: conflicts.length === 0,
    conflicts: conflicts.map(load => ({
      id: load.id,
      reference_number: load.reference_number,
      status: load.status,
      pickup: load.stops[0]?.city,
      delivery: load.stops[load.stops.length - 1]?.city,
      pickup_date: load.stops[0]?.appointment_start,
      delivery_date: load.stops[load.stops.length - 1]?.appointment_end
    }))
  };
}

export function calculateDriverStats(loads, driverId) {
  const driverLoads = loads.filter(load => load.driver_id === driverId);

  const activeLoads = driverLoads.filter(load =>
    ['ASSIGNED', 'DISPATCHED', 'PICKED_UP', 'IN_TRANSIT'].includes(load.status)
  ).length;

  const completedLoads = driverLoads.filter(load =>
    load.status === 'DELIVERED'
  ).length;

  const totalMiles = driverLoads
    .filter(load => load.status === 'DELIVERED')
    .reduce((sum, load) => sum + (load.loaded_miles || 0), 0);

  return {
    active_loads: activeLoads,
    completed_loads: completedLoads,
    total_miles: totalMiles
  };
}
