export function calculateFuelSurcharge(rateAmount, fscPercentage) {
  if (!fscPercentage || fscPercentage <= 0) return 0;
  return Math.round(rateAmount * (fscPercentage / 100) * 100) / 100;
}

export function calculateLoadTotal(rateAmount, fuelSurcharge, accessorialsSum) {
  return Math.round(((rateAmount ?? 0) + (fuelSurcharge ?? 0) + (accessorialsSum ?? 0)) * 100) / 100;
}

export function calculateDriverPay(load, driver) {
  if (!driver || !load) return 0;

  let pay = 0;
  const miles = load.loaded_miles ?? 0;
  const totalAmount = load.total_amount ?? load.rate_amount ?? 0;

  switch (driver.pay_model) {
    case 'CPM':
      pay = miles * parseFloat(driver.pay_rate);
      break;
    case 'PERCENTAGE':
      pay = totalAmount * (parseFloat(driver.pay_rate) / 100);
      break;
    case 'FLAT':
      pay = parseFloat(driver.pay_rate);
      break;
    default:
      pay = 0;
  }

  // Apply minimum per mile floor
  if (driver.minimum_per_mile && miles > 0) {
    const minimumPay = miles * parseFloat(driver.minimum_per_mile);
    pay = Math.max(pay, minimumPay);
  }

  return Math.round(pay * 100) / 100;
}
