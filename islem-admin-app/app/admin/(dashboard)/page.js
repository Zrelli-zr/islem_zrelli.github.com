import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const supabase = createClient();

  const [
    { count: totalPhotos },
    { count: totalProjects },
    { data: statRows },
    { data: mostLiked },
    { data: mostShared },
    { data: recent },
  ] = await Promise.all([
    supabase.from("photos").select("*", { count: "exact", head: true }),
    supabase.from("projects").select("*", { count: "exact", head: true }),
    supabase.from("photos").select("likes, shares"),
    supabase.from("photos").select("id, title, likes, thumb_url").order("likes", { ascending: false }).limit(5),
    supabase.from("photos").select("id, title, shares, thumb_url").order("shares", { ascending: false }).limit(5),
    supabase.from("photos").select("id, title, created_at, published").order("created_at", { ascending: false }).limit(8),
  ]);

  const totalLikes = (statRows || []).reduce((sum, p) => sum + (p.likes || 0), 0);
  const totalShares = (statRows || []).reduce((sum, p) => sum + (p.shares || 0), 0);

  return (
    <>
      <h1>Overview</h1>

      <div className="a-grid-stats">
        <Stat label="Photographs" value={totalPhotos ?? 0} />
        <Stat label="Total likes" value={totalLikes} />
        <Stat label="Total shares" value={totalShares} />
        <Stat label="Projects" value={totalProjects ?? 0} />
      </div>

      <div className="a-form-grid" style={{ gap: 16, marginBottom: 24 }}>
        <RankedList title="Most-liked photographs" items={mostLiked} field="likes" />
        <RankedList title="Most-shared photographs" items={mostShared} field="shares" />
      </div>

      <div className="a-panel">
        <h2 style={{ fontSize: 15, margin: "0 0 12px" }}>Recently uploaded</h2>
        {!recent?.length && <p className="a-empty">No photographs yet.</p>}
        {!!recent?.length && (
          <table className="a-table">
            <thead>
              <tr><th>Title</th><th>Status</th><th>Uploaded</th></tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.id}>
                  <td>{p.title || "Untitled"}</td>
                  <td><span className={`a-badge ${p.published ? "on" : "off"}`}>{p.published ? "Published" : "Draft"}</span></td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="a-stat">
      <div className="num">{value.toLocaleString()}</div>
      <div className="label">{label}</div>
    </div>
  );
}

function RankedList({ title, items, field }) {
  return (
    <div className="a-panel">
      <h2 style={{ fontSize: 15, margin: "0 0 12px" }}>{title}</h2>
      {!items?.length && <p className="a-empty">No data yet.</p>}
      {!!items?.length && (
        <ol style={{ margin: 0, padding: "0 0 0 18px", fontSize: 13.5 }}>
          {items.map((p) => (
            <li key={p.id} style={{ marginBottom: 8 }}>
              {p.title || "Untitled"} — <strong>{p[field].toLocaleString()}</strong>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
