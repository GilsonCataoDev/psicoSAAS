import { AlertCircle, Building2, Mail, MapPin, RefreshCw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type ApiUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  website: string;
  company: {
    name: string;
    catchPhrase: string;
  };
  address: {
    city: string;
    street: string;
  };
};

type LoadState = 'idle' | 'loading' | 'success' | 'error';

const API_URL = 'https://jsonplaceholder.typicode.com/users';

export function App() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [status, setStatus] = useState<LoadState>('idle');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  async function loadUsers() {
    setStatus('loading');
    setError('');

    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`Erro ${response.status} ao consultar usuarios.`);
      }

      const data = (await response.json()) as ApiUser[];
      setUsers(data);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar os dados.');
      setStatus('error');
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const text = query.trim().toLowerCase();

    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(text) ||
        user.email.toLowerCase().includes(text) ||
        user.company.name.toLowerCase().includes(text) ||
        user.address.city.toLowerCase().includes(text)
      );
    });
  }, [query, users]);

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">API publica</p>
          <h1>Consulta de usuarios</h1>
          <p className="subtitle">Exemplo simples de consumo de API com estados de carregamento, erro e filtro local.</p>
        </div>

        <button className="refresh-button" onClick={loadUsers} disabled={status === 'loading'}>
          <RefreshCw size={18} />
          Atualizar
        </button>
      </header>

      <section className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, email, empresa ou cidade"
          />
        </label>

        <div className="api-card">
          <span>Endpoint</span>
          <strong>{API_URL}</strong>
        </div>
      </section>

      {status === 'loading' && <StateMessage title="Carregando usuarios" text="Buscando dados na API publica..." />}

      {status === 'error' && (
        <div className="error-box">
          <AlertCircle size={20} />
          <div>
            <strong>Falha ao carregar</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {status === 'success' && (
        <>
          <section className="summary">
            <Metric label="Usuarios" value={users.length.toString()} />
            <Metric label="Resultados" value={filteredUsers.length.toString()} />
            <Metric label="Fonte" value="REST" />
          </section>

          <section className="grid">
            {filteredUsers.map((user) => (
              <article className="user-card" key={user.id}>
                <div className="avatar">{user.name.slice(0, 1)}</div>
                <div className="user-main">
                  <h2>{user.name}</h2>
                  <span>@{user.username}</span>
                </div>

                <div className="details">
                  <Info icon={<Mail />} text={user.email} />
                  <Info icon={<Building2 />} text={user.company.name} />
                  <Info icon={<MapPin />} text={`${user.address.city}, ${user.address.street}`} />
                </div>

                <p className="phrase">{user.company.catchPhrase}</p>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Info({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="info-row">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function StateMessage({ title, text }: { title: string; text: string }) {
  return (
    <section className="state-box">
      <div className="spinner" />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </section>
  );
}
