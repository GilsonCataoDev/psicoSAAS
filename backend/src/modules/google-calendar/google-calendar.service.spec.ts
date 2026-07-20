import axios from 'axios'
import { GoogleCalendarService } from './google-calendar.service'
import { Appointment } from '../appointments/entities/appointment.entity'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('GoogleCalendarService patient invitations', () => {
  const user = {
    id: 'psychologist-1',
    preferences: {
      googleCalendarConnected: true,
      googleCalendarRefreshToken: 'encrypted-refresh-token',
      googleCalendarInvitePatients: true,
    },
  }
  const users = {
    findOneBy: jest.fn(),
    save: jest.fn(),
  }
  const config = {
    get: jest.fn((key: string) => key === 'GOOGLE_CALENDAR_TIMEZONE' ? 'America/Sao_Paulo' : undefined),
  }
  let service: GoogleCalendarService
  let appointment: Appointment

  beforeEach(() => {
    jest.clearAllMocks()
    user.preferences.googleCalendarInvitePatients = true
    users.findOneBy.mockResolvedValue(user)
    users.save.mockImplementation(async value => value)
    service = new GoogleCalendarService(users as any, config as any)
    jest.spyOn(service as any, 'getValidAccessToken').mockResolvedValue('access-token')
    appointment = {
      id: 'appointment-1',
      psychologistId: user.id,
      date: '2026-07-22',
      time: '14:00',
      duration: 50,
      modality: 'online',
      meetingUrl: 'https://meet.google.com/example',
      patient: {
        name: 'Paciente Teste',
        email: 'PACIENTE@example.com',
      },
    } as Appointment
  })

  it('creates a private event and emails the patient invitation', async () => {
    mockedAxios.get.mockResolvedValue({ data: { items: [] } })
    mockedAxios.post.mockResolvedValue({ data: {} })

    await service.syncAppointment(appointment)

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      expect.objectContaining({
        summary: 'Compromisso agendado',
        visibility: 'private',
        guestsCanInviteOthers: false,
        attendees: [{
          email: 'paciente@example.com',
          displayName: 'Paciente Teste',
          responseStatus: 'needsAction',
        }],
      }),
      expect.objectContaining({ params: { sendUpdates: 'all' } }),
    )
  })

  it('updates the existing event instead of cancelling and recreating it', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        items: [{
          id: 'google-event-1',
          attendees: [{ email: 'paciente@example.com', responseStatus: 'accepted' }],
        }],
      },
    })
    mockedAxios.put.mockResolvedValue({ data: {} })

    await service.syncAppointment(appointment)

    expect(mockedAxios.put).toHaveBeenCalledWith(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events/google-event-1',
      expect.objectContaining({
        attendees: [expect.objectContaining({
          email: 'paciente@example.com',
          responseStatus: 'accepted',
        })],
      }),
      expect.objectContaining({ params: { sendUpdates: 'all' } }),
    )
    expect(mockedAxios.post).not.toHaveBeenCalled()
    expect(mockedAxios.delete).not.toHaveBeenCalled()
  })

  it('emails the cancellation when the appointment is removed', async () => {
    mockedAxios.get.mockResolvedValue({ data: { items: [{ id: 'google-event-1' }] } })
    mockedAxios.delete.mockResolvedValue({ data: {} })

    await service.deleteAppointment(appointment)

    expect(mockedAxios.delete).toHaveBeenCalledWith(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events/google-event-1',
      expect.objectContaining({ params: { sendUpdates: 'all' } }),
    )
  })

  it('does not expose the patient email when invitations are disabled', async () => {
    user.preferences.googleCalendarInvitePatients = false
    mockedAxios.get.mockResolvedValue({ data: { items: [] } })
    mockedAxios.post.mockResolvedValue({ data: {} })

    await service.syncAppointment(appointment)

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        summary: 'Sessao - Paciente Teste',
        attendees: [],
      }),
      expect.any(Object),
    )
  })
})
