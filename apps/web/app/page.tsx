import Link from "next/link";
import {listProjects} from "../lib/project-runtime";

export default function HomePage() {
  const projects = listProjects();

  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <div className="eyebrow">AI Explainer Studio</div>
          <h1>Production Dashboard</h1>
          <p className="muted">Chọn project để tiếp tục đúng bước mà pipeline đang yêu cầu.</p>
        </div>
      </div>

      <section className="project-grid">
        {projects.map((project) => (
          <Link className="project-card" href={`/projects/${project.slug}`} key={project.slug}>
            <div className="eyebrow">{project.project_id}</div>
            <h2>{project.topic}</h2>
            <p className="muted">{project.language} · Guided workflow</p>
            <div className="button-row">
              <span className="button">Mở project</span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
