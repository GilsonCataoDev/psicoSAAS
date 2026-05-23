import { CalendarDays, CheckCircle2, Clock, Search, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';

type AppointmentStatus = 'confirmed' | 'waiting' | 'follow-up';

type Appointment = {
  id: number;
  patient: string;
  therapist: string;
  time: string;
  duration: number;
  status: AppointmentStatus;
  modality: 'Presencial' | 'Online';
  room: string;
  note: string;
};

const appointments: Appointment[] = [
  { id: 1, patient: 'Marina Lopes', therapist: 'Dra. Helena Ruiz', time: '08:30', duration: 50, status: 'confirmed', modality: 'Online', room: 'Meet 02', note: 'Retorno quinzenal' },
  { id: 2, patient: 'Thiago Matos', therapist: 'Dr. Paulo Araujo', time: '09:40', duration: 60, status: 'waiting', modality: 'Presencial', room: 'Sala 3', note: 'Primeira consulta' },
  { id: 3, patient: 'Bianca Nunes', therapist: 'Dra. Helena Ruiz', time: '11:00', duration: 50, status: 'follow-up', modality: 'Online', room: 'Meet 01', note: 'Enviar escala de humor' },
  { id: 4, patient: 'Rafael Silva', therapist: 'Dra. Marta Brito', time: '14:20', duration: 45, status: 'confirmed', modality: 'Presencial', room: 'Sala 1', note: 'Acompanhamento familiar' },
  { id: 5, patient: 'Camila Tavares', therapist: 'Dr. Paulo Araujo', time: '16:10', duration: 50, status: 'waiting', modality: 'Online', room: 'Meet 03', note: 'Aguardar confirmacao' },
];

const statusLabel: Record<AppointmentStatus, string> = {
  confirmed: 'Confirmada',
  waiting: 'Pendente',
  'follow-up': 'Acao clinica',
};

export function App() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<AppointmentStatus | 'all'>('all');

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return appointments.filter((item) => {
      const matchesText =
        item.patient.toLowerCase().includes(text) ||
        item.therapist.toLowerCase().includes(text) ||
        item.note.toLowerCase().includes(text);
      const matchesStatus = status === 'all' || item.status === status;
      return matchesText && matchesStatus;
    });
  }, [query, status]);

  const confirmed = appointments.filter((item) => item.status === 'confirmed').length;
  const pending = appointments.length - confirmed;

  return (
    <main className="page-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Clinica Vida Norte</p>
          <h1>Agenda do dia</h1>
        </div>

        <div className="metric-list">
          <Metric icon={<CalendarDays />} label="Consultas" value={appointments.length.toString()} />
          <Metric icon={<CheckCircle2 />} label="Confirmadas" value={confirmed.toString()} />
          <Metric icon={<Clock />} label="Pendencias" value={pending.toString()} />
        </div>
      </aside>

      <section className="content">
        <header className="toolbar">
          <label className="search-field">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar paciente, profissional ou nota" />
          </label>

          <div className="status-filter" aria-label="Filtrar por status">
            {(['all', 'confirmed', 'waiting', 'follow-up'] as const).map((item) => (
              <button key={item} className={status === item ? 'active' : ''} onClick={() => setStatus(item)}>
                {item === 'all' ? 'Todos' : statusLabel[item]}
              </button>
            ))}
          </div>
        </header>

        <div className="schedule">
          {filtered.map((item) => (
            <article className="appointment-card" key={item.id}>
              <div className="time-block">
                <strong>{item.time}</strong>
                <span>{item.duration} min</span>
              </div>

              <div className="appointment-main">
                <div>
                  <h2>{item.patient}</h2>
                  <p>{item.therapist}</p>
                </div>
                <span className={`badge ${item.status}`}>{statusLabel[item.status]}</span>
              </div>

              <div className="appointment-details">
                <span>{item.modality}</span>
                <span>{item.room}</span>
                <span>{item.note}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}
