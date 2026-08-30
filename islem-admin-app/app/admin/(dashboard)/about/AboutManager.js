"use client";

import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { updateAbout } from "@/app/lib/actions/about";

const defaults = {
  name: "", short_bio: "", long_bio: "", profile_photo_url: "",
  areas_of_work: [], achievements: [], festivals: [], publications: [],
  collaborations: [], social_links: [], contact_email: "", contact_phone: "",
};

export default function AboutManager({ initialAbout }) {
  const [fields, setFields] = useState({ ...defaults, ...initialAbout });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(initialAbout?.profile_photo_url || null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function set(key, value) { setFields((f) => ({ ...f, [key]: value })); setSaved(false); }

  function onPhotoChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      let profile_photo_url = fields.profile_photo_url;
      if (photoFile) {
        const supabase = createClient();
        const path = `profile/${Date.now()}.${photoFile.name.split(".").pop()}`;
        const { error: upErr } = await supabase.storage.from("about").upload(path, photoFile);
        if (upErr) throw upErr;
        profile_photo_url = supabase.storage.from("about").getPublicUrl(path).data.publicUrl;
      }
      await updateAbout({ ...fields, profile_photo_url });
      setSaved(true);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="a-panel" onSubmit={onSubmit} style={{ maxWidth: 680 }}>
      <div className="a-field">
        <label>Profile photograph</label>
        <input type="file" accept="image/*" onChange={onPhotoChange} />
        {photoPreview && <img src={photoPreview} alt="" style={{ marginTop: 8, width: 120, height: 120, objectFit: "cover", borderRadius: "50%" }} />}
      </div>

      <div className="a-field"><label>Name</label>
        <input value={fields.name} onChange={(e) => set("name", e.target.value)} /></div>

      <div className="a-field"><label>Short biography</label>
        <textarea value={fields.short_bio} onChange={(e) => set("short_bio", e.target.value)} /></div>

      <div className="a-field"><label>Longer biography</label>
        <textarea style={{ minHeight: 140 }} value={fields.long_bio} onChange={(e) => set("long_bio", e.target.value)} /></div>

      <ListEditor label="Areas of work" items={fields.areas_of_work} onChange={(v) => set("areas_of_work", v)} placeholder="e.g. Documentary photography" />
      <ListEditor label="Achievements" items={fields.achievements} onChange={(v) => set("achievements", v)} placeholder="e.g. World Press Photo, 2023" />
      <ListEditor label="Festivals / exhibitions" items={fields.festivals} onChange={(v) => set("festivals", v)} placeholder="e.g. Visa pour l'Image, 2022" />
      <ListEditor label="Publications" items={fields.publications} onChange={(v) => set("publications", v)} placeholder="e.g. National Geographic, March 2024" />
      <ListEditor label="Collaborations" items={fields.collaborations} onChange={(v) => set("collaborations", v)} placeholder="e.g. WWF Mediterranean campaign" />

      <SocialLinksEditor items={fields.social_links} onChange={(v) => set("social_links", v)} />

      <div className="a-form-grid">
        <div className="a-field"><label>Contact email</label>
          <input type="email" value={fields.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} /></div>
        <div className="a-field"><label>Contact phone</label>
          <input value={fields.contact_phone || ""} onChange={(e) => set("contact_phone", e.target.value)} /></div>
      </div>

      {error && <p style={{ color: "var(--a-danger)", fontSize: 13.5 }}>{error}</p>}
      <div className="a-row">
        <button className="a-btn primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        {saved && <span style={{ color: "var(--a-dim)", fontSize: 13 }}>Saved.</span>}
      </div>
    </form>
  );
}

function ListEditor({ label, items, onChange, placeholder }) {
  function updateAt(i, value) {
    const next = [...items]; next[i] = value; onChange(next);
  }
  function removeAt(i) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() { onChange([...items, ""]); }

  return (
    <div className="a-field a-list-editor">
      <label>{label}</label>
      {items.map((val, i) => (
        <div className="a-list-row" key={i}>
          <input value={val} placeholder={placeholder} onChange={(e) => updateAt(i, e.target.value)} />
          <button type="button" className="a-btn small danger" onClick={() => removeAt(i)}>Remove</button>
        </div>
      ))}
      <button type="button" className="a-btn small" onClick={add}>+ Add</button>
    </div>
  );
}

function SocialLinksEditor({ items, onChange }) {
  function updateAt(i, key, value) {
    const next = [...items]; next[i] = { ...next[i], [key]: value }; onChange(next);
  }
  function removeAt(i) { onChange(items.filter((_, idx) => idx !== i)); }
  function add() { onChange([...items, { label: "", url: "" }]); }

  return (
    <div className="a-field a-list-editor">
      <label>Social links</label>
      {items.map((link, i) => (
        <div className="a-list-row" key={i}>
          <input placeholder="Label (e.g. Instagram)" value={link.label || ""} onChange={(e) => updateAt(i, "label", e.target.value)} />
          <input placeholder="URL" value={link.url || ""} onChange={(e) => updateAt(i, "url", e.target.value)} />
          <button type="button" className="a-btn small danger" onClick={() => removeAt(i)}>Remove</button>
        </div>
      ))}
      <button type="button" className="a-btn small" onClick={add}>+ Add link</button>
    </div>
  );
}
