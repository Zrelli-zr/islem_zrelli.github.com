"use client";

import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { makeThumbnail } from "@/app/lib/imageResize";
import {
  createPhoto,
  updatePhoto,
  deletePhoto,
  togglePublished,
  toggleFeatured,
  reorderPhotos,
} from "@/app/lib/actions/photos";

const emptyForm = {
  title: "",
  story: "",
  category_id: "",
  location: "",
  photo_date: "",
  alt_text: "",
  published: false,
  featured: false,
};

export default function PhotosManager({ initialPhotos, categories }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [editing, setEditing] = useState(null); // null | "new" | photo object
  const [busyId, setBusyId] = useState(null);

  function categoryName(id) {
    return categories.find((c) => c.id === id)?.name || "—";
  }

  async function handleSaved(photo, isNew) {
    setPhotos((prev) =>
      isNew ? [...prev, photo] : prev.map((p) => (p.id === photo.id ? { ...p, ...photo } : p))
    );
    setEditing(null);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this photograph? This can't be undone.")) return;
    setBusyId(id);
    await deletePhoto(id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setBusyId(null);
  }

  async function handleTogglePublished(photo) {
    setBusyId(photo.id);
    await togglePublished(photo.id, !photo.published);
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, published: !p.published } : p)));
    setBusyId(null);
  }

  async function handleToggleFeatured(photo) {
    setBusyId(photo.id);
    await toggleFeatured(photo.id, !photo.featured);
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, featured: !p.featured } : p)));
    setBusyId(null);
  }

  function move(index, dir) {
    const next = [...photos];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPhotos(next);
    reorderPhotos(next.map((p) => p.id));
  }

  function copyUrl(photo) {
    const url = `${window.location.origin}/#photo-${photo.id}`;
    navigator.clipboard.writeText(url);
    alert("Public link copied.");
  }

  if (editing) {
    return (
      <PhotoForm
        categories={categories}
        photo={editing === "new" ? null : editing}
        onCancel={() => setEditing(null)}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <>
      <div className="a-toolbar">
        <span style={{ color: "var(--a-dim)", fontSize: 13.5 }}>{photos.length} photographs</span>
        <button className="a-btn primary" onClick={() => setEditing("new")}>+ Upload photograph</button>
      </div>

      {!photos.length && <p className="a-empty">No photographs yet — upload your first one.</p>}

      {!!photos.length && (
        <table className="a-table">
          <thead>
            <tr>
              <th></th><th>Photograph</th><th>Category</th><th>Status</th>
              <th>Likes</th><th>Shares</th><th></th>
            </tr>
          </thead>
          <tbody>
            {photos.map((p, i) => (
              <tr key={p.id}>
                <td>
                  <div className="a-row">
                    <button className="a-btn small" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">↑</button>
                    <button className="a-btn small" onClick={() => move(i, 1)} disabled={i === photos.length - 1} title="Move down">↓</button>
                  </div>
                </td>
                <td>
                  <div className="a-row">
                    <img className="a-thumb" src={p.thumb_url || p.image_url} alt="" />
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.title || "Untitled"}{p.featured && " ★"}</div>
                      <div style={{ color: "var(--a-dim)", fontSize: 12 }}>{p.location || "—"}</div>
                    </div>
                  </div>
                </td>
                <td>{categoryName(p.category_id)}</td>
                <td>
                  <span className={`a-badge ${p.published ? "on" : "off"}`}>{p.published ? "Published" : "Draft"}</span>
                </td>
                <td>{p.likes.toLocaleString()}</td>
                <td>{p.shares.toLocaleString()}</td>
                <td>
                  <div className="a-row" style={{ flexWrap: "wrap" }}>
                    <button className="a-btn small" onClick={() => setEditing(p)}>Edit</button>
                    <button className="a-btn small" onClick={() => handleTogglePublished(p)} disabled={busyId === p.id}>
                      {p.published ? "Unpublish" : "Publish"}
                    </button>
                    <button className="a-btn small" onClick={() => handleToggleFeatured(p)} disabled={busyId === p.id}>
                      {p.featured ? "Unfeature" : "Feature"}
                    </button>
                    <button className="a-btn small" onClick={() => copyUrl(p)}>Copy URL</button>
                    <a className="a-btn small" href={`/#photo-${p.id}`} target="_blank" rel="noreferrer">Preview</a>
                    <button className="a-btn small danger" onClick={() => handleDelete(p.id)} disabled={busyId === p.id}>Delete</button>
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

function PhotoForm({ photo, categories, onCancel, onSaved }) {
  const isNew = !photo;
  const [fields, setFields] = useState(photo ? { ...emptyForm, ...photo } : emptyForm);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(photo?.image_url || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key, value) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (isNew && !file) {
      setError("Please choose an image file.");
      return;
    }

    setSaving(true);
    try {
      let image_url = fields.image_url;
      let thumb_url = fields.thumb_url;

      if (file) {
        const supabase = createClient();
        const stamp = Date.now();
        const ext = file.name.split(".").pop();
        const thumbBlob = await makeThumbnail(file);

        const originalPath = `originals/${stamp}.${ext}`;
        const thumbPath = `thumbs/${stamp}.jpg`;

        const [{ error: e1 }, { error: e2 }] = await Promise.all([
          supabase.storage.from("photos").upload(originalPath, file, { upsert: false }),
          supabase.storage.from("photos").upload(thumbPath, thumbBlob, { upsert: false }),
        ]);
        if (e1) throw e1;
        if (e2) throw e2;

        image_url = supabase.storage.from("photos").getPublicUrl(originalPath).data.publicUrl;
        thumb_url = supabase.storage.from("photos").getPublicUrl(thumbPath).data.publicUrl;
      }

      const payload = { ...fields, image_url, thumb_url, category_id: fields.category_id || null };

      if (isNew) {
        const created = await createPhoto(payload);
        onSaved(created, true);
      } else {
        await updatePhoto(photo.id, payload);
        onSaved({ ...photo, ...payload }, false);
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="a-panel" onSubmit={onSubmit} style={{ maxWidth: 640 }}>
      <h2 style={{ marginTop: 0 }}>{isNew ? "Upload photograph" : "Edit photograph"}</h2>

      <div className="a-field">
        <label>Image {isNew ? "" : "(choose a file to replace)"}</label>
        <input type="file" accept="image/*" onChange={onFileChange} />
        {preview && <img src={preview} alt="" style={{ marginTop: 8, maxWidth: 200, borderRadius: 6 }} />}
      </div>

      <div className="a-form-grid">
        <div className="a-field">
          <label>Title</label>
          <input value={fields.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="a-field">
          <label>Category</label>
          <select value={fields.category_id || ""} onChange={(e) => set("category_id", e.target.value)}>
            <option value="">— None —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="a-field">
        <label>Story / caption</label>
        <textarea value={fields.story} onChange={(e) => set("story", e.target.value)} />
      </div>

      <div className="a-form-grid">
        <div className="a-field">
          <label>Location</label>
          <input value={fields.location || ""} onChange={(e) => set("location", e.target.value)} />
        </div>
        <div className="a-field">
          <label>Date</label>
          <input type="date" value={fields.photo_date || ""} onChange={(e) => set("photo_date", e.target.value)} />
        </div>
      </div>

      <div className="a-field">
        <label>Alt text (for accessibility)</label>
        <input value={fields.alt_text} onChange={(e) => set("alt_text", e.target.value)} />
      </div>

      <div className="a-checkbox-row">
        <label><input type="checkbox" checked={!!fields.published} onChange={(e) => set("published", e.target.checked)} /> Published</label>
        <label><input type="checkbox" checked={!!fields.featured} onChange={(e) => set("featured", e.target.checked)} /> Featured</label>
      </div>

      {error && <p style={{ color: "var(--a-danger)", fontSize: 13.5 }}>{error}</p>}

      <div className="a-row">
        <button className="a-btn primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button className="a-btn" type="button" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}
