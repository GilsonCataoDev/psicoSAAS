import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { migratePersistedStorage } from '@/lib/storageMigration'

migratePersistedStorage('usecognia-onboarding', 'psicosaas-onboarding')

export type OnboardingStep = 'first_patient' | 'first_appointment' | 'booking_page' | 'whatsapp' | 'done'
export type OnboardingObjective = 'reminders' | 'agenda' | 'records' | 'financial' | 'documents'
export type OnboardingUsageMode = 'solo' | 'assistant' | 'clinic'
export type OnboardingPatientVolume = '0_5' | '6_10' | 'more_10' | 'student'

export type OnboardingProfile = {
  objectives: OnboardingObjective[]
  usageMode: OnboardingUsageMode
  patientVolume: OnboardingPatientVolume
}

interface OnboardingState {
  completed: boolean
  currentStep: OnboardingStep
  stepsCompleted: OnboardingStep[]
  profile?: OnboardingProfile
  setProfile: (profile: OnboardingProfile) => void
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
      profile: undefined,

      setProfile: (profile) => set({ profile, completed: true, currentStep: 'done' }),

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
      version: 5,
      migrate: () => ({ completed: false, currentStep: 'first_patient', stepsCompleted: [], profile: undefined }),
    },
  ),
)
