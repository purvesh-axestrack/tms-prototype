const INVOICE_TRANSITIONS = {
  DRAFT: ['SENT', 'VOID'],
  SENT: ['PAID', 'OVERDUE', 'VOID'],
  OVERDUE: ['PAID', 'VOID'],
  PAID: [], // terminal
  VOID: [], // terminal
};

export function isValidInvoiceTransition(currentStatus, newStatus) {
  const allowed = INVOICE_TRANSITIONS[currentStatus];
  return allowed && allowed.includes(newStatus);
}

export function getAvailableInvoiceTransitions(currentStatus) {
  return INVOICE_TRANSITIONS[currentStatus] || [];
}
