import { toast } from 'sonner';

/**
 * Generate a WhatsApp reminder URL with properly encoded message
 * Uses the clean wa.me/?text= format (no phone number - opens contact chooser)
 * @param template - The message template with [Name] and [Amount] placeholders
 * @param memberName - The full name of the member
 * @param amount - The due amount
 * @returns The WhatsApp URL in format: https://wa.me/?text=encoded-message
 */
export const generateWhatsAppUrl = (
  template: string,
  memberName: string,
  amount: number
): string => {
  // Replace placeholders with actual values
  // Support both {name}/{amount} and [Name]/[Amount] formats (case-insensitive)
  const message = template
    .replace(/\{name\}/gi, memberName)
    .replace(/\[name\]/gi, memberName)
    .replace(/\{amount\}/gi, amount.toString())
    .replace(/\[amount\]/gi, amount.toString());
  
  // URL encode the message properly (handles ₹ symbol, spaces, and other special chars)
  // encodeURIComponent properly encodes:
  // - spaces as %20
  // - ₹ as %E2%82%B9
  // - commas, periods, etc.
  const encodedMessage = encodeURIComponent(message);
  
  // Use the clean wa.me/?text= format (no phone number)
  // This opens WhatsApp with the message pre-filled and shows contact chooser
  return `https://wa.me/?text=${encodedMessage}`;
};

/**
 * Open WhatsApp with a pre-filled reminder message
 * @param template - The message template
 * @param memberName - The full name of the member
 * @param amount - The due amount
 */
export const sendWhatsAppReminder = (
  template: string,
  memberName: string,
  amount: number
): void => {
  const url = generateWhatsAppUrl(template, memberName, amount);
  
  console.log('WhatsApp URL generated:', url);
  
  toast.success('Opening WhatsApp...', {
    description: `Sending reminder to ${memberName}`,
    duration: 2000,
  });
  
  // Open in new tab/window
  window.open(url, '_blank');
};
