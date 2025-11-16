/**
 * Onboarding flow for new users
 */

import { useState, useEffect } from 'react'
import { X, Upload, Workflow, Play, CheckCircle } from 'lucide-react'

const ONBOARDING_KEY = 'aw_onboarding_completed'

interface OnboardingProps {
  hasData: boolean
  hasWorkflows: boolean
  onNavigate: (view: 'data' | 'workflows') => void
}

export function Onboarding({ hasData, hasWorkflows, onNavigate }: OnboardingProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem(ONBOARDING_KEY)

    // Show onboarding if user is new (no data, no workflows, and hasn't completed onboarding)
    if (!completed && !hasData && !hasWorkflows) {
      setIsOpen(true)
    }
  }, [hasData, hasWorkflows])

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setIsOpen(false)
  }

  const steps = [
    {
      title: 'Welcome to AW App',
      description: 'Build and execute agentic workflows to automate your data processing.',
      icon: <CheckCircle size={64} style={{ color: 'var(--success)' }} />,
      action: null,
    },
    {
      title: 'Upload Your Data',
      description: 'Start by uploading data files (CSV, JSON, or TXT). This will be the input for your workflows.',
      icon: <Upload size={64} style={{ color: 'var(--primary)' }} />,
      action: {
        label: 'Go to Data Manager',
        onClick: () => {
          onNavigate('data')
          setCurrentStep(2)
        },
      },
    },
    {
      title: 'Create a Workflow',
      description: 'Build workflows with steps like loading, preparing, and validation. Workflows can process your data automatically.',
      icon: <Workflow size={64} style={{ color: 'var(--primary)' }} />,
      action: {
        label: 'Go to Workflows',
        onClick: () => {
          onNavigate('workflows')
          setCurrentStep(3)
        },
      },
    },
    {
      title: 'Execute & Monitor',
      description: 'Execute your workflows and monitor the progress in real-time. View results and download processed data.',
      icon: <Play size={64} style={{ color: 'var(--success)' }} />,
      action: null,
    },
  ]

  if (!isOpen) return null

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.3s ease-in-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          completeOnboarding()
        }
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '500px',
          margin: '1rem',
          position: 'relative',
          animation: 'slideInRight 0.3s ease-in-out',
        }}
      >
        <button
          onClick={completeOnboarding}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            padding: '0.5rem',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>{step.icon}</div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
            {step.title}
          </h2>

          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            {step.description}
          </p>

          {/* Progress indicators */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'center',
              marginBottom: '2rem',
            }}
          >
            {steps.map((_, index) => (
              <div
                key={index}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor:
                    index === currentStep ? 'var(--primary)' : 'var(--border)',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            {currentStep > 0 && (
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Back
              </button>
            )}

            {step.action ? (
              <button className="btn btn-primary" onClick={step.action.onClick}>
                {step.action.label}
              </button>
            ) : isLastStep ? (
              <button className="btn btn-primary" onClick={completeOnboarding}>
                Get Started
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => setCurrentStep(currentStep + 1)}>
                Next
              </button>
            )}

            {!isLastStep && (
              <button
                className="btn btn-secondary"
                onClick={completeOnboarding}
                style={{ fontSize: '0.875rem' }}
              >
                Skip Tour
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to reset onboarding for testing
 */
export function useResetOnboarding() {
  return () => {
    localStorage.removeItem(ONBOARDING_KEY)
    window.location.reload()
  }
}
