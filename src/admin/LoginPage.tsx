import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError, getSession, login } from './api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/admin';

  useEffect(() => {
    let active = true;
    void getSession()
      .then((session) => {
        if (active && session.authenticated) navigate('/admin', { replace: true });
      })
      .catch(() => {
        /* A missing session response simply leaves the form visible. */
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from.startsWith('/admin') ? from : '/admin', { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Sign-in could not be completed. Check your connection and try again.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login__panel">
        <p className="admin-login__kicker">Akib Ahmed · Portfolio</p>
        <h1 className="admin-login__title">Administrator sign-in</h1>
        <p className="admin-login__intro">
          Private area. Accounts are provisioned from the server; there is no public registration.
        </p>

        <form className="admin-form" onSubmit={handleSubmit} noValidate>
          {error ? (
            <div className="admin-message admin-message--error" role="alert">
              {error}
            </div>
          ) : null}

          <label className="admin-field">
            <span className="admin-field__label">Email</span>
            <input
              className="admin-input"
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="admin-field">
            <span className="admin-field__label">Password</span>
            <input
              className="admin-input"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <button type="submit" className="btn btn--primary" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="admin-login__note">
          Sessions expire automatically and can be ended from Settings.
        </p>
      </div>
    </div>
  );
}
