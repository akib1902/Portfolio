export const projectFilters = [
  'All',
  'Full-Stack',
  'Backend',
  'DevOps',
  'QA / Automation',
] as const;

export type ProjectFilter = (typeof projectFilters)[number];
export type ProjectCategory = Exclude<ProjectFilter, 'All'>;
export type DiagramKind = 'agent' | 'platform' | 'pipeline';

export interface CaseStudySection {
  id: string;
  index: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface Project {
  slug: string;
  title: string;
  shortTitle: string;
  category: ProjectCategory;
  categories: ProjectCategory[];
  status: string;
  statusTone: 'amber' | 'green' | 'neutral';
  summary: string;
  value: string;
  stack: string[];
  diagram: DiagramKind;
  diagramCaption: string;
  focus: string;
  featured: boolean;
  sections: CaseStudySection[];
  links: {
    repo: string | null;
    live: string | null;
  };
  evidenceNote: string;
}

const privateNote =
  'Repository and live-demo links are not public at the time of writing, so none are shown. This case study documents the problem, design, implementation, and tests without claiming production metrics or client outcomes.';

export const projects: Project[] = [
  {
    slug: 'financial-research-settlement-agent',
    title: 'Resilient Multi-Step Financial Research & Settlement Agent',
    shortTitle: 'Financial Research & Settlement Agent',
    category: 'Backend',
    categories: ['Backend', 'QA / Automation'],
    status: 'Case study · code private',
    statusTone: 'amber',
    summary:
      'An asynchronous, event-driven backend that breaks financial research and settlement into validated, resumable, auditable stages.',
    value:
      'Turns a fragile multi-step money workflow into a sequence of inspectable stages with explicit failure boundaries.',
    stack: ['Python', 'FastAPI', 'Docker', 'AWS'],
    diagram: 'agent',
    diagramCaption:
      'Request boundary → orchestrated stages → guarded settlement adapter, with an append-only event trail.',
    focus: 'Event-driven architecture, validation, failure handling, auditability',
    featured: true,
    sections: [
      {
        id: 'problem',
        index: '01',
        title: 'Problem & motivation',
        paragraphs: [
          'Financial research and settlement are rarely a single request. They are a chain of lookups, checks, decisions, and hand-offs. Wrapping that chain in one synchronous endpoint makes every failure opaque: a provider timeout can leave a workflow half-applied, and an operator has no reliable way to see which step ran, what it received, and what it changed.',
          'This project explores a different shape: an asynchronous pipeline where each stage has a typed contract, a retry-safe side effect, and an entry in an audit trail.',
        ],
        bullets: [
          'A timeout at one provider should not force the whole workflow to restart.',
          'Operators need a timeline, not a stack trace, when a settlement is stuck.',
          'Financial actions need hard limits and explicit approval gates — not trust in a model prompt.',
        ],
      },
      {
        id: 'requirements',
        index: '02',
        title: 'Requirements & constraints',
        paragraphs: [
          'The constraints were as important as the features. Research steps are read-heavy and tolerant of retries; settlement steps are write-heavy and must never run twice by accident. The system therefore separates planning from execution and treats every external call as untrusted.',
        ],
        bullets: [
          'Asynchronous job lifecycle with explicit states and valid transitions.',
          'Strict schema validation at the API boundary and between stages.',
          'Idempotency keys for every stage that can cause a side effect.',
          'A durable audit trail with correlation IDs and redacted payloads.',
          'Instrument allowlists, amount caps, and human approval above a threshold.',
          'Sandbox-only providers in development and tests; no live funds.',
        ],
      },
      {
        id: 'architecture',
        index: '03',
        title: 'Architecture & key decisions',
        paragraphs: [
          'A FastAPI boundary validates requests and creates a run. An orchestrator owns the state machine and dispatches work to queue-backed stage workers. Each worker performs one job, records its result, and reports back; it never decides the next step on its own.',
          'The settlement provider sits behind an adapter interface. That keeps provider-specific retry rules, signatures, and error codes out of the orchestration logic — and makes it possible to test failure modes with a fake provider.',
        ],
        bullets: [
          'Orchestrator owns transitions; workers own side effects.',
          'Separate stage schemas, validated on input and output.',
          'Append-only event log for reconstruction and audit.',
          'Dead-letter queue for exhausted retries, with a documented replay path.',
          'Approval gate as a first-class state, not an afterthought.',
        ],
      },
      {
        id: 'implementation',
        index: '04',
        title: 'Implementation details',
        paragraphs: [
          'The request path is deliberately boring: authenticate, validate, create a run, enqueue the first stage, return a run identifier. Everything after that is observable through the run timeline.',
          'Retries use capped exponential backoff with jitter and a hard attempt limit. Every external call has a timeout. Duplicate callbacks are accepted but ignored through the idempotency key, and every log line carries the run and stage identifiers so a single workflow can be traced across containers.',
        ],
        bullets: [
          'Explicit state machine with guards against invalid transitions.',
          'Idempotency key derived from run, stage, and attempt scope.',
          'Provider adapter with normalised error categories.',
          'Structured logs and stage-level timing metrics.',
          'Containerised services with environment-based configuration; no secrets in images.',
        ],
      },
      {
        id: 'security',
        index: '05',
        title: 'API, data & security',
        paragraphs: [
          'The API exposes run creation, run status, timeline, and approval endpoints. Operator endpoints are authenticated and authorised separately from the public request path. Mutating requests validate content type and reject unknown fields rather than silently accepting them.',
          'The service is designed to hold the minimum data required to complete a workflow. Sensitive provider payloads are redacted or hashed in the audit log, and approval actions are recorded with actor, timestamp, and the exact state transition they authorised.',
        ],
        bullets: [
          'Schema validation on every boundary; unknown fields rejected.',
          'Idempotency-Key required for run creation and approval.',
          'Per-instrument and per-run amount ceilings enforced server-side.',
          'Short-lived approval tokens, scoped to one transition.',
          'Secrets delivered through the environment/secret manager, never committed.',
        ],
      },
      {
        id: 'testing',
        index: '06',
        title: 'Testing strategy & evidence',
        paragraphs: [
          'The test suite is organised around failure. Validators and transition guards are covered by fast unit tests; the provider adapter is covered by contract tests; the orchestration is exercised against a fake provider that can time out, duplicate a callback, or fail after a partial write.',
        ],
        bullets: [
          'Unit tests for validation, amount guards, and state transitions.',
          'Contract tests for the settlement adapter and error normalisation.',
          'Integration tests with an in-process fake provider and isolated storage.',
          'Failure-injection cases: timeout, duplicate event, retry exhaustion, invalid transition.',
          'CI runs the suite in containers with no access to live financial services.',
        ],
      },
      {
        id: 'delivery',
        index: '07',
        title: 'CI/CD & deployment approach',
        paragraphs: [
          'Delivery is container-first. Pull requests run linting, type checks, unit and integration tests, then build an immutable image tagged with the commit SHA. Deployment promotes that same image through staging and production gates rather than rebuilding it.',
        ],
        bullets: [
          'Quality gates required before an image can be promoted.',
          'Staging smoke test covers run creation → research → approval → settlement simulation.',
          'Database migrations run as a separate, ordered step before application rollout.',
          'Health and readiness endpoints wired to the orchestrator and workers.',
          'Rollback by redeploying the previous immutable tag.',
        ],
      },
      {
        id: 'lessons',
        index: '08',
        title: 'Challenges, trade-offs & lessons',
        paragraphs: [
          'The hardest problem was not calling a provider — it was defining what “done” means when a provider call succeeds but the response is lost. Exactly-once delivery is not a property a queue can simply grant; the practical answer is idempotent stages plus reconciliation.',
          'Auditability also fights with data minimisation. Logging everything makes debugging easy and creates a liability. The compromise is to log decisions, identifiers, and hashes, and keep sensitive payloads out of the long-lived trail.',
        ],
        bullets: [
          'Long-running workflows need explicit state, not a request that hopes to finish.',
          'Reconciliation is a feature, not an operational workaround.',
          'Human approval is a state transition with an audit record — design it like one.',
          'The next step is broader contract coverage against sandbox providers and a replay dashboard for operators.',
        ],
      },
    ],
    links: { repo: null, live: null },
    evidenceNote: privateNote,
  },
  {
    slug: 'full-stack-learning-platform',
    title: 'Full-Stack Learning Platform',
    shortTitle: 'Learning Platform',
    category: 'Full-Stack',
    categories: ['Full-Stack', 'Backend', 'QA / Automation'],
    status: 'Case study · code private',
    statusTone: 'amber',
    summary:
      'A role-based learning platform with authentication, course authoring, enrolment, and progress tracking on a relational data model.',
    value:
      'Gives learners a clear path through structured content and gives instructors safe, scoped authoring tools.',
    stack: ['Next.js', 'TypeScript', 'PostgreSQL', 'Tailwind CSS'],
    diagram: 'platform',
    diagramCaption:
      'Server-rendered reads, authorized mutations, and a relational model with role-scoped access.',
    focus: 'Authentication, authorization, data modelling, API design, testing',
    featured: true,
    sections: [
      {
        id: 'problem',
        index: '01',
        title: 'Problem & motivation',
        paragraphs: [
          'Course content tends to scatter across documents, videos, and chat threads. Learners lose the thread of what they have completed, while instructors either edit the database directly or wait on an engineer for every content change.',
          'The platform brings structure to both sides: courses are composed of ordered modules and lessons, and access is governed by roles rather than by convention.',
        ],
        bullets: [
          'Learners need a readable path and honest progress state.',
          'Instructors need authoring tools that cannot reach another instructor’s content.',
          'Administrators need a clear view of who can do what.',
        ],
      },
      {
        id: 'requirements',
        index: '02',
        title: 'Requirements & constraints',
        paragraphs: [
          'Authorization was treated as the core requirement, not a wrapper added at the end. Every read and write has to answer who is asking, what they own, and whether the action is allowed in the current state.',
        ],
        bullets: [
          'Session-based authentication with secure cookie handling.',
          'Three roles: learner, instructor, administrator.',
          'Course, module, and lesson management with ordering.',
          'Enrolment and lesson-level progress tracking.',
          'Server-side validation for every mutation.',
          'Accessible, responsive UI with keyboard support.',
          'Safe rendering of instructor-authored content.',
        ],
      },
      {
        id: 'architecture',
        index: '03',
        title: 'Architecture & key decisions',
        paragraphs: [
          'The application uses the Next.js App Router. Data-heavy pages render on the server, while mutations go through route handlers that re-check the session and authorization before touching the database. PostgreSQL holds the relational model, with migrations kept in version control.',
          'Authorization lives in small, testable policy functions rather than repeated conditions in components. Those functions receive the actor and the resource, which makes the rules reviewable and gives the test suite a clear surface.',
        ],
        bullets: [
          'Server components for authenticated reads; no sensitive data in client state.',
          'Policy functions for role and ownership checks.',
          'Normalised schema: users, courses, modules, lessons, enrolments, progress.',
          'Unique enrolment constraint to prevent duplicate progress rows.',
          'Shared validation schemas used by the form and the server handler.',
        ],
      },
      {
        id: 'implementation',
        index: '04',
        title: 'Implementation details',
        paragraphs: [
          'Instructors work inside a course workspace: create a course, add ordered modules, then add lessons. Ordering is explicit, so reordering is a data operation rather than a drag-and-drop side effect that only exists in the browser.',
          'Learners see only published content. Progress is written as a server-confirmed state change and reflected optimistically in the interface, with the server remaining the source of truth.',
        ],
        bullets: [
          'Role-aware navigation and empty states.',
          'Ordered content with stable lesson identifiers.',
          'Progress upserts keyed by learner and lesson.',
          'Pagination and selective field loading on list views.',
          'Documented loading, empty, and error states for every data view.',
        ],
      },
      {
        id: 'security',
        index: '05',
        title: 'API, data & security',
        paragraphs: [
          'The database schema is intentionally conservative: foreign keys and uniqueness constraints do the structural work, while policy functions cover the contextual rules. Queries are parameterised, and resource lookups are scoped by the acting user rather than by an identifier supplied by the client alone.',
          'Sessions use HTTP-only cookies with same-site protection. Passwords are hashed with an established library, login attempts are rate-limited, and session identifiers are rotated at sign-in. Rich content is sanitised on the server before storage or rendering.',
        ],
        bullets: [
          'Every mutation re-authenticates and re-authorises on the server.',
          'No role or ownership decisions are trusted from the client.',
          'Server-side sanitisation for authored content.',
          'Rate limiting on authentication endpoints.',
          'Secrets held in the runtime environment; never exposed to the client bundle.',
        ],
      },
      {
        id: 'testing',
        index: '06',
        title: 'Testing strategy & evidence',
        paragraphs: [
          'The most valuable tests target authorization: can an instructor edit a course they do not own, can a learner read an unpublished lesson, can an administrator perform an action that is intentionally restricted? The suite asserts denials as carefully as successes.',
        ],
        bullets: [
          'Unit tests for policy functions and validation schemas.',
          'Integration tests for route handlers against a test database.',
          'Component tests for form validation and error states.',
          'End-to-end flows for sign-up, enrolment, and lesson completion.',
          'Seeded fixtures that cover each role and both ownership outcomes.',
        ],
      },
      {
        id: 'delivery',
        index: '07',
        title: 'CI/CD & deployment approach',
        paragraphs: [
          'The pipeline treats migrations as a reviewed artifact. Pull requests run type checks, linting, unit and integration tests. Preview environments use an isolated database, and production deployment applies migrations before the new application version becomes ready.',
        ],
        bullets: [
          'Required checks before merge.',
          'Migration review and ordered application on deploy.',
          'Preview environments for review, with seeded non-production data.',
          'Smoke test covering sign-in and one authenticated read after deploy.',
          'Rollback to the previous release with a forward-only migration note.',
        ],
      },
      {
        id: 'lessons',
        index: '08',
        title: 'Challenges, trade-offs & lessons',
        paragraphs: [
          'The recurring challenge was keeping the server/client boundary honest. Moving a query to the client for a smoother interaction is tempting, but it also moves the authorization decision. The rule that emerged: authenticated data and every permission check stay on the server.',
          'Content authoring also exposed the accessibility gap in typical rich-text tools. A simpler editor with structured fields produced cleaner output and was easier to navigate with a keyboard than a free-form canvas.',
        ],
        bullets: [
          'Authorization drift is a design problem, not a testing problem.',
          'A smaller editor with structured content beat a feature-rich one for reliability.',
          'Next steps: richer progress insights and a review workflow for course publication.',
        ],
      },
    ],
    links: { repo: null, live: null },
    evidenceNote: privateNote,
  },
  {
    slug: 'cicd-test-automation-lab',
    title: 'CI/CD & Test Automation Lab',
    shortTitle: 'CI/CD & Test Automation Lab',
    category: 'DevOps',
    categories: ['DevOps', 'QA / Automation'],
    status: 'Lab · code private',
    statusTone: 'amber',
    summary:
      'A container-first pipeline lab that builds, tests, scans, and deploys services behind automated quality gates and a smoke-tested rollout.',
    value:
      'Makes the path to production repeatable, evidence-based, and reversible.',
    stack: ['GitHub Actions', 'Docker', 'Linux', 'AWS'],
    diagram: 'pipeline',
    diagramCaption:
      'Pull request gates → immutable image → staged promotion → smoke test and rollback path.',
    focus: 'CI/CD design, containers, test automation, observability',
    featured: true,
    sections: [
      {
        id: 'problem',
        index: '01',
        title: 'Problem & motivation',
        paragraphs: [
          'A pipeline that only runs unit tests gives a false sense of safety. The failures that reach users tend to live between components: a migration that runs out of order, a container that starts before its dependency, or an environment that differs from production in one quiet way.',
          'This lab is a place to design those seams deliberately: reproducible builds, layered tests, immutable artifacts, and a deployment that can be verified and undone.',
        ],
        bullets: [
          'Local success should predict CI success.',
          'A green pipeline should mean more than “the unit tests passed”.',
          'Every deploy needs an observable success signal and a rollback path.',
        ],
      },
      {
        id: 'requirements',
        index: '02',
        title: 'Requirements & constraints',
        paragraphs: [
          'The target was a pipeline that a small team could trust without a dedicated platform engineer. That meant keeping the workflow readable, the runtime predictable, and the failure output specific enough to act on.',
        ],
        bullets: [
          'Reproducible builds from a clean checkout.',
          'Fast feedback on pull requests, with deeper checks after merge.',
          'Layered tests: unit, integration with real services, API, and smoke.',
          'Immutable, SHA-tagged container images.',
          'Least-privilege credentials and no long-lived cloud keys.',
          'Structured logs, health checks, and a rollback procedure.',
        ],
      },
      {
        id: 'architecture',
        index: '03',
        title: 'Architecture & key decisions',
        paragraphs: [
          'The pipeline is split into reusable workflows: verify, build, and deploy. Pull requests run verify and build without publishing. Merges to the main branch publish an image and promote it through environments using the same digest.',
          'Service dependencies run as containers alongside the test job, so integration tests exercise the same connection strings and startup behaviour used in deployment. A failed stage stops promotion; nothing is rebuilt between environments.',
        ],
        bullets: [
          'One build, many promotions: build once and promote the digest.',
          'Reusable workflows instead of copy-pasted YAML per service.',
          'Ephemeral runners with deterministic tool versions.',
          'Concurrency groups cancel superseded pull-request runs.',
          'Environment protection for the production promotion step.',
        ],
      },
      {
        id: 'implementation',
        index: '04',
        title: 'Implementation details',
        paragraphs: [
          'Multi-stage Dockerfiles separate dependency installation, build, and runtime. The runtime image is minimal, runs as a non-root user, and exposes a health endpoint. Build layers are cached by lockfile hash, which keeps pull-request feedback short without hiding dependency changes.',
          'Tests publish machine-readable results and coverage as artifacts. A failing test links back to its report instead of forcing a scroll through logs. Smoke tests run against the deployed URL and assert user-visible behaviour, not just a 200 response.',
        ],
        bullets: [
          'Matrix test jobs across supported runtime versions.',
          'Lockfile-keyed dependency caching with a clean-install fallback.',
          'Container health checks and non-root runtime user.',
          'JUnit and coverage artifacts retained per run.',
          'Smoke script covering the critical path and one failure path.',
        ],
      },
      {
        id: 'security',
        index: '05',
        title: 'Security & operational guardrails',
        paragraphs: [
          'Credentials are scoped per environment, and cloud access uses short-lived OIDC tokens where the target supports it. Pull requests from forks never receive deployment secrets. Permissions on the workflow token are read-only unless a job explicitly needs more.',
        ],
        bullets: [
          'Read-only default workflow permissions.',
          'Environment-scoped secrets with required reviewers for production.',
          'Image and dependency scanning before promotion.',
          'Secret scanning and dependency update automation.',
          'No credentials in build arguments, logs, or image layers.',
        ],
      },
      {
        id: 'testing',
        index: '06',
        title: 'Testing strategy & evidence',
        paragraphs: [
          'The lab uses the test pyramid as a budget, not a doctrine. Fast checks cover business logic; integration tests cover database behaviour and container wiring; a small end-to-end suite protects the critical user journey. Flaky tests are quarantined and tracked, never silently retried until green.',
        ],
        bullets: [
          'Unit tests with coverage reporting.',
          'Integration tests against real service containers.',
          'API contract checks for request and error shapes.',
          'Smoke tests after every deploy.',
          'Deterministic test data and explicit cleanup.',
        ],
      },
      {
        id: 'delivery',
        index: '07',
        title: 'CI/CD & deployment approach',
        paragraphs: [
          'Deployment is a promotion, not a rebuild. The exact image digest that passed verification is the one that reaches staging and production. A migration job runs first, then the application rollout waits for readiness before traffic is shifted.',
        ],
        bullets: [
          'Pull request: lint → type check → unit → integration → image build.',
          'Main: publish SHA-tagged image → deploy staging → smoke test.',
          'Production: manual approval → same digest → migration → rollout → smoke test.',
          'Deployment annotations record commit, image digest, and actor.',
          'Rollback is a previous-digest redeploy with a documented migration constraint.',
        ],
      },
      {
        id: 'lessons',
        index: '08',
        title: 'Challenges, trade-offs & lessons',
        paragraphs: [
          'Pipeline duration is a product decision. Running everything on every commit feels rigorous but trains people to ignore a slow, red build. Splitting fast checks from deep checks preserved feedback speed without dropping coverage.',
          'Caching was the other sharp edge: a cache that is too broad produces impossible failures. Keying caches to the lockfile and providing a clean-install escape hatch kept the wins without the mystery.',
        ],
        bullets: [
          'A pipeline is only trusted if its failures are legible.',
          'Immutable artifacts remove a whole class of environment drift.',
          'Quarantine flaky tests; do not normalise retries.',
          'Next steps: deployment-frequency and lead-time measurement, plus load testing in the promotion path.',
        ],
      },
    ],
    links: { repo: null, live: null },
    evidenceNote: privateNote,
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}

export function filterProjects(
  items: Project[],
  filter: ProjectFilter,
  query = '',
): Project[] {
  const normalisedQuery = query.trim().toLowerCase();
  return items.filter((project) => {
    const matchesFilter = filter === 'All' || project.categories.includes(filter);
    if (!matchesFilter) return false;
    if (!normalisedQuery) return true;
    const haystack = [
      project.title,
      project.summary,
      project.focus,
      ...project.stack,
      ...project.categories,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalisedQuery);
  });
}

export function adjacentProjects(slug: string): {
  previous: Project;
  next: Project;
} {
  const index = projects.findIndex((project) => project.slug === slug);
  const safeIndex = index === -1 ? 0 : index;
  return {
    previous: projects[(safeIndex - 1 + projects.length) % projects.length],
    next: projects[(safeIndex + 1) % projects.length],
  };
}
