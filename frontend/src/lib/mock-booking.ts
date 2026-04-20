import { BookingPage, Booking, AvailabilitySlot } from '@/types/booking'

export const mockBookingPage: BookingPage = {
  id: 'bp1',
  slug: 'carolina-mendes',
  isActive: true,
  title: 'Agende sua sessão',
  description: 'Olá! Aqui você pode escolher o melhor horário para começarmos nossa jornada juntas. Sinta-se à vontade para entrar em contato caso tenha dúvidas.',
  psychologistName: 'Dra. Carolina Mendes',
  psychologistCrp: '06/123456',
  specialty: 'Psicologia Clínica',
  sessionPrice: 180,
  sessionDuration: 50,
  slotInterval: 60,
  allowPresencial: true,
  allowOnline: true,
  minAdvanceDays: 1,
  maxAdvanceDays: 60,
  requirePaymentUpfront: false,
  pixKey: 'carolina@email.com',
  confirmationMessage: 'Que bom que você deu esse passo! Entraremos em contato para confirmar sua sessão em breve. 💙',
}

export const mockAvailability: AvailabilitySlot[] = [
  { id: 's1', weekday: 1, startTime: '09:00', endTime: '18:00' },
  { id: 's2', weekday: 2, startTime: '09:00', endTime: '18:00' },
  { id: 's3', weekday: 3, startTime: '09:00', endTime: '18:00' },
  { id: 's4', weekday: 4, startTime: '09:00', endTime: '18:00' },
  { id: 's5', weekday: 5, startTime: '09:00', endTime: '14:00' },
]

export const mockBookings: Booking[] = [
  {
    id: 'b1',
    patientName: 'Juliana Costa',
    patientEmail: 'juliana@email.com',
    patientPhone: '(11) 99999-8888',
    date: new Date().toISOString().split('T')[0],
    time: '15:00',
    duration: 50,
    status: 'pending',
    paymentStatus: 'pending',
    amount: 180,
    patientNotes: 'Primeira vez em terapia, um pouco ansiosa.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'b2',
    patientName: 'Rafael Oliveira',
    patientEmail: 'rafael@email.com',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '10:00',
    duration: 50,
    status: 'confirmed',
    paymentStatus: 'pending',
    amount: 180,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'b3',
    patientName: 'Camila Souza',
    patientEmail: 'camila@email.com',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    time: '09:00',
    duration: 50,
    status: 'confirmed',
    paymentStatus: 'paid',
    amount: 180,
    paymentMethod: 'pix',
    paidAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
]

// Gera slots disponíveis simulados para uma data
export function getMockSlots(date: string): string[] {
  const d = new Date(date)
  const weekday = d.getDay()
  if (weekday === 0 || weekday === 6) return []
  const slots = ['09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00']
  // Simula horários ocupados
  return slots.filter((_, i) => i % 3 !== 1)
}
