import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import type { PublicContent } from '@/content/types';
import { ContentProvider } from '@/lib/content';
import { ThemeProvider } from '@/lib/theme';
import { Layout } from '@/components/Layout';
import { SeoManager } from '@/components/SeoManager';
import Home from '@/pages/Home';
import About from '@/pages/About';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import Contact from '@/pages/Contact';
import Resume from '@/pages/Resume';
import NotFound from '@/pages/NotFound';

// Admin code is split out: public visitors never download the CMS.
const AdminLogin = lazy(() => import('@/admin/LoginPage'));
const AdminLayout = lazy(() => import('@/admin/AdminLayout'));
const DashboardPage = lazy(() => import('@/admin/DashboardPage'));
const ProfilePage = lazy(() => import('@/admin/ProfilePage'));
const ProjectsPage = lazy(() => import('@/admin/ProjectsPage'));
const ProjectEditorPage = lazy(() => import('@/admin/ProjectEditorPage'));
const SkillsPage = lazy(() => import('@/admin/SkillsPage'));
const AppearancePage = lazy(() => import('@/admin/AppearancePage'));
const SettingsPage = lazy(() => import('@/admin/SettingsPage'));

function AdminLoader() {
  return (
    <div className="admin-boot" role="status">
      Loading administration…
    </div>
  );
}

function deferred(page: ReactNode) {
  return <Suspense fallback={<AdminLoader />}>{page}</Suspense>;
}

export default function App({ content }: { content: PublicContent }) {
  return (
    <ContentProvider content={content}>
      <ThemeProvider defaultTheme={content.settings.defaultTheme}>
        <SeoManager />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:slug" element={<ProjectDetail />} />
            <Route path="contact" element={<Contact />} />
            <Route path="resume" element={<Resume />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="admin/login" element={deferred(<AdminLogin />)} />
          <Route path="admin" element={deferred(<AdminLayout />)}>
            <Route index element={deferred(<DashboardPage />)} />
            <Route path="profile" element={deferred(<ProfilePage />)} />
            <Route path="projects" element={deferred(<ProjectsPage />)} />
            <Route path="projects/new" element={deferred(<ProjectEditorPage />)} />
            <Route path="projects/:id" element={deferred(<ProjectEditorPage />)} />
            <Route path="skills" element={deferred(<SkillsPage />)} />
            <Route path="appearance" element={deferred(<AppearancePage />)} />
            <Route path="settings" element={deferred(<SettingsPage />)} />
          </Route>
        </Routes>
      </ThemeProvider>
    </ContentProvider>
  );
}
