import { ArrowDownRight, ArrowUpRight, Building2, Download, Filter } from 'lucide-react';
import { useMemo, useState } from 'react';

type InvoiceStatus = 'paid' | 'open' | 'late';

type Invoice = {
  id: string;
  customer: string;
  plan: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
};

const invoices: Invoice[] = [
  { id: 'INV-1842', customer: 'Odonto Mais', plan: 'Growth', amount: 1290, dueDate: '2026-05-03', status: 'paid' },
  { id: 'INV-1843', customer: 'Clube Atlas', plan: 'Starter', amount: 540, dueDate: '2026-05-08', status: 'open' },
  { id: 'INV-1844', customer: 'Logisprint', plan: 'Scale', amount: 2480, dueDate: '2026-05-11', status: 'late' },
  { id: 'INV-1845', customer: 'Studio Nora', plan: 'Growth', amount: 1290, dueDate: '2026-05-15', status: 'paid' },
  { id: 'INV-1846', customer: 'Delta Farma', plan: 'Scale', amount: 2480, dueDate: '2026-05-19', status: 'open' },
  { id: 'INV-1847', customer: 'Nexo Contabil', plan: 'Starter', amount: 540, dueDate: '2026-05-22', status: 'paid' },
];

const statusLabel: Record<InvoiceStatus, string> = {
  paid: 'Pago',
  open: 'Aberto',
  late: 'Atrasado',
};

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function App() {
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all');

  const visibleInvoices = useMemo(
    () => invoices.filter((invoice) => status === 'all' || invoice.status === status),
    [status],
  );

  const revenue = invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.amount, 0);
  const openAmount = invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + invoice.amount, 0);
  const lateCount = invoices.filter((invoice) => invoice.status === 'late').length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span><Building2 size={21} /></span>
          <div>
            <h1>Pulse Finance</h1>
            <small>Controle mensal de assinaturas</small>
          </div>
        </div>
        <button className="export-button">
          <Download size={18} />
          Exportar
        </button>
      </header>

      <section className="summary-grid">
        <SummaryCard label="Receita recebida" value={currency.format(revenue)} trend="+12,4%" tone="positive" icon={<ArrowUpRight />} />
        <SummaryCard label="Em aberto" value={currency.format(openAmount)} trend="3 faturas" tone="neutral" icon={<Filter />} />
        <SummaryCard label="Risco de atraso" value={`${lateCount} conta`} trend="-1 vs abril" tone="negative" icon={<ArrowDownRight />} />
      </section>

      <section className="workspace">
        <div className="chart-panel">
          <div className="section-heading">
            <p>MRR por plano</p>
            <strong>Maio 2026</strong>
          </div>

          <div className="bars" aria-label="Receita por plano">
            <Bar label="Starter" value={1080} max={4960} />
            <Bar label="Growth" value={2580} max={4960} />
            <Bar label="Scale" value={4960} max={4960} />
          </div>
        </div>

        <div className="table-panel">
          <div className="table-header">
            <div className="section-heading">
              <p>Faturas recentes</p>
              <strong>{visibleInvoices.length} resultados</strong>
            </div>

            <div className="filter-row">
              {(['all', 'paid', 'open', 'late'] as const).map((item) => (
                <button key={item} className={status === item ? 'active' : ''} onClick={() => setStatus(item)}>
                  {item === 'all' ? 'Todas' : statusLabel[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="invoice-list">
            {visibleInvoices.map((invoice) => (
              <article className="invoice-row" key={invoice.id}>
                <span>{invoice.id}</span>
                <strong>{invoice.customer}</strong>
                <span>{invoice.plan}</span>
                <span>{new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</span>
                <strong>{currency.format(invoice.amount)}</strong>
                <span className={`status ${invoice.status}`}>{statusLabel[invoice.status]}</span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ label, value, trend, icon, tone }: { label: string; value: string; trend: string; icon: React.ReactNode; tone: string }) {
  return (
    <article className={`summary-card ${tone}`}>
      <span className="summary-icon">{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{trend}</small>
    </article>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="bar-item">
      <div className="bar-track">
        <span style={{ height: `${(value / max) * 100}%` }} />
      </div>
      <strong>{label}</strong>
      <small>{currency.format(value)}</small>
    </div>
  );
}
