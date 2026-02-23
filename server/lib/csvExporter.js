function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers, rows) {
  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map(row =>
    headers.map(h => escapeCSV(row[h])).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

export function exportInvoiceCSV(invoice, lineItems) {
  const headers = ['Line', 'Type', 'Description', 'Load #', 'Quantity', 'Unit Price', 'Amount'];
  const rows = lineItems.map((item, i) => ({
    'Line': i + 1,
    'Type': item.line_type,
    'Description': item.description,
    'Load #': item.load_id || '',
    'Quantity': item.quantity,
    'Unit Price': parseFloat(item.unit_price).toFixed(2),
    'Amount': parseFloat(item.amount).toFixed(2),
  }));

  // Add summary rows
  rows.push({ 'Line': '', 'Type': '', 'Description': '', 'Load #': '', 'Quantity': '', 'Unit Price': 'Subtotal', 'Amount': parseFloat(invoice.subtotal).toFixed(2) });
  rows.push({ 'Line': '', 'Type': '', 'Description': '', 'Load #': '', 'Quantity': '', 'Unit Price': 'FSC Total', 'Amount': parseFloat(invoice.fuel_surcharge_total).toFixed(2) });
  rows.push({ 'Line': '', 'Type': '', 'Description': '', 'Load #': '', 'Quantity': '', 'Unit Price': 'Accessorial Total', 'Amount': parseFloat(invoice.accessorial_total).toFixed(2) });
  rows.push({ 'Line': '', 'Type': '', 'Description': '', 'Load #': '', 'Quantity': '', 'Unit Price': 'Total', 'Amount': parseFloat(invoice.total_amount).toFixed(2) });
  rows.push({ 'Line': '', 'Type': '', 'Description': '', 'Load #': '', 'Quantity': '', 'Unit Price': 'Amount Paid', 'Amount': parseFloat(invoice.amount_paid).toFixed(2) });
  rows.push({ 'Line': '', 'Type': '', 'Description': '', 'Load #': '', 'Quantity': '', 'Unit Price': 'Balance Due', 'Amount': parseFloat(invoice.balance_due).toFixed(2) });

  return toCSV(headers, rows);
}

export function exportSettlementCSV(settlement, lineItems) {
  const headers = ['Line', 'Type', 'Description', 'Load #', 'Miles', 'Amount'];
  const rows = lineItems.map((item, i) => ({
    'Line': i + 1,
    'Type': item.line_type,
    'Description': item.description,
    'Load #': item.load_id || '',
    'Miles': item.miles || '',
    'Amount': parseFloat(item.amount).toFixed(2),
  }));

  rows.push({ 'Line': '', 'Type': '', 'Description': '', 'Load #': '', 'Miles': 'Gross Pay', 'Amount': parseFloat(settlement.gross_pay).toFixed(2) });
  rows.push({ 'Line': '', 'Type': '', 'Description': '', 'Load #': '', 'Miles': 'Deductions', 'Amount': `-${parseFloat(settlement.total_deductions).toFixed(2)}` });
  rows.push({ 'Line': '', 'Type': '', 'Description': '', 'Load #': '', 'Miles': 'Net Pay', 'Amount': parseFloat(settlement.net_pay).toFixed(2) });

  return toCSV(headers, rows);
}

export function exportAgingCSV(agingData) {
  const headers = ['Customer', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total'];
  const rows = agingData.map(row => ({
    'Customer': row.customer_name,
    'Current': parseFloat(row.current || 0).toFixed(2),
    '1-30 Days': parseFloat(row.days_1_30 || 0).toFixed(2),
    '31-60 Days': parseFloat(row.days_31_60 || 0).toFixed(2),
    '61-90 Days': parseFloat(row.days_61_90 || 0).toFixed(2),
    '90+ Days': parseFloat(row.days_90_plus || 0).toFixed(2),
    'Total': parseFloat(row.total || 0).toFixed(2),
  }));
  return toCSV(headers, rows);
}
