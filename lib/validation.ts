/**
 * Form validation utilities
 */

// Common email domains for typo checking
const COMMON_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'live.com',
  'msn.com',
];

// Map of common typos to correct domains
const DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'iclod.com': 'icloud.com',
};

// Email validation
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }

  // Stricter email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  // Check for common typos
  const domain = email.split('@')[1].toLowerCase();

  if (DOMAIN_TYPOS[domain]) {
    return {
      valid: false,
      error: `Did you mean ${DOMAIN_TYPOS[domain]}?`
    };
  }

  return { valid: true };
};

// Phone validation for Pakistan mobile numbers only
// Accepts: 92XXXXXXXXXX (12 digits) or 0XXXXXXXXXX (11 digits starting with 0)
// Auto-converts 0XXXXXXXXXX to 92XXXXXXXXXX format
export const validatePhone = (phone: string, required: boolean = false): { valid: boolean; error?: string; normalized?: string } => {
  if (!phone) {
    if (required) {
      return { valid: false, error: 'Phone number is required' };
    }
    return { valid: true }; // Phone is optional if not required
  }

  // Remove all spaces, dashes, plus signs, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');

  // Pakistan mobile number patterns:
  // - 92XXXXXXXXXX (12 digits, starts with 92)
  // - 0XXXXXXXXXX (11 digits, starts with 0) - will be converted to 92 format
  const pakistanMobileRegex = /^(92[0-9]{10}|0[0-9]{10})$/;

  if (!pakistanMobileRegex.test(cleaned)) {
    return { valid: false, error: 'Please enter a valid Pakistani mobile number (e.g., 923001234567 or 03001234567)' };
  }

  // Normalize: convert 0XXXXXXXXXX to 92XXXXXXXXXX
  let normalized = cleaned;
  if (cleaned.startsWith('0')) {
    normalized = '92' + cleaned.substring(1);
  }

  return { valid: true, normalized };
};

// NIC (National Identity Card) validation for Pakistan
// Supports both old format (13 digits) and new format (15 digits with dashes)
// Note: NIC verification is now done via image OCR, this is just for format validation if needed
export const validateNIC = (nic: string): { valid: boolean; error?: string } => {
  if (!nic) {
    return { valid: true }; // NIC is optional - verification done via image upload
  }
  // Remove dashes and spaces
  const cleaned = nic.replace(/[\s\-]/g, '');
  // Pakistan NIC format: 
  // Old: 1234512345671 (13 digits)
  // New: 12345-1234567-1 (15 characters with dashes) or 1234512345671 (13 digits)
  const nicRegex = /^[0-9]{5}[-]?[0-9]{7}[-]?[0-9]{1}$/;
  if (!nicRegex.test(cleaned) || (cleaned.length !== 13 && cleaned.length !== 15)) {
    return { valid: false, error: 'Please enter a valid NIC number (format: 12345-1234567-1)' };
  }
  return { valid: true };
};

// Generic required field validation
export const validateRequired = (value: string, fieldName: string): { valid: boolean; error?: string } => {
  if (!value || value.trim() === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
};

// Date validation (must be in the future for ride dates)
export const validateFutureDate = (date: string): { valid: boolean; error?: string } => {
  if (!date) {
    return { valid: false, error: 'Date is required' };
  }
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate < today) {
    return { valid: false, error: 'Date must be today or in the future' };
  }
  return { valid: true };
};

// Time validation
export const validateTime = (time: string): { valid: boolean; error?: string } => {
  if (!time) {
    return { valid: false, error: 'Time is required' };
  }
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    return { valid: false, error: 'Please enter a valid time (HH:MM format)' };
  }
  return { valid: true };
};

// Password validation
export const validatePassword = (password: string, email: string, fullName?: string): { valid: boolean; error?: string } => {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  const lowerPassword = password.toLowerCase();
  const lowerEmail = email.toLowerCase();

  // Check if password matches email exactly
  if (lowerPassword === lowerEmail) {
    return { valid: false, error: 'Password cannot be the same as your email' };
  }

  // Check if password contains the username part of the email
  const emailUsername = lowerEmail.split('@')[0];
  if (emailUsername && lowerPassword.includes(emailUsername)) {
    return { valid: false, error: 'Password cannot contain your email username' };
  }

  // Check if password contains full name
  if (fullName) {
    const lowerName = fullName.toLowerCase();
    if (lowerPassword === lowerName) {
      return { valid: false, error: 'Password cannot be the same as your name' };
    }

    // Check if password contains parts of the name (if name parts are long enough)
    const nameParts = lowerName.split(' ');
    for (const part of nameParts) {
      if (part.length > 3 && lowerPassword.includes(part)) {
        return { valid: false, error: 'Password cannot contain parts of your name' };
      }
    }
  }

  return { valid: true };
};


