"use client";

import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  createProject,
  updateProject,
  deleteProject,
  togglePublishedProject,
  reorderProjects,
  setProjectGallery,
} from "@/app/lib/actions/projects";

const emptyForm = {
  title: "", description: "", year: "", location: "", role: "",
  video_url: "", credits: "", published: false,
};

export default function ProjectsManager({ initialProjects, allPhotos, initialGalleries }) {
  const [projects, setProjects] = useState(initialProjects);
  const [galleries, setGalleries] = useState(initialGalleries); // [{project_id, photo_id}]
  const [editing, setEditing] = useState(null); // null | "new" | project

  function galleryFor(projectId) {
    return galleries.filter((g) => g.project_id === projectId).map((g) => g.photo_id);
  }

  async function handleSaved(project, isNew, galleryPhotoIds) {
    setProjects((prev) => (isNew ? [...prev, project] : prev.map((p) => (p.id === project.id ? { ...p, ...project } : p))));
    setGalleries((prev) => [
      ...prev.filter((g) => g.project_id !== project.id),
      ...galleryPhotoIds.map((photo_id) => ({ project_id: project.id, photo_id })),
    ]);
    setEditing(null);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this project?")) return;
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleTogglePublished(project) {
    await togglePublishedProject(project.id, !project.published);
    setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, published: !p.published } : p)));
  }

  function move(index, dir) {
    const next = [...projects];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setProjects(next);
    reorderProjects(next.map((p) => p.id));
  }

  if (editing) {
    return (
      <ProjectForm
        project={editing === "new" ? null : editing}
        allPhotos={allPhotos}
        initialGalleryIds={editing === "new" ? [] : galleryFor(editing.id)}
        onCancel={() => setEditing(null)}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <>
      <div className="a-toolbar">
        <span style={{ color: "var(--a-dim)", fontSize: 13.5 }}>{projects.length} projects</span>
        <button className="a-btn primary" onClick={() => setEditing("new")}>+ New project</button>
      </div>

      {!projects.length && <p className="a-empty">No projects yet.</p>}

      {!!projects.length && (
        <table className="a-table">
          <thead><tr><th></th><th>Project</th><th>Year</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {projects.map((p, i) => (
              <tr key={p.id}>
                <td>
                  <div className="a-row">
                    <button className="a-btn small" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                    <button className="a-btn small" onClick={() => move(i, 1)} disabled={i === projects.length - 1}>↓</button>
                  </div>
                </td>
                <td>
                  <div className="a-row">
                    {p.cover_url && <img className="a-thumb" src={p.cover_url} alt="" />}
                    <div style={{ fontWeight: 600 }}>{p.title}</div>
                  </div>
                </td>
                <td>{p.year || "—"}</td>
                <td><span className={`a-badge ${p.published ? "on" : "off"}`}>{p.published ? "Published" : "Draft"}</span></td>
                <td>
                  <div className="a-row">
                    <button className="a-btn small" onClick={() => setEditing(p)}>Edit</button>
                    <button className="a-btn small" onClick={() => handleTogglePublished(p)}>{p.published ? "Unpublish" : "Publish"}</button>
                    <button className="a-btn small danger" onClick={() => handleDelete(p.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function ProjectForm({ project, allPhotos, initialGalleryIds, onCancel, onSaved }) {
  const isNew = !project;
  const [fields, setFields] = useState(project ? { ...emptyForm, ...project } : emptyForm);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(project?.cover_url || null);
  const [galleryIds, setGalleryIds] = useState(initialGalleryIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key, value) { setFields((f) => ({ ...f, [key]: value })); }

  function toggleGalleryPhoto(id) {
    setGalleryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function onCoverChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      let cover_url = fields.cover_url;
      if (coverFile) {
        const supabase = createClient();
        const path = `covers/${Date.now()}.${coverFile.name.split(".").pop()}`;
        const { error: upErr } = await supabase.storage.from("covers").upload(path, coverFile);
        if (upErr) throw upErr;
        cover_url = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
      }

      const payload = { ...fields, cover_url };
      let saved;
      if (isNew) {
        saved = await createProject(payload);
      } else {
        await updateProject(project.id, payload);
        saved = { ...project, ...payload };
      }
      await setProjectGallery(saved.id, galleryIds);
      onSaved(saved, isNew, galleryIds);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="a-panel" onSubmit={onSubmit} style={{ maxWidth: 680 }}>
      <h2 style={{ marginTop: 0 }}>{isNew ? "New project" : "Edit project"}</h2>

      <div className="a-field">
        <label>Cover image</label>
        <input type="file" accept="image/*" onChange={onCoverChange} />
        {coverPreview && <img src={coverPreview} alt="" style={{ marginTop: 8, maxWidth: 220, borderRadius: 6 }} />}
      </div>

      <div className="a-field"><label>Title</label>
        <input value={fields.title} onChange={(e) => set("title", e.target.value)} required />
      </div>
      <div className="a-field"><label>Description</label>
        <textarea value={fields.description} onChange={(e) => set("description", e.target.value)} />
      </div>

      <div className="a-form-grid">
        <div className="a-field"><label>Year</label>
          <input value={fields.year || ""} onChange={(e) => set("year", e.target.value)} /></div>
        <div className="a-field"><label>Location</label>
          <input value={fields.location || ""} onChange={(e) => set("location", e.target.value)} /></div>
        <div className="a-field"><label>Role</label>
          <input value={fields.role || ""} onChange={(e) => set("role", e.target.value)} /></div>
        <div className="a-field"><label>Video / trailer link</label>
          <input value={fields.video_url || ""} onChange={(e) => set("video_url", e.target.value)} /></div>
      </div>

      <div className="a-field"><label>Credits</label>
        <textarea value={fields.credits || ""} onChange={(e) => set("credits", e.target.value)} />
      </div>

      <div className="a-checkbox-row">
        <label><input type="checkbox" checked={!!fields.published} onChange={(e) => set("published", e.target.checked)} /> Published</label>
      </div>

      <div className="a-field">
        <label>Gallery — select photographs for this project</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px,1fr))", gap: 8, maxHeight: 260, overflowY: "auto", padding: 4 }}>
          {allPhotos.map((p) => {
            const selected = galleryIds.includes(p.id);
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => toggleGalleryPhoto(p.id)}
                style={{
                  padding: 0, border: selected ? "3px solid var(--a-ink)" : "1px solid var(--a-line)",
                  borderRadius: 6, overflow: "hidden", cursor: "pointer", background: "none",
                }}
                title={p.title}
              >
                <img src={p.thumb_url || p.image_url} alt="" style={{ width: "100%", height: 60, objectFit: "cover", display: "block" }} />
              </button>
            );
          })}
        </div>
        {!allPhotos.length && <p style={{ fontSize: 12.5, color: "var(--a-dim)" }}>Upload photographs first, then attach them here.</p>}
      </div>

      {error && <p style={{ color: "var(--a-danger)", fontSize: 13.5 }}>{error}</p>}

      <div className="a-row">
        <button className="a-btn primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button className="a-btn" type="button" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}
