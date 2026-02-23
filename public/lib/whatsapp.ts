import { toast } from 'sonner';

/**
 * Normalize a phone number to international format (no + or dashes).
 * If the number starts with +91 or is a 10-digit Indian number, prepend 91.
 */
const normalizePhone = (phone: string): string => {
  // Remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-()]/g, '');
  // Remove leading +
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  // If 10-digit Indian number, prepend country code
  if (/^\d{10}$/.test(cleaned)) cleaned = '91' + cleaned;
  return cleaned;
};

/**
 * Generate a WhatsApp URL with the member's phone number pre-filled.
 * Format: https://wa.me/{phone}?text={encoded_message}
 * Falls back to https://wa.me/?text= if no phone provided.
 */
export const generateWhatsAppUrl = (
  template: string,
  memberName: string,
  amount: number,
  phone?: string
): string => {
  const message = template
    .replace(/\{name\}/gi, memberName)
    .replace(/\[name\]/gi, memberName)
    .replace(/\{amount\}/gi, amount.toString())
    .replace(/\[amount\]/gi, amount.toString());

  const encodedMessage = encodeURIComponent(message);

  if (phone && phone.trim()) {
    const normalized = normalizePhone(phone.trim());
    return `https://wa.me/${normalized}?text=${encodedMessage}`;
  }

  // No phone — open contact chooser
  return `https://wa.me/?text=${encodedMessage}`;
};

/**
 * Open WhatsApp with a pre-filled reminder message.
 * If member has a phone number, opens a direct chat.
 * If not, shows a toast prompting the admin to add the phone number.
 */
export const sendWhatsAppReminder = (
  template: string,
  memberName: string,
  amount: number,
  phone?: string
): void => {
  if (!phone || !phone.trim()) {
    toast.error('No phone number', {
      description: `Add a phone number to ${memberName}'s profile to send a WhatsApp reminder.`,
      duration: 4000,
    });
    return;
  }

  const url = generateWhatsAppUrl(template, memberName, amount, phone);

  toast.success('Opening WhatsApp...', {
    description: `Sending reminder to ${memberName}`,
    duration: 2000,
  });

  const opened = window.open(url, '_blank');

  // Fallback: if popup was blocked or failed
  if (!opened) {
    const message = template
      .replace(/\{name\}/gi, memberName)
      .replace(/\[name\]/gi, memberName)
      .replace(/\{amount\}/gi, amount.toString())
      .replace(/\[amount\]/gi, amount.toString());

    toast.error('Could not open WhatsApp automatically', {
      description: `Open WhatsApp manually and paste this: ${message}`,
      duration: 10000,
    });
  }
};
