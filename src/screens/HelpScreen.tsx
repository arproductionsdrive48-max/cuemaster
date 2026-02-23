import { useState } from 'react';
import { ArrowLeft, HelpCircle, Mail, MessageSquare, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HelpScreenProps {
  onBack: () => void;
}

const faqs = [
  {
    question: 'How do I book a table?',
    answer: 'Navigate to the Bookings tab and tap the + button. Select your preferred date, time, and table. You can also book directly from the Tables tab by tapping on an available table.',
  },
  {
    question: 'How does the credit system work?',
    answer: 'Members can accumulate credit for table charges and food orders. Credit balances are displayed in your member profile. You can settle credits at the counter or request a reminder to be sent to you.',
  },
  {
    question: 'How do I become a Gold member?',
    answer: 'Membership upgrades are based on your playing frequency and loyalty. Contact our staff to inquire about upgrading your membership tier for exclusive benefits.',
  },
  {
    question: 'Can I cancel a booking?',
    answer: 'Yes, you can cancel bookings up to 2 hours before the scheduled time. Go to Bookings, find your reservation, and tap to view details where you\'ll find the cancel option.',
  },
  {
    question: 'How is the table rate calculated?',
    answer: 'Table charges are calculated at ₹200 per hour. The timer starts when you begin your session and stops when you end it. Paused time is not charged.',
  },
  {
    question: 'Is my payment information secure?',
    answer: 'Yes, we use industry-standard encryption for all transactions. We do not store your complete payment details on our servers.',
  },
  {
    question: 'How do I report an issue with a table?',
    answer: 'Please inform our staff immediately if you notice any issues with equipment. You can also use the feedback form below to report non-urgent concerns.',
  },
];

const HelpScreen = ({ onBack }: HelpScreenProps) => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const handleSendFeedback = () => {
    if (feedbackText.trim()) {
      toast.success('Feedback sent successfully!');
      setFeedbackText('');
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="pt-6 pb-4 px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Help & Support</h1>
        </div>
      </header>

      <div className="px-4 space-y-4">
        {/* Contact Info */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Need Help?</h2>
              <p className="text-sm text-muted-foreground">We're here to assist you</p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <a 
              href="mailto:support@snookos.app"
              className="flex-1 btn-glass flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Email Us
            </a>
            <a 
              href="tel:+919876543210"
              className="flex-1 btn-glass flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Call Us
            </a>
          </div>
        </div>

        {/* FAQs */}
        <div className="glass-card p-4">
          <h3 className="font-semibold mb-4">Frequently Asked Questions</h3>
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-secondary/50 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <span className="font-medium text-sm pr-4">{faq.question}</span>
                  {expandedFaq === index ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                <div className={cn(
                  "overflow-hidden transition-all duration-300",
                  expandedFaq === index ? "max-h-48" : "max-h-0"
                )}>
                  <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback Form */}
        <div className="glass-card p-4">
          <h3 className="font-semibold mb-3">Send Feedback</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Have suggestions or found a bug? Let us know!
          </p>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Type your feedback here..."
            className="w-full h-32 p-3 rounded-xl bg-secondary/50 border border-border/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
          <button
            onClick={handleSendFeedback}
            disabled={!feedbackText.trim()}
            className={cn(
              "w-full mt-3 btn-premium flex items-center justify-center gap-2 py-3",
              !feedbackText.trim() && "opacity-50 cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
            Send Feedback
          </button>
        </div>

        {/* App Info */}
        <div className="glass-card p-4 text-center">
          <p className="text-sm text-muted-foreground">Snook OS App</p>
          <p className="text-xs text-muted-foreground mt-1">Version 1.0.0</p>
          <p className="text-xs text-muted-foreground mt-2">
            support@snookos.app
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpScreen;
