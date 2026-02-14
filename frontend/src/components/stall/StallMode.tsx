// ==========================================
// Stall Mode - Lead Wizard (Kiosk Experience)
// Multi-step form with large touch targets
// ==========================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  Check,
  QrCode,
  Camera,
  RotateCcw,
  Tag,
  MessageSquareText,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { PageContainer } from '@/components/layout';
import { cn } from '@/lib/utils';
import { stallTagOptions } from '@/data/stallTags';

type WizardStep = 'attract' | 'name' | 'contact' | 'tags' | 'success';

interface LeadFormData {
  name: string;
  email: string;
  phone: string;
  tags: string[];
  remarks: string;
}

export function StallMode() {
  const [step, setStep] = useState<WizardStep>('attract');
  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    email: '',
    phone: '',
    tags: [],
    remarks: '',
  });
  const [countdown, setCountdown] = useState(5);
  const [existingContacts, setExistingContacts] = useState<{ emails: string[]; phones: string[] }>({
    emails: [],
    phones: [],
  });

  // Auto-reset after success
  useEffect(() => {
    if (step === 'success') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleReset();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  const handleReset = useCallback(() => {
    setStep('attract');
    setFormData({
      name: '',
      email: '',
      phone: '',
      tags: [],
      remarks: '',
    });
    setCountdown(5);
  }, []);

  const handleNext = () => {
    const steps: WizardStep[] = ['attract', 'name', 'contact', 'tags', 'success'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: WizardStep[] = ['attract', 'name', 'contact', 'tags', 'success'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleTagsSubmit = () => {
    setExistingContacts((prev) => ({
      emails: [...prev.emails, formData.email.trim().toLowerCase()],
      phones: [...prev.phones, formData.phone.trim()],
    }));
    handleNext();
  };

  const handleToggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-pattern opacity-30" />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-stall/5 via-transparent to-stall/10" />

      {/* Content */}
      <PageContainer className="relative z-10 flex flex-col items-center justify-center min-h-[60vh]">
        <AnimatePresence mode="wait">
          {step === 'attract' && (
            <AttractScreen key="attract" onStart={handleNext} />
          )}
          {step === 'name' && (
            <NameStep
              key="name"
              value={formData.name}
              onChange={(name) => setFormData({ ...formData, name })}
              onNext={handleNext}
              onBack={handleReset}
            />
          )}
          {step === 'contact' && (
            <ContactStep
              key="contact"
              phone={formData.phone}
              email={formData.email}
              onChangePhone={(phone) => setFormData({ ...formData, phone })}
              onChangeEmail={(email) => setFormData({ ...formData, email })}
              onNext={handleNext}
              onBack={handleBack}
              existingEmails={existingContacts.emails}
              existingPhones={existingContacts.phones}
            />
          )}
          {step === 'tags' && (
            <TagsStep
              key="tags"
              tags={formData.tags}
              remarks={formData.remarks}
              onToggleTag={handleToggleTag}
              onChangeRemarks={(remarks) => setFormData({ ...formData, remarks })}
              availableTags={stallTagOptions}
              onSubmit={handleTagsSubmit}
              onBack={handleBack}
            />
          )}
          {step === 'success' && (
            <SuccessScreen
              key="success"
              name={formData.name}
              countdown={countdown}
              onReset={handleReset}
            />
          )}
        </AnimatePresence>
      </PageContainer>

      {/* Progress Indicator */}
      {step !== 'attract' && step !== 'success' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {['name', 'contact', 'tags'].map((s, index) => (
            <motion.div
              key={s}
              className={cn(
                'h-2 rounded-full transition-all',
                s === step ? 'w-8 bg-stall' : 'w-2 bg-white/20'
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Attract Screen - Pulsing animation to draw attention
function AttractScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="text-center max-w-2xl"
    >
      {/* Animated Logo */}
      <motion.div
        className="relative mx-auto mb-8 w-32 h-32"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute inset-0 rounded-3xl bg-stall/30 blur-xl" />
        <div className="relative w-full h-full rounded-3xl gradient-stall flex items-center justify-center shadow-glow-stall">
          <Sparkles className="w-16 h-16 text-white" />
        </div>
      </motion.div>

      {/* Welcome Text */}
      <motion.h1
        className="text-5xl md:text-6xl font-bold text-white mb-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Welcome to{' '}
        <span className="text-stall">Finideas</span>
      </motion.h1>

      <motion.p
        className="text-xl text-white/70 mb-12 max-w-md mx-auto"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Discover smarter investment solutions. Let's connect!
      </motion.p>

      {/* CTA Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.button
          onClick={onStart}
          className={cn(
            'relative group',
            'px-12 py-6 rounded-2xl',
            'bg-stall text-white text-2xl font-bold',
            'shadow-glow-stall hover:shadow-xl',
            'transition-all duration-300'
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          animate={{ 
            boxShadow: [
              '0 0 20px rgba(16, 185, 129, 0.3)',
              '0 0 40px rgba(16, 185, 129, 0.5)',
              '0 0 20px rgba(16, 185, 129, 0.3)',
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="flex items-center gap-3">
            Tap to Get Started
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </span>
        </motion.button>
      </motion.div>

      {/* Alternative Options */}
      <motion.div
        className="mt-10 flex justify-center gap-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-colors">
          <QrCode className="w-5 h-5" />
          Scan QR
        </button>
        <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-colors">
          <Camera className="w-5 h-5" />
          Scan Card
        </button>
      </motion.div>
    </motion.div>
  );
}

// Name Step
function NameStep({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-xl text-center"
    >
      <div className="mb-8">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-stall/20 flex items-center justify-center">
          <User className="w-8 h-8 text-stall" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">What's your name?</h2>
        <p className="text-white/60">Optional, but it helps us greet you better</p>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Full name (optional)"
        autoFocus
        className={cn(
          'w-full h-20 px-8 text-2xl text-center',
          'bg-surface-elevated border-2 border-border rounded-2xl',
          'text-white placeholder:text-muted',
          'focus:outline-none focus:border-stall focus:ring-4 focus:ring-stall/20',
          'transition-all'
        )}
      />

      <div className="flex gap-4 mt-8">
        <Button
          variant="ghost"
          size="xl"
          onClick={onBack}
          className="flex-1"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
        <Button
          variant="stall"
          size="xl"
          onClick={onNext}
          className="flex-1"
        >
          Continue
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}

// Contact Step with Phone Number Pad
function ContactStep({
  phone,
  email,
  onChangePhone,
  onChangeEmail,
  onNext,
  onBack,
  existingEmails,
  existingPhones,
}: {
  phone: string;
  email: string;
  onChangePhone: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
  existingEmails: string[];
  existingPhones: string[];
}) {
  const [activeField, setActiveField] = useState<'phone' | 'email'>('phone');
  const normalizedPhone = phone.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const phoneValid = normalizedPhone.length === 10;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const emailDuplicate = normalizedEmail ? existingEmails.includes(normalizedEmail) : false;
  const phoneDuplicate = normalizedPhone ? existingPhones.includes(normalizedPhone) : false;
  const canContinue = phoneValid && emailValid && !emailDuplicate && !phoneDuplicate;

  const handleNumPadPress = (key: string) => {
    if (activeField === 'phone') {
      if (key === 'delete') {
        onChangePhone(phone.slice(0, -1));
      } else if (phone.length < 10) {
        onChangePhone(phone + key);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-2xl text-center"
    >
      <div className="mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-stall/20 flex items-center justify-center">
          <Phone className="w-8 h-8 text-stall" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">How can we reach you?</h2>
        <p className="text-white/60">Email and phone are mandatory so we can follow up</p>
      </div>

      {/* Phone Input */}
      <div 
        className={cn(
          'relative mb-4 cursor-pointer',
          activeField === 'phone' && 'ring-2 ring-stall rounded-2xl'
        )}
        onClick={() => setActiveField('phone')}
      >
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-xl text-muted">
          +91
        </div>
        <input
          type="text"
          value={phone.replace(/(\d{5})(\d{5})/, '$1 $2')}
          readOnly
          placeholder="00000 00000"
          className={cn(
            'w-full h-16 pl-16 pr-6 text-xl text-center',
            'bg-surface-elevated border-2 border-border rounded-2xl',
            'text-white placeholder:text-muted',
            'cursor-pointer'
          )}
        />
      </div>

      {/* Email Input */}
      <input
        type="email"
        value={email}
        onChange={(e) => onChangeEmail(e.target.value)}
        onFocus={() => setActiveField('email')}
        placeholder="Work email"
        className={cn(
          'w-full h-14 px-6 text-lg text-center mb-6',
          'bg-surface-elevated border-2 border-border rounded-xl',
          'text-white placeholder:text-muted',
          'focus:outline-none focus:border-stall focus:ring-2 focus:ring-stall/20',
          'transition-all'
        )}
      />

      <div className="space-y-1 text-sm">
        {!phoneValid && (
          <p className="text-white/70">Enter a 10-digit mobile number</p>
        )}
        {!emailValid && email.length > 0 && (
          <p className="text-white/70">Enter a valid email address</p>
        )}
        {phoneDuplicate && (
          <p className="text-error">This phone number is already registered at the stall</p>
        )}
        {emailDuplicate && (
          <p className="text-error">This email is already registered at the stall</p>
        )}
      </div>

      {/* Number Pad */}
      {activeField === 'phone' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3 mb-6 max-w-xs mx-auto"
        >
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'].map((key) => (
            <motion.button
              key={key}
              onClick={() => key && handleNumPadPress(key)}
              disabled={!key}
              className={cn(
                'h-16 rounded-xl font-semibold text-2xl',
                'transition-all duration-150',
                key === 'delete'
                  ? 'bg-error/20 text-error hover:bg-error/30'
                  : key
                    ? 'bg-surface-elevated border border-border text-white hover:bg-surface-overlay hover:border-stall/50 active:scale-95'
                    : 'invisible'
              )}
              whileTap={{ scale: 0.95 }}
            >
              {key === 'delete' ? '⌫' : key}
            </motion.button>
          ))}
        </motion.div>
      )}

      <div className="flex gap-4">
        <Button
          variant="ghost"
          size="xl"
          onClick={onBack}
          className="flex-1"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
        <Button
          variant="stall"
          size="xl"
          onClick={onNext}
          disabled={!canContinue}
          className="flex-1"
        >
          Continue
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}

// Tag selection + remarks
function TagsStep({
  tags,
  remarks,
  onToggleTag,
  onChangeRemarks,
  onSubmit,
  onBack,
  availableTags,
}: {
  tags: string[];
  remarks: string;
  onToggleTag: (tag: string) => void;
  onChangeRemarks: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  availableTags: typeof stallTagOptions;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      onSubmit();
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-xl text-center"
    >
      <div className="mb-8">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-stall/20 flex items-center justify-center">
          <Tag className="w-8 h-8 text-stall" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">What best describes your interest?</h2>
        <p className="text-white/60">Tap the tags so we know how to follow up</p>
      </div>

      <div className="mb-8 text-left">
        <div className="flex items-center justify-center gap-2 text-white mb-4">
          <Tag className="w-5 h-5 text-stall" />
          <span className="text-lg font-semibold">Select areas of interest (required)</span>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {availableTags.map((tagOption) => {
            const isActive = tags.includes(tagOption.label);
            return (
              <button
                key={tagOption.id}
                type="button"
                onClick={() => onToggleTag(tagOption.label)}
                className={cn(
                  'tag-pill',
                  `tag-pill--${tagOption.color}`,
                  isActive && 'active'
                )}
              >
                {tagOption.label}
              </button>
            );
          })}
        </div>
        {tags.length === 0 && (
          <p className="text-center text-error text-sm mt-3">Please choose at least one tag.</p>
        )}
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-center gap-2 text-white mb-4">
          <MessageSquareText className="w-5 h-5 text-stall" />
          <span className="text-lg font-semibold">Remarks (optional)</span>
        </div>
        <textarea
          value={remarks}
          onChange={(e) => onChangeRemarks(e.target.value)}
          placeholder="Anything specific we should note?"
          className={cn(
            'w-full h-32 px-6 py-4 text-lg text-center',
            'bg-surface-elevated border-2 border-border rounded-2xl',
            'text-white placeholder:text-muted',
            'focus:outline-none focus:border-stall focus:ring-4 focus:ring-stall/20',
            'transition-all'
          )}
        />
      </div>

      <div className="flex gap-4">
        <Button
          variant="ghost"
          size="xl"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
        <Button
          variant="stall"
          size="xl"
          onClick={handleSubmit}
          disabled={isSubmitting || tags.length === 0}
          isLoading={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Saving...' : 'Complete'}
          {!isSubmitting && <Check className="w-5 h-5 ml-2" />}
        </Button>
      </div>
    </motion.div>
  );
}

// Success Screen with countdown
function SuccessScreen({
  name,
  countdown,
  onReset,
}: {
  name: string;
  countdown: number;
  onReset: () => void;
}) {
  const trimmedName = name.trim();
  const firstName = trimmedName ? trimmedName.split(' ')[0] : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="text-center max-w-xl"
    >
      {/* Success Animation */}
      <motion.div
        className="relative mx-auto mb-8 w-32 h-32"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
      >
        <motion.div
          className="absolute inset-0 rounded-full bg-stall/30"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="relative w-full h-full rounded-full gradient-stall flex items-center justify-center shadow-glow-stall">
          <Check className="w-16 h-16 text-white" strokeWidth={3} />
        </div>
      </motion.div>

      <motion.h2
        className="text-4xl font-bold text-white mb-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {firstName ? `Thanks, ${firstName}! 🎉` : 'Thanks for stopping by! 🎉'}
      </motion.h2>

      <motion.p
        className="text-xl text-white/70 mb-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        We'll be in touch soon with personalized insights.
      </motion.p>

      {/* Countdown */}
      <motion.div
        className="mb-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="text-sm text-white/50 mb-2">Screen resets in</div>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 text-3xl font-bold text-white">
          {countdown}
        </div>
      </motion.div>

      <motion.button
        onClick={onReset}
        className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        whileTap={{ scale: 0.95 }}
      >
        <RotateCcw className="w-5 h-5" />
        Start New Entry
      </motion.button>
    </motion.div>
  );
}
