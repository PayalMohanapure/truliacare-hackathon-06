import { useState } from "react";
import { CATEGORIES, PRIORITIES } from "../constants";
import { createRequest } from "../api/client";

const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm " +
  "focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none w-full";

export default function NewRequestForm({ onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [priority, setPriority] = useState("Medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selected = CATEGORIES.find((c) => c.value === category);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await createRequest({ title: title.trim(), description, category, priority });
      setTitle("");
      setDescription("");
      setPriority("Medium");
      onCreated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Raise a maintenance request</h2>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="e.g. ICU Bed 4 ventilator alarm — low tidal volume"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
        <textarea
          className={inputClass}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional details"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
          <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
          <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {selected && (
        <p className={`text-xs font-medium ${selected.tier === "critical" ? "text-red-700" : "text-slate-500"}`}>
          {selected.label} → escalates in {selected.sla} minutes
        </p>
      )}

      {error && <p className="text-xs font-medium text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40 transition"
      >
        {submitting ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
