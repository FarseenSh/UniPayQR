export const validateAmount = (amount: string): boolean => {
  const num = Number(amount);
  return num >= 100 && num <= 100000;
};

export const validateVPA = (vpa: string): boolean => {
  // UPI VPA format: username@bank or phone@upi
  const upiRegex = /^[a-zA-Z0-9._-]{3,}@[a-zA-Z0-9]{2,}$/;
  const phoneRegex = /^[6-9]\d{9}@upi$/;
  
  return upiRegex.test(vpa) || phoneRegex.test(vpa);
};

export const validateLocation = (location: string): boolean => {
  const validLocations = ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai'];
  return validLocations.includes(location);
};

export const validateMUSDAmount = (amount: string): boolean => {
  const num = Number(amount);
  return num > 0 && !isNaN(num);
};

export const parseUPIQR = (qrData: string): { vpa?: string; amount?: string } => {
  try {
    const url = new URL(qrData);
    if (!url.protocol.startsWith('upi')) {
      return {};
    }

    const pa = url.searchParams.get('pa');
    const tr = url.searchParams.get('tr');

    return {
      vpa: pa || undefined,
      amount: tr || undefined,
    };
  } catch {
    return {};
  }
};

export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatAmount = (amount: number, decimals: number = 2): string => {
  return amount.toFixed(decimals);
};

export const calculateMUSDFromINR = (inrAmount: number, rate: number = 83): number => {
  return inrAmount / rate;
};

export const calculateFee = (amount: number, feePercent: number = 1): number => {
  return (amount * feePercent) / 100;
};

export const validatePaymentFlow = (
  amount: string,
  vpa: string,
  location: string,
  balance: number
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!validateAmount(amount)) {
    errors.push('Amount must be between ₹100 and ₹100,000');
  }

  if (!validateVPA(vpa)) {
    errors.push('Invalid UPI ID format');
  }

  if (!validateLocation(location)) {
    errors.push('Location not supported');
  }

  const required = calculateMUSDFromINR(Number(amount));
  if (balance < required) {
    errors.push(`Insufficient balance. Need ${required.toFixed(2)} mUSD`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

