'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { createForm, createProject, deleteProject, renameProject } from './actions';

export interface FormLite {
  id: string;
  name: string;
  active: number;
  total: number;
}

export interface ProjectLite {
  id: string;
  name: string;
  forms: FormLite[];
}

export default function Sidebar({ projects }: { projects: ProjectLite[] }) {
  const pathname = usePathname();
  const [addingProject, setAddingProject] = useState(false);
  const [formFor, setFormFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const activeId = pathname.startsWith('/admin/forms/') ? pathname.split('/')[3] : null;

  return (
    <aside className="sidebar">
      <div className="sidebar-label">Projects</div>

      {projects.map((p) => (
        <div key={p.id} className={`proj ${activeFormIn(p) ? 'proj-has-active' : ''}`}>
          {renaming === p.id ? (
            <form
              className="proj-rename"
              action={renameProject}
              onSubmit={(e) => {
                const v = (e.currentTarget.elements.namedItem('name') as HTMLInputElement).value.trim();
                if (!v) e.preventDefault();
                setRenaming(null);
              }}
            >
              <input type="hidden" name="id" value={p.id} />
              <input autoFocus name="name" defaultValue={p.name} className="inline-input" maxLength={80} />
            </form>
          ) : (
            <div className="proj-head">
              <span className="proj-name" title="Double-click to rename" onDoubleClick={() => setRenaming(p.id)}>
                {p.name}
              </span>
              <span className="proj-count">{p.forms.length}</span>
            </div>
          )}

          <div className="proj-forms">
            {p.forms.map((f) => (
              <a
                key={f.id}
                href={`/admin/forms/${f.id}`}
                className={`nav-form ${activeId === f.id ? 'active' : ''}`}
                title={f.active === 0 ? 'Paused' : 'Active'}
              >
                {f.active === 0 && <span className="paused-dot" />}
                <span className="nav-form-name">{f.name}</span>
                {f.total > 0 && <span className="nav-form-count">{f.total}</span>}
              </a>
            ))}

            {formFor === p.id ? (
              <form
                className="proj-newform"
                action={createForm}
                onSubmit={(e) => {
                  const v = (e.currentTarget.elements.namedItem('name') as HTMLInputElement).value.trim();
                  if (!v) e.preventDefault();
                  setFormFor(null);
                }}
              >
                <input type="hidden" name="project_id" value={p.id} />
                <input autoFocus name="name" placeholder="Form name" className="inline-input" maxLength={80} />
              </form>
            ) : (
              <button type="button" className="nav-add" onClick={() => setFormFor(p.id)}>
                + New form
              </button>
            )}
          </div>

          {confirmDel === p.id ? (
            <div className="proj-confirm">
              <span className="muted">Delete project and its forms?</span>
              <div className="proj-confirm-btns">
                <form action={deleteProject}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="link-danger" type="submit">Yes, delete</button>
                </form>
                <button className="link-plain" type="button" onClick={() => setConfirmDel(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            p.id !== 'general' && (
              <div className="proj-tools">
                <button className="link-plain" type="button" onClick={() => setRenaming(p.id)}>Rename</button>
                <span className="muted">·</span>
                <button className="link-plain" type="button" onClick={() => setConfirmDel(p.id)}>Delete</button>
              </div>
            )
          )}
        </div>
      ))}

      {addingProject ? (
        <form
          className="proj-new"
          action={createProject}
          onSubmit={(e) => {
            const v = (e.currentTarget.elements.namedItem('name') as HTMLInputElement).value.trim();
            if (!v) e.preventDefault();
            setAddingProject(false);
          }}
        >
          <input autoFocus name="name" placeholder="Project name" className="inline-input" maxLength={80} />
        </form>
      ) : (
        <button type="button" className="nav-add-project" onClick={() => setAddingProject(true)}>
          + Add project
        </button>
      )}
    </aside>
  );

  function activeFormIn(p: ProjectLite): boolean {
    return p.forms.some((f) => f.id === activeId);
  }
}
