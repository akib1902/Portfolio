import type { ReactNode } from 'react';
import type { DiagramKind } from '@/content/projects';

export const diagramColors = {
  ink: '#282720',
  muted: '#6E6A60',
  line: '#D9D0C3',
  lineStrong: '#BFB3A0',
  surface: '#FFFCF6',
  paper: '#F5F0E8',
  amber: '#D99036',
  amberStrong: '#8A5714',
  wash: '#F3E4CD',
  success: '#3F6B4F',
};

const mono = 'JetBrains Mono, ui-monospace, monospace';
const body = 'Inter, system-ui, sans-serif';

interface BoxProps {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub?: string;
  accent?: boolean;
}

function Box({ x, y, w, h, title, sub, accent = false }: BoxProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={7}
        fill={accent ? diagramColors.wash : diagramColors.surface}
        stroke={accent ? diagramColors.amber : diagramColors.line}
        strokeWidth={1}
      />
      <text
        x={x + w / 2}
        y={sub ? y + h / 2 - 3 : y + h / 2 + 4}
        textAnchor="middle"
        fontFamily={body}
        fontSize={9.5}
        fontWeight={600}
        fill={diagramColors.ink}
        letterSpacing={0.2}
      >
        {title}
      </text>
      {sub ? (
        <text
          x={x + w / 2}
          y={y + h / 2 + 11}
          textAnchor="middle"
          fontFamily={mono}
          fontSize={6.7}
          fill={diagramColors.muted}
        >
          {sub}
        </text>
      ) : null}
    </g>
  );
}

function Arrow({
  x1,
  y1,
  x2,
  y2,
  dashed = false,
  color = diagramColors.muted,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashed?: boolean;
  color?: string;
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 4.2;
  const points = [
    `${x2},${y2}`,
    `${x2 - size * Math.cos(angle - Math.PI / 6)},${y2 - size * Math.sin(angle - Math.PI / 6)}`,
    `${x2 - size * Math.cos(angle + Math.PI / 6)},${y2 - size * Math.sin(angle + Math.PI / 6)}`,
  ].join(' ');
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2 - Math.cos(angle) * 3}
        y2={y2 - Math.sin(angle) * 3}
        stroke={color}
        strokeWidth={1}
        strokeDasharray={dashed ? '3 3' : undefined}
      />
      <polygon points={points} fill={color} />
    </g>
  );
}

function Elbow({
  fromX,
  fromY,
  midX,
  toX,
  toY,
  dashed = false,
}: {
  fromX: number;
  fromY: number;
  midX: number;
  toX: number;
  toY: number;
  dashed?: boolean;
}) {
  return (
    <g>
      <path
        d={`M${fromX} ${fromY} H${midX} V${toY} H${toX - 4}`}
        fill="none"
        stroke={diagramColors.muted}
        strokeWidth={1}
        strokeDasharray={dashed ? '3 3' : undefined}
      />
      <polygon
        points={`${toX},${toY} ${toX - 5},${toY - 3.5} ${toX - 5},${toY + 3.5}`}
        fill={diagramColors.muted}
      />
    </g>
  );
}

const diagramMeta: Record<DiagramKind, { title: string; desc: string }> = {
  agent: {
    title: 'Financial agent architecture diagram',
    desc: 'A FastAPI request enters an orchestrator that dispatches research, validation, and settlement stages, with an approval gate above a threshold and an append-only event log.',
  },
  platform: {
    title: 'Learning platform architecture diagram',
    desc: 'A browser talks to a Next.js server that enforces session and policy checks before querying PostgreSQL, with shared validation schemas at the boundary.',
  },
  pipeline: {
    title: 'CI/CD pipeline diagram',
    desc: 'A pull-request pipeline runs lint, unit, integration, image build, and scan. The same image digest is promoted through staging, smoke tests, approval, and production.',
  },
};

function SvgFrame({
  kind,
  mini,
  children,
}: {
  kind: DiagramKind;
  mini?: boolean;
  children: ReactNode;
}) {
  const meta = diagramMeta[kind];
  return (
    <svg
      viewBox="0 0 640 360"
      role={mini ? undefined : 'img'}
      aria-hidden={mini || undefined}
      aria-label={mini ? undefined : meta.title}
      preserveAspectRatio="xMidYMid meet"
    >
      {!mini ? <title>{meta.title}</title> : null}
      {!mini ? <desc>{meta.desc}</desc> : null}
      {children}
    </svg>
  );
}

