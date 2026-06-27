import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { migratePersistedStorage } from '@/lib/storageMigration'

migratePersistedStorage('usecognia-onboarding', 'psicosaas-onboarding')

export type OnboardingStep = 'first_patient' | 'first_appointment' | 'booking_page' | 'whatsapp' | 'done'

interface OnboardingState {
  completed: boolean
  currentStep: OnboardingStep
  stepsCompleted: OnboardingStep[]
  complete: () => void
  completeStep: (step: OnboardingStep) => void
  skip: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      currentStep: 'first_patient',
      stepsCompleted: [],

      completeStep: (step) =>
        set((s) => {
          const steps = s.stepsCompleted.includes(step)
            ? s.stepsCompleted
            : [...s.stepsCompleted, step]
          const order: OnboardingStep[] = ['first_patient', 'first_appointment', 'booking_page', 'whatsapp']
          const nextIdx = order.indexOf(step) + 1
          const nextStep = order[nextIdx] ?? 'done'
          return { stepsCompleted: steps, currentStep: nextStep }
        }),

      complete: () => set({ completed: true, currentStep: 'done' }),
      skip: () => set({ completed: true }),
    }),
    {
      name: 'usecognia-onboarding',
      version: 4,
      migrate: () => ({ completed: false, currentStep: 'first_patient', stepsCompleted: [] }),
    },
  ),
)
