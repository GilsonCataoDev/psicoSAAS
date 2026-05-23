import { MessageSquare, Search, SlidersHorizontal, TimerReset } from 'lucide-react';
import { useMemo, useState } from 'react';

type TicketStatus = 'triage' | 'progress' | 'waiting' | 'done';
type Priority = 'Alta' | 'Media' | 'Baixa';

type Ticket = {
  id: string;
  title: string;
  company: string;
  owner: string;
  priority: Priority;
  status: TicketStatus;
  sla: string;
  tags: string[];
};

const columns: { key: TicketStatus; title: string }[] = [
  { key: 'triage', title: 'Triagem' },
  { key: 'progress', title: 'Em andamento' },
  { key: 'waiting', title: 'Aguardando cliente' },
  { key: 'done', title: 'Resolvido' },
];

const initialTickets: Ticket[] = [
  { id: 'SUP-2048', title: 'Erro ao gerar segunda via de boleto', company: 'Delta Farma', owner: 'Laura', priority: 'Alta', status: 'triage', sla: '1h 20m', tags: ['billing', 'portal'] },
  { id: 'SUP-2049', title: 'Webhook nao chegou no ERP', company: 'Logisprint', owner: 'Andre', priority: 'Alta', status: 'progress', sla: '2h 05m', tags: ['api', 'integracao'] },
  { id: 'SUP-2050', title: 'Troca de administrador da conta', company: 'Studio Nora', owner: 'Nina', priority: 'Media', status: 'waiting', sla: '6h 10m', tags: ['acesso'] },
  { id: 'SUP-2051', title: 'Divergencia no relatorio mensal', company: 'Nexo Contabil', owner: 'Laura', priority: 'Media', status: 'progress', sla: '3h 42m', tags: ['relatorio'] },
  { id: 'SUP-2052', title: 'Duvida sobre convite de usuarios', company: 'Clube Atlas', owner: 'Andre', priority: 'Baixa', status: 'done', sla: 'Fechado', tags: ['onboarding'] },
  { id: 'SUP-2053', title: 'Atualizar dominio de emails transacionais', company: 'Odonto Mais', owner: 'Nina', priority: 'Baixa', status: 'triage', sla: '8h 15m', tags: ['email'] },
];

export function App() {
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<Priority | 'Todas'>('Todas');
  const [tickets, setTickets] = useState(initialTickets);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesText =
        ticket.title.toLowerCase().includes(text) ||
        ticket.company.toLowerCase().includes(text) ||
        ticket.id.toLowerCase().includes(text);
      const matchesPriority = priority === 'Todas' || ticket.priority === priority;
      return matchesText && matchesPriority;
    });
  }, [priority, query, tickets]);

  function moveTicket(id: string, direction: 1 | -1) {
    setTickets((current) =>
      current.map((ticket) => {
        if (ticket.id !== id) return ticket;
        const index = columns.findIndex((column) => column.key === ticket.status);
        const next = columns[index + direction]?.key ?? ticket.status;
        return { ...ticket, status: next };
      }),
    );
  }

  return (
    <main className="support-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Support Ops</p>
          <h1>Fila de tickets B2B</h1>
        </div>
        <div className="hero-stats">
          <Stat icon={<MessageSquare />} label="Tickets" value={tickets.length.toString()} />
          <Stat icon={<TimerReset />} label="SLA critico" value={tickets.filter((ticket) => ticket.priority === 'Alta' && ticket.status !== 'done').length.toString()} />
        </div>
      </header>

      <section className="filters">
        <label className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ticket, cliente ou assunto" />
        </label>
        <label className="select-box">
          <SlidersHorizontal size={18} />
          <select value={priority} onChange={(event) => setPriority(event.target.value as Priority | 'Todas')}>
            <option>Todas</option>
            <option>Alta</option>
            <option>Media</option>
            <option>Baixa</option>
          </select>
        </label>
      </section>

      <section className="board">
        {columns.map((column) => {
          const columnTickets = filtered.filter((ticket) => ticket.status === column.key);
          return (
            <div className="column" key={column.key}>
              <div className="column-header">
                <strong>{column.title}</strong>
                <span>{columnTickets.length}</span>
              </div>

              <div className="ticket-list">
                {columnTickets.map((ticket) => (
                  <article className="ticket-card" key={ticket.id}>
                    <div className="ticket-topline">
                      <span>{ticket.id}</span>
                      <span className={`priority ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span>
                    </div>
                    <h2>{ticket.title}</h2>
                    <p>{ticket.company}</p>
                    <div className="ticket-meta">
                      <span>{ticket.owner}</span>
                      <span>{ticket.sla}</span>
                    </div>
                    <div className="tags">
                      {ticket.tags.map((tag) => (
                        <small key={tag}>{tag}</small>
                      ))}
                    </div>
                    <div className="actions">
                      <button onClick={() => moveTicket(ticket.id, -1)} disabled={ticket.status === 'triage'}>Voltar</button>
                      <button onClick={() => moveTicket(ticket.id, 1)} disabled={ticket.status === 'done'}>Avancar</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="stat">
      {icon}
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
