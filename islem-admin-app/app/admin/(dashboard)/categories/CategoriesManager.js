"use client";

import { useState } from "react";
import { createCategory, renameCategory, deleteCategory, reorderCategories } from "@/app/lib/actions/categories";

export default function CategoriesManager({ initialCategories }) {
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  async function onAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    await createCategory(newName.trim());
    setCategories((prev) => [...prev, { id: crypto.randomUUID(), name: newName.trim(), sort_order: prev.length }]);
    setNewName("");
  }

  async function onRename(id) {
    if (!editValue.trim()) return;
    await renameCategory(id, editValue.trim());
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: editValue.trim() } : c)));
    setEditingId(null);
  }

  async function onDelete(id) {
    if (!confirm("Delete this category? Photographs in it will become uncategorized.")) return;
    await deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  function move(index, dir) {
    const next = [...categories];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(next);
    reorderCategories(next.map((c) => c.id));
  }

  return (
    <>
      <form className="a-panel a-row" style={{ marginBottom: 18, maxWidth: 480 }} onSubmit={onAdd}>
        <input
          placeholder="New category name (e.g. Gabès)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ flex: 1, border: "1px solid var(--a-line)", borderRadius: 6, padding: "9px 10px" }}
        />
        <button className="a-btn primary" type="submit">Add</button>
      </form>

      {!categories.length && <p className="a-empty">No categories yet.</p>}

      {!!categories.length && (
        <table className="a-table" style={{ maxWidth: 560 }}>
          <tbody>
            {categories.map((c, i) => (
              <tr key={c.id}>
                <td style={{ width: 70 }}>
                  <div className="a-row">
                    <button className="a-btn small" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                    <button className="a-btn small" onClick={() => move(i, 1)} disabled={i === categories.length - 1}>↓</button>
                  </div>
                </td>
                <td>
                  {editingId === c.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => onRename(c.id)}
                      onKeyDown={(e) => e.key === "Enter" && onRename(c.id)}
                      style={{ border: "1px solid var(--a-line)", borderRadius: 6, padding: "6px 8px" }}
                    />
                  ) : (
                    c.name
                  )}
                </td>
                <td style={{ width: 140 }}>
                  <div className="a-row">
                    <button className="a-btn small" onClick={() => { setEditingId(c.id); setEditValue(c.name); }}>Rename</button>
                    <button className="a-btn small danger" onClick={() => onDelete(c.id)}>Delete</button>
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
