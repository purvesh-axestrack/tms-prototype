// Load status state machine with valid transitions

export const VALID_TRANSITIONS = {
  OPEN: ['SCHEDULED', 'BROKERED', 'TONU', 'CANCELLED'],
  SCHEDULED: ['IN_PICKUP_YARD', 'TONU', 'CANCELLED'],
  IN_PICKUP_YARD: ['IN_TRANSIT', 'TONU', 'CANCELLED'],
  IN_TRANSIT: ['COMPLETED'],
  COMPLETED: ['INVOICED'],
  TONU: [],        // Terminal state
  CANCELLED: [],   // Terminal state
  INVOICED: [],    // Terminal state
  BROKERED: ['SCHEDULED', 'CANCELLED'],
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
  if (newStatus === 'SCHEDULED' && !load.driver_id) {
    return {
      valid: false,
      error: 'Cannot schedule load without assigned driver'
    };
  }

  if (newStatus === 'COMPLETED') {
    if (!load.loaded_miles || load.loaded_miles === 0) {
      return {
        valid: false,
        error: 'Must enter loaded miles before marking as completed'
      };
    }
  }

  return { valid: true };
}
