'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { markOnboardingComplete } from '@/lib/onboarding';
import { getRegularUserSteps, getConsultantSteps } from '@/components/onboardingSteps';

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};

export function OnboardingModal({ isOpen, onClose, isConsultant, userId }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const steps = isConsultant ? getConsultantSteps() : getRegularUserSteps();
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleClose = useCallback(() => {
    markOnboardingComplete(userId);
    setCurrentStep(0);
    onClose();
  }, [userId, onClose]);

  const goNext = useCallback(() => {
    if (isLastStep) {
      handleClose();
    } else {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  }, [isLastStep, handleClose]);

  const goPrev = useCallback(() => {
    if (!isFirstStep) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  }, [isFirstStep]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose, goNext, goPrev]);

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  const StepIcon = step.icon;

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          maxWidth: 520,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            width: 32,
            height: 32,
            borderRadius: 8,
            border: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'}
        >
          <X size={18} color="#64748b" />
        </button>

        {/* Visual area */}
        <div style={{
          height: 200,
          background: 'linear-gradient(145deg, #f0f4ff 0%, #e8ecf8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          flexShrink: 0,
        }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step.id + '-visual'}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
              }}
            >
              {step.renderVisual()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Text content */}
        <div style={{
          padding: '28px 32px 20px',
          overflow: 'hidden',
          position: 'relative',
          minHeight: 120,
        }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step.id + '-text'}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
              }}>
                <StepIcon size={20} color="#021048" />
                <h2 style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#021048',
                  margin: 0,
                  lineHeight: 1.3,
                }}>
                  {step.title}
                </h2>
              </div>
              <p style={{
                fontSize: 15,
                color: '#64748b',
                lineHeight: 1.6,
                margin: 0,
              }}>
                {step.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer: dots + navigation */}
        <div style={{
          padding: '16px 32px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(0, 0, 0, 0.05)',
          flexShrink: 0,
        }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 6 }}>
            {steps.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: i === currentStep ? '#021048' : '#e2e8f0',
                  transition: 'background-color 0.2s ease',
                }}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!isLastStep && (
              <button
                onClick={handleClose}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Skip
              </button>
            )}
            {!isFirstStep && (
              <button
                onClick={goPrev}
                style={{
                  padding: '8px 14px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  color: '#374151',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                <ChevronLeft size={14} />
                Back
              </button>
            )}
            <button
              onClick={goNext}
              style={{
                padding: '8px 20px',
                border: 'none',
                backgroundColor: '#021048',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: 'inherit',
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              {isLastStep ? 'Get Started' : (
                <>
                  Next
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
