import type { SkillsDocument } from './types';

/**
 * Working toolkit, grouped by discipline.
 * These are the areas named in the project brief and project case studies —
 * not a claim that every item is mastered to the same depth.
 *
 * `highlighted` controls the compact home-page and resume summaries. Everything
 * in `items` is shown on the About page.
 */
export const skills: SkillsDocument = {
  note: 'A working toolkit, not a checklist. Depth varies by area, and each case study is explicit about what is implemented, what is a design decision, and what comes next.',
  groups: [
    {
      id: 'frontend',
      index: '01',
      title: 'Frontend',
      kicker: 'Interface & client engineering',
      description:
        'Accessible, responsive interfaces built with typed components and an eye on performance.',
      items: [
        'JavaScript & TypeScript',
        'React',
        'Next.js',
        'HTML & CSS',
        'Tailwind CSS',
        'Accessibility',
        'Web performance',
      ],
      highlighted: ['TypeScript', 'React', 'Accessibility', 'Web performance'],
    },
    {
      id: 'backend',
      index: '02',
      title: 'Backend',
      kicker: 'APIs, data & system design',
      description:
        'Server-side foundations: clear API contracts, deliberate data models, and safe authorization.',
      items: [
        'API design',
        'Node.js',
        'Python',
        'FastAPI',
        'Authentication & authorization',
        'PostgreSQL',
        'Background processing',
        'System design',
      ],
      highlighted: ['Node.js', 'Python', 'PostgreSQL', 'API design'],
    },
    {
      id: 'devops',
      index: '03',
      title: 'DevOps',
      kicker: 'Delivery & infrastructure',
      description:
        'Containerised deployments, automated pipelines, and the operational visibility to run them.',
      items: [
        'Linux',
        'Shell scripting',
        'Docker',
        'CI/CD',
        'GitHub Actions',
        'AWS',
        'Ansible',
        'Deployment & observability',
      ],
      highlighted: ['Docker', 'GitHub Actions', 'Linux', 'CI/CD'],
    },
    {
      id: 'qa',
      index: '04',
      title: 'Quality assurance',
      kicker: 'Testing & automation',
      description:
        'A test strategy across the stack, with automation concentrated where regressions hurt most.',
      items: [
        'Unit testing',
        'Integration testing',
        'API testing',
        'End-to-end testing',
        'Test automation',
        'Failure injection',
        'Test data design',
      ],
      highlighted: ['Test automation', 'API testing', 'E2E testing'],
    },
  ],
};

/** Backwards-compatible aliases used by the server seed. */
export const skillGroups = skills.groups;
export const toolkitNote = skills.note;
