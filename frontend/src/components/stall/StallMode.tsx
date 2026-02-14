// ==========================================
// Stall Mode - Lead Wizard (Kiosk Experience)
// Multi-step form with large touch targets
// ==========================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  User,
  Building2,
  Phone,
  ArrowRight,
  ArrowLeft,
  Check,
  QrCode,
  Camera,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { PageContainer } from '@/components/layout';
import { cn } from '@/lib/utils';

type WizardStep = 'attract' | 'name' | 'contact' | 'company' | 'success';

interface LeadFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  designation: string;
}

export function StallMode() {
  const [step, setStep] = useState<WizardStep>('attract');
  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    designation: '',
  });
  const [countdown, setCountdown] = useState(5);

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
      company: '',
      designation: '',
    });
    setCountdown(5);
  }, []);

  const handleNext = () => {
    const steps: WizardStep[] = ['attract', 'name', 'contact', 'company', 'success'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: WizardStep[] = ['attract', 'name', 'contact', 'company', 'success'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
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
            />
          )}
          {step === 'company' && (
            <CompanyStep
              key="company"
              company={formData.company}
              designation={formData.designation}
              onChangeCompany={(company) => setFormData({ ...formData, company })}
              onChangeDesignation={(designation) => setFormData({ ...formData, designation })}
              onSubmit={handleNext}
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
          {['name', 'contact', 'company'].map((s, index) => (
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
        <p className="text-white/60">Let's start with a quick introduction</p>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your full name"
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
          disabled={!value.trim()}
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
}: {
  phone: string;
  email: string;
  onChangePhone: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [activeField, setActiveField] = useState<'phone' | 'email'>('phone');

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
        <p className="text-white/60">Phone number is required</p>
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
        placeholder="Email (optional)"
        className={cn(
          'w-full h-14 px-6 text-lg text-center mb-6',
          'bg-surface-elevated border-2 border-border rounded-xl',
          'text-white placeholder:text-muted',
          'focus:outline-none focus:border-stall focus:ring-2 focus:ring-stall/20',
          'transition-all'
        )}
      />

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
          disabled={phone.length !== 10}
          className="flex-1"
        >
          Continue
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}

// Company Step
function CompanyStep({
  company,
  designation,
  onChangeCompany,
  onChangeDesignation,
  onSubmit,
  onBack,
}: {
  company: string;
  designation: string;
  onChangeCompany: (value: string) => void;
  onChangeDesignation: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
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
          <Building2 className="w-8 h-8 text-stall" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Where do you work?</h2>
        <p className="text-white/60">Help us personalize your experience</p>
      </div>

      <div className="space-y-4 mb-8">
        <input
          type="text"
          value={company}
          onChange={(e) => onChangeCompany(e.target.value)}
          placeholder="Company name"
          autoFocus
          className={cn(
            'w-full h-16 px-6 text-xl text-center',
            'bg-surface-elevated border-2 border-border rounded-2xl',
            'text-white placeholder:text-muted',
            'focus:outline-none focus:border-stall focus:ring-4 focus:ring-stall/20',
            'transition-all'
          )}
        />
        <input
          type="text"
          value={designation}
          onChange={(e) => onChangeDesignation(e.target.value)}
          placeholder="Your role (optional)"
          className={cn(
            'w-full h-14 px-6 text-lg text-center',
            'bg-surface-elevated border-2 border-border rounded-xl',
            'text-white placeholder:text-muted',
            'focus:outline-none focus:border-stall focus:ring-2 focus:ring-stall/20',
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
          disabled={!company.trim() || isSubmitting}
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
  const firstName = name.split(' ')[0];

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
        Thanks, {firstName}! 🎉
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
