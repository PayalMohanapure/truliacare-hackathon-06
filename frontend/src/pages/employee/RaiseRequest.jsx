import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES, PRIORITIES, DEPARTMENTS, FLOORS, EQUIPMENT_SUGGESTIONS } from "../../constants";
import { createRequest } from "../../api/client";

const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm w-full " +
  "focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none bg-white";

const PRIORITY_STYLE = {
  Low:      { ring: "ring-emerald-300", active: "border-emerald-500 bg-emerald-50", dot: "bg-emerald-500" },
  Medium:   { ring: "ring-amber-300",   active: "border-amber-500 bg-amber-50",     dot: "bg-amber-500" },
  High:     { ring: "ring-orange-300",  active: "border-orange-500 bg-orange-50",   dot: "bg-orange-500" },
  Critical: { ring: "ring-red-300",     active: "border-red-600 bg-red-50",         dot: "bg-red-600" },
};

export default function RaiseRequest() {
  const navigate = useNavigate();
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [floor, setFloor] = useState(FLOORS[0]);
  const [room, setRoom] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [equipmentQuery, setEquipmentQuery] = useState("");
  const [equipment, setEquipment] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedCategory = CATEGORIES.find((c) => c.value === category);
  const equipmentMatches = equipmentQuery.trim()
    ? EQUIPMENT_SUGGESTIONS.filter((e) => e.toLowerCase().includes(equipmentQuery.trim().toLowerCase())).slice(0, 5)
    : [];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setError("Please describe the issue in a short title."); return; }
    setSubmitting(true);
    setError("");

    const contextLines = [`Location: ${department} · ${floor}${room ? ` · ${room}` : ""}`];
    if (equipment) contextLines.push(`Asset: ${equipment}`);
    const fullDescription = [contextLines.join("\n"), description.trim()].filter(Boolean).join("\n\n");

    try {
      const created = await createRequest({ title: title.trim(), description: fullDescription, category, priority });
      navigate("/employee/success", { state: { ticket: created } });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900">Raise Maintenance Request</h1>
      <p className="text-sm text-slate-500 mt-1">Submit a new issue for the facilities or clinical engineering team.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-8">
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">1. Location Details</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Department / Unit</label>
              <select className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value)}>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Floor / Wing</label>
              <select className={inputClass} value={floor} onChange={(e) => setFloor(e.target.value)}>
                {FLOORS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Room / Bed Number</label>
              <input className={inputClass} value={room} onChange={(e) => setRoom(e.target.value)} placeholder="ICU-204" />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">2. Issue Category</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`text-left rounded-lg border-2 p-3 transition ${
                  category === c.value ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-sm font-semibold text-slate-900">{c.label}</div>
                <div className={`text-xs mt-1 font-medium ${c.tier === "critical" ? "text-red-700" : "text-slate-500"}`}>
                  SLA {c.sla} min
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">3. Equipment Search <span className="font-normal text-slate-400">(optional)</span></h2>
          <div className="relative">
            <input
              className={inputClass}
              value={equipment ?? equipmentQuery}
              onChange={(e) => { setEquipment(null); setEquipmentQuery(e.target.value); }}
              placeholder="Search by Asset ID or Name"
            />
            {equipmentMatches.length > 0 && !equipment && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
                {equipmentMatches.map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => { setEquipment(m); setEquipmentQuery(""); }}
                    className="block w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">4. Issue Details</h2>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Short title, e.g. ICU Bed 4 ventilator alarm — low tidal volume"
          />
          <textarea
            className={inputClass}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail. What is happening? When did it start?"
          />
        </section>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">5. Priority</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRIORITIES.map((p) => {
              const s = PRIORITY_STYLE[p];
              const active = priority === p;
              return (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`rounded-lg border-2 p-3 text-center transition ${active ? s.active : "border-slate-200 hover:border-slate-300"}`}
                >
                  <span className={`inline-block h-2 w-2 rounded-full mb-1 ${s.dot}`} />
                  <div className="text-sm font-semibold text-slate-900">{p}</div>
                  {p === "Critical" && <div className="text-[11px] text-red-700 font-medium mt-0.5">Immediate attention</div>}
                </button>
              );
            })}
          </div>
          {selectedCategory && (
            <p className={`text-xs font-medium ${selectedCategory.tier === "critical" ? "text-red-700" : "text-slate-500"}`}>
              {selectedCategory.label} tickets escalate automatically after {selectedCategory.sla} minutes without resolution.
            </p>
          )}
        </section>

        {error && <p className="text-sm font-medium text-red-700">{error}</p>}

        <section className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40 transition"
          >
            {submitting ? "Submitting…" : "Submit Maintenance Request →"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/employee")}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
        </section>
      </form>
    </div>
  );
}
