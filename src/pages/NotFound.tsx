import { Link } from 'react-router-dom';
import { usePageMeta } from '@/lib/use-page-meta';
import { ArrowRight, ArrowUpRight } from '@/components/icons';

export default function NotFound() {
  usePageMeta({
    title: 'Page not found — Akib Ahmed',
    description: 'The page you requested does not exist. Return to the portfolio home or browse the project case studies.',
    path: '/404',
    noindex: true,
  });

  return (
    <div className="page">
      <div className="container not-found">
        <p className="eyebrow">Error 404</p>
        <p className="not-found__code" aria-hidden="true">
          4<span>0</span>4
        </p>
        <h1 className="not-found__title">This page did not pass validation.</h1>
        <p className="not-found__body">
          The URL points to a route that does not exist. It may have moved, or a link may be
          incomplete. The rest of the portfolio is still here.
        </p>
        <div className="not-found__actions">
          <Link to="/" className="btn btn--primary">
            Back home <ArrowRight size={15} />
          </Link>
          <Link to="/projects" className="btn btn--secondary">
            Browse projects <ArrowUpRight size={15} />
          </Link>
          <Link to="/contact" className="text-link">
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
}