function MicroLabel({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <text
      x={x}
      y={y}
      fontFamily={mono}
      fontSize={6.8}
      letterSpacing={1.3}
      fill={diagramColors.muted}
    >
      {children}
    </text>
  );
}

function AgentDiagram({ mini }: { mini?: boolean }) {
  return (
    <SvgFrame kind="agent" mini={mini}>
      <MicroLabel x={22} y={26}>
        EVENT-DRIVEN FLOW
      </MicroLabel>
      <MicroLabel x={474} y={26}>
        HUMAN BOUNDARY
      </MicroLabel>

      <Box x={22} y={142} w={106} h={64} title="REQUEST" sub="FastAPI" />
      <Arrow x1={128} y1={174} x2={158} y2={174} />

      <Box x={158} y={118} w={142} h={112} title="ORCHESTRATOR" sub="job state machine" accent />
      <Arrow x1={300} y1={174} x2={340} y2={174} />

      <Box x={340} y={46} w={128} h={58} title="RESEARCH" sub="read + retry" />
      <Box x={340} y={144} w={128} h={58} title="VALIDATE" sub="schema + limits" />
      <Box x={340} y={242} w={128} h={58} title="SETTLE" sub="provider adapter" />

      <Elbow fromX={300} fromY={150} midX={320} toX={338} toY={75} />
      <Arrow x1={468} y1={75} x2={506} y2={75} />
      <Box x={506} y={46} w={112} h={58} title="REPORT" sub="research output" />

      <Arrow x1={468} y1={173} x2={506} y2={173} />
      <Box x={506} y={144} w={112} h={58} title="CHECK" sub="rules + allowlist" />

      <Elbow fromX={468} fromY={271} midX={488} toX={506} toY={271} />
      <Box x={506} y={242} w={112} h={58} title="APPROVAL" sub="above threshold" accent />
      <Arrow x1={618} y1={271} x2={628} y2={271} />

      <Elbow fromX={300} fromY={210} midX={320} toX={338} toY={271} />

      <line
        x1={158}
        y1={312}
        x2={488}
        y2={312}
        stroke={diagramColors.lineStrong}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <text
        x={162}
        y={334}
        fontFamily={mono}
        fontSize={7}
        letterSpacing={1}
        fill={diagramColors.muted}
      >
        APPEND-ONLY EVENT LOG · REPLAY · AUDIT
      </text>
      <Arrow x1={174} y1={300} x2={174} y2={314} dashed color={diagramColors.lineStrong} />
      <Arrow x1={404} y1={300} x2={404} y2={314} dashed color={diagramColors.lineStrong} />
    </SvgFrame>
  );
}

function PlatformDiagram({ mini }: { mini?: boolean }) {
  return (
    <SvgFrame kind="platform" mini={mini}>
      <MicroLabel x={24} y={28}>
        AUTHENTICATED READ / WRITE PATH
      </MicroLabel>

      <Box x={24} y={122} w={110} h={68} title="BROWSER" sub="React UI" />
      <Arrow x1={134} y1={148} x2={168} y2={148} />
      <Arrow x1={168} y1={166} x2={134} y2={166} />

      <Box x={168} y={104} w={156} h={112} title="NEXT.JS SERVER" sub="SSR reads · handlers" accent />
      <Arrow x1={324} y1={160} x2={396} y2={160} />
      <Box x={396} y={100} w={166} h={104} title="POSTGRES" sub="relational model" />

      <Box x={396} y={244} w={166} h={62} title="SHARED SCHEMAS" sub="validation at boundary" />
      <Arrow x1={398} y1={258} x2={326} y2={238} dashed />

      <Box x={168} y={244} w={156} h={62} title="AUTH & POLICY" sub="role + ownership" accent />
      <Arrow x1={246} y1={216} x2={246} y2={240} />
      <Arrow x1={248} y1={275} x2={246} y2={222} dashed />
      <Elbow fromX={324} fromY={275} midX={360} toX={394} toY={275} dashed />

      <text
        x={396}
        y={334}
        fontFamily={mono}
        fontSize={7}
        letterSpacing={0.8}
        fill={diagramColors.muted}
      >
        ACCESS IS NEVER DECIDED ON THE CLIENT
      </text>
      <text
        x={24}
        y={334}
        fontFamily={mono}
        fontSize={7}
        letterSpacing={0.8}
        fill={diagramColors.amberStrong}
      >
        SESSION → POLICY → SCOPED QUERY
      </text>
    </SvgFrame>
  );
}

