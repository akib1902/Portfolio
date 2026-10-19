import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { activeSocialLinks, contactMailto, profile } from '@/content/profile';
import { CloseIcon, MenuIcon } from './icons';

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About', end: false },
  { to: '/projects', label: 'Projects', end: false },
  { to: '/contact', label: 'Contact', end: false },
];

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ block: 'start' });
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const main = document.getElementById('main');
    main?.focus({ preventScroll: true });
  }, [pathname, hash]);

  return null;
}

function Header() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="brand">
          <span>Akib</span>
          <span className="brand__last">Ahmed</span>
        </Link>

        <nav className="site-nav" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="site-nav__link"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <Link to="/contact" className="btn btn--primary btn--small">
            Hire me
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <CloseIcon size={18} /> : <MenuIcon size={18} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mobile-nav" id="mobile-nav">
          <nav className="container mobile-nav__inner" aria-label="Mobile">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="mobile-nav__link">
                {item.label}
                <span aria-hidden="true">↗</span>
              </NavLink>
            ))}
            <div className="mobile-nav__footer">
              <span className="mobile-nav__note">
                {profile.availability.available ? 'Open to opportunities' : 'Currently unavailable'}
              </span>
              <Link to="/resume" className="link-arrow">
                Resume
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function Footer() {
  const socials = activeSocialLinks();
  const mailto = contactMailto();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div>
            <p className="footer-brand">
              Akib <span>Ahmed</span>
            </p>
            <p className="footer-note">
              Software engineer working across full-stack development, DevOps, and quality
              assurance. I build, test, and deploy software that holds up.
            </p>
            {socials.length > 0 || mailto ? (
              <div className="footer-social">
                {socials.map((social) => (
                  <a
                    key={social.key}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {social.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                ))}
                {mailto ? <a href={mailto}>Email</a> : null}
              </div>
            ) : null}
          </div>

          <nav aria-label="Footer navigation">
            <h2 className="footer-heading">Explore</h2>
            <ul className="footer-list">
              {navItems.map((item) => (
                <li key={item.to}>
                  <Link to={item.to}>{item.label}</Link>
                </li>
              ))}
              <li>
                <Link to="/resume">Resume</Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="footer-heading">Details</h2>
            <ul className="footer-list">
              <li>
                <span>
                  {profile.location} · {profile.timezone}
                </span>
              </li>
              <li>
                <span>{profile.workPreference}</span>
              </li>
              <li>
                <span>{profile.availability.label}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>© {year} Akib Ahmed</span>
          <span>Built with React, TypeScript &amp; Express</span>
          <a href="#main">Back to top</a>
        </div>
      </div>
    </footer>
  );
}

export function Layout() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ScrollToTop />
      <Header />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
