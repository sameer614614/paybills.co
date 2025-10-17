import { type FormEvent, useState } from 'react';
import { loginAdmin } from '../api/admin.js';
import { useAdminAuth } from '../hooks/useAdminAuth.js';

export function LoginPage() {
  const { login } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await loginAdmin({ username, password });
      login(response.token, response.admin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-panel">
        <h1>Admin Console</h1>
        <p className="subtitle">Restricted network access only.</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            <span>Username</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="disclaimer">Traffic is monitored. Disconnect immediately if you are not authorized.</p>
      </div>
    </div>
  );
}
