import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { PublicContent } from '@/content/types';
import { AdminContext } from './AdminContext';
import { ApiError, fetchAdminContent, getSession, logout, setCsrfToken } from './api';

const navItems = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/profile', label: 'Profile', end: false },
  { to: '/admin/projects', label: 'Projects', end: false },
  { to: '/admin/skills', label: 'Skills', end: false },
  { to: '/admin/appearance', label: 'Appearance', end: false },
  { to: '/admin/settings', label: 'Settings', end: false },
];

interface State {
  status: 'loading' | 'ready' | 'error';
  email?: string;
  content?: PublicContent;
  message?: string;
}

export default function AdminLayout() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const navigate = useNavigate();
  const location = useLocation();

  const load = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session.authenticated) {
        navigate('/admin/login', { replace: true, state: { from: location.pathname } });
        return;
      }
      const content = await fetchAdminContent();
      setState({ status: 'ready', email: session.user?.email, content });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        navigate('/admin/login', { replace: true });
        return;
      }
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'The dashboard could not be loaded.',
      });
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setCsrfToken(null);
      navigate('/admin/login', { replace: true });
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="admin-boot" role="status">
        Loading administration…
      </div>
    );
  }

  if (state.status === 'error' || !state.content) {
    return (
      <div className="admin-boot">
        <div className="admin-message admin-message--error" role="alert">
          <h1 className="admin-message__title">Dashboard unavailable</h1>
          <p>{state.message ?? 'Please try again.'}</p>
          <button type="button" className="btn btn--secondary btn--small" onClick={() => void load()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminContext.Provider
      value={{
        email: state.email ?? 'administrator',
        content: state.content,
        reload: load,
        setContent: (content) =>
          setState((current) => ({ ...current, status: 'ready', content })),
      }}
    >
      <div className="admin">
        <header className="admin-bar">
          <div className="admin-bar__inner">
            <div>
              <p className="admin-bar__kicker">Private administration</p>
              <p className="admin-bar__title">Portfolio CMS</p>
            </div>
            <div className="admin-bar__actions">
              <a className="admin-bar__link" href="/" target="_blank" rel="noreferrer">
                View site ↗
              </a>
              <button type="button" className="btn btn--secondary btn--small" onClick={() => void handleLogout()}>
                Sign out
              </button>
            </div>
          </div>
          <nav className="admin-nav" aria-label="Administration">
            <div className="admin-nav__inner">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `admin-nav__link${isActive ? ' admin-nav__link--active' : ''}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        </header>

        <main className="admin-main" id="admin-main">
          <Outlet />
        </main>

        <footer className="admin-foot">
          <span>{state.email}</span>
          <span>Signed in with a server-side session. Changes are recorded in the audit log.</span>
        </footer>
      </div>
    </AdminContext.Provider>
  );
}
