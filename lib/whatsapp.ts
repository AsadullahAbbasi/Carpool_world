/**
 * WhatsApp deep linking utility
 * Opens WhatsApp Web/App with pre-filled phone number
 */

/**
 * Normalize phone number to WhatsApp format (92XXXXXXXXXX)
 * @param phone - Phone number in any format
 * @returns Normalized phone number (92XXXXXXXXXX)
 */
export const normalizePhoneForWhatsApp = (phone: string): string => {
  // Remove all spaces, dashes, plus signs, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  
  // Convert 0XXXXXXXXXX to 92XXXXXXXXXX
  if (cleaned.startsWith('0')) {
    return '92' + cleaned.substring(1);
  }
  
  // If already starts with 92, return as is
  if (cleaned.startsWith('92')) {
    return cleaned;
  }
  
  // If it's already in the right format, return it
  return cleaned;
};

/**
 * Generate WhatsApp deep link URL
 * @param phone - Phone number (will be normalized)
 * @param message - Optional pre-filled message
 * @returns WhatsApp deep link URL
 */
export const getWhatsAppLink = (phone: string, message?: string): string => {
  const normalized = normalizePhoneForWhatsApp(phone);
  const baseUrl = `https://wa.me/${normalized}`;
  
  if (message) {
    const encodedMessage = encodeURIComponent(message);
    return `${baseUrl}?text=${encodedMessage}`;
  }
  
  return baseUrl;
};

/**
 * Open WhatsApp in new tab/window
 * @param phone - Phone number
 * @param message - Optional pre-filled message
 */
export const openWhatsApp = (phone: string, message?: string): void => {
  const url = getWhatsAppLink(phone, message);
  window.open(url, '_blank', 'noopener,noreferrer');
};

