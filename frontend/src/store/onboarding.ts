import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type OnboardingStep = 'availability' | 'first_patient' | 'booking_page' | 'done'

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
      currentStep: 'availability',
      stepsCompleted: [],

      completeStep: (step) =>
        set((s) => {
          const steps = s.stepsCompleted.includes(step)
            ? s.stepsCompleted
            : [...s.stepsCompleted, step]
          const order: OnboardingStep[] = ['availability', 'first_patient', 'booking_page']
          const nextIdx = order.indexOf(step) + 1
          const nextStep = order[nextIdx] ?? 'done'
          return { stepsCompleted: steps, currentStep: nextStep }
        }),

      complete: () => set({ completed: true, currentStep: 'done' }),
      skip: () => set({ completed: true }),
    }),
    {
      name: 'psicosaas-onboarding',
      version: 3,
      migrate: () => ({ completed: false, currentStep: 'availability', stepsCompleted: [] }),
    },
  ),
)
