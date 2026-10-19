import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import Home from '@/pages/Home';

const About = lazy(() => import('@/pages/About'));
const Projects = lazy(() => import('@/pages/Projects'));
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'));
const Contact = lazy(() => import('@/pages/Contact'));
const Resume = lazy(() => import('@/pages/Resume'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function RouteLoader() {
  return (
    <div className="route-loading" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>Loading page…</span>
    </div>
  );
}

function deferredPage(page: ReactNode) {
  return <Suspense fallback={<RouteLoader />}>{page}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={deferredPage(<About />)} />
        <Route path="projects" element={deferredPage(<Projects />)} />
        <Route path="projects/:slug" element={deferredPage(<ProjectDetail />)} />
        <Route path="contact" element={deferredPage(<Contact />)} />
        <Route path="resume" element={deferredPage(<Resume />)} />
        <Route path="*" element={deferredPage(<NotFound />)} />
      </Route>
    </Routes>
  );
}
