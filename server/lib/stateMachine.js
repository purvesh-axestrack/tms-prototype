// Load status state machine with valid transitions

export const VALID_TRANSITIONS = {
  DRAFT: ['CREATED', 'CANCELLED'],
  CREATED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'DELIVERED'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [], // Terminal state
  CANCELLED: []  // Terminal state
};

export function isValidTransition(currentStatus, newStatus) {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  return allowedTransitions && allowedTransitions.includes(newStatus);
}

export function getAvailableTransitions(currentStatus) {
  return VALID_TRANSITIONS[currentStatus] || [];
}

export function validateStatusChange(load, newStatus) {
  // Check if transition is valid
  if (!isValidTransition(load.status, newStatus)) {
    return {
      valid: false,
      error: `Cannot transition from ${load.status} to ${newStatus}`
    };
  }

  // Business rules validation
  if (newStatus === 'DISPATCHED' && !load.driver_id) {
    return {
      valid: false,
      error: 'Cannot dispatch load without assigned driver'
    };
  }

  if (newStatus === 'DELIVERED') {
    if (!load.picked_up_at) {
      return {
        valid: false,
        error: 'Cannot mark as delivered before pickup'
      };
    }
    if (!load.loaded_miles || load.loaded_miles === 0) {
      return {
        valid: false,
        error: 'Must enter loaded miles before marking as delivered'
      };
    }
  }

  return { valid: true };
}