function PipelineDiagram({ mini }: { mini?: boolean }) {
  return (
    <SvgFrame kind="pipeline" mini={mini}>
      <MicroLabel x={20} y={30}>
        PULL REQUEST / VERIFY
      </MicroLabel>
      <MicroLabel x={474} y={30}>
        FAST FEEDBACK
      </MicroLabel>

      <Box x={20} y={48} w={100} h={56} title="LINT" sub="types + style" />
      <Arrow x1={120} y1={76} x2={140} y2={76} />
      <Box x={140} y={48} w={100} h={56} title="UNIT" sub="logic" />
      <Arrow x1={240} y1={76} x2={260} y2={76} />
      <Box x={260} y={48} w={112} h={56} title="INTEGRATION" sub="real services" />
      <Arrow x1={372} y1={76} x2={392} y2={76} />
      <Box x={392} y={48} w={108} h={56} title="BUILD IMAGE" sub="multi-stage" accent />
      <Arrow x1={500} y1={76} x2={520} y2={76} />
      <Box x={520} y={48} w={100} h={56} title="SCAN" sub="deps + image" />

      <line
        x1={20}
        y1={134}
        x2={620}
        y2={134}
        stroke={diagramColors.line}
        strokeWidth={1}
      />

      <MicroLabel x={20} y={166}>
        MAIN / RELEASE
      </MicroLabel>
      <MicroLabel x={490} y={166}>
        SAME DIGEST
      </MicroLabel>

      <line
        x1={446}
        y1={108}
        x2={446}
        y2={210}
        stroke={diagramColors.amberStrong}
        strokeWidth={1}
        strokeDasharray="3 3"
      />

      <Box x={20} y={192} w={108} h={62} title="PUBLISH" sub="@sha image" accent />
      <Arrow x1={128} y1={223} x2={144} y2={223} />
      <Box x={144} y={192} w={100} h={62} title="STAGING" sub="migrate" />
      <Arrow x1={244} y1={223} x2={260} y2={223} />
      <Box x={260} y={192} w={100} h={62} title="SMOKE" sub="critical path" />
      <Arrow x1={360} y1={223} x2={376} y2={223} />
      <Box x={376} y={192} w={108} h={62} title="APPROVAL" sub="protected env" />
      <Arrow x1={484} y1={223} x2={500} y2={223} />
      <Box x={500} y={192} w={120} h={62} title="PRODUCTION" sub="rollout + smoke" accent />

      <text
        x={20}
        y={306}
        fontFamily={mono}
        fontSize={7}
        letterSpacing={1}
        fill={diagramColors.muted}
      >
        UNIT · INTEGRATION · CONTRACT · SMOKE
      </text>
      <text
        x={20}
        y={326}
        fontFamily={mono}
        fontSize={7}
        letterSpacing={1}
        fill={diagramColors.amberStrong}
      >
        ROLLBACK: PREVIOUS IMMUTABLE TAG
      </text>
      <text
        x={620}
        y={326}
        textAnchor="end"
        fontFamily={mono}
        fontSize={7}
        letterSpacing={0.8}
        fill={diagramColors.muted}
      >
        FAILURE STOPS PROMOTION
      </text>
    </SvgFrame>
  );
}

export function ProjectDiagram({ kind, mini = false }: { kind: DiagramKind; mini?: boolean }) {
  if (kind === 'agent') return <AgentDiagram mini={mini} />;
  if (kind === 'platform') return <PlatformDiagram mini={mini} />;
  return <PipelineDiagram mini={mini} />;
}
