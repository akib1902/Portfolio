import { Link } from 'react-router-dom';
import type { Project } from '@/content/projects';
import { ArrowUpRight } from './icons';
import { ProjectDiagram } from './Diagrams';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link to={`/projects/${project.slug}`} className="project-card">
      <div className="project-card__visual">
        <ProjectDiagram kind={project.diagram} mini />
        <span className="project-card__badge">{project.category}</span>
        <span className="project-card__arrow" aria-hidden="true">
          <ArrowUpRight size={14} />
        </span>
      </div>
      <div className="project-card__body">
        <h3 className="project-card__title">{project.title}</h3>
        <p className="project-card__summary">{project.summary}</p>
        <div className="chip-row project-card__stack">
          {project.stack.map((item) => (
            <span className="chip" key={item}>
              {item}
            </span>
          ))}
        </div>
        <div className="project-card__foot">
          <span className="project-card__status">
            <span className="project-card__status-dot" aria-hidden="true" />
            {project.status}
          </span>
          <span aria-hidden="true">Case study</span>
        </div>
      </div>
    </Link>
  );
}
