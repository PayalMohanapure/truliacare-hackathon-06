const FAQS = [
  { q: "How fast will my request be handled?", a: "Every category has a fixed SLA — Life Support and Oxygen Supply are 5 minutes, Cold Chain and ER Power are 10 minutes, IT/Network is 60 minutes, and Facilities/HVAC is 120 minutes. If a ticket runs past its SLA it escalates automatically." },
  { q: "What happens when a ticket escalates?", a: "The ticket status flips to Escalated, it's routed to the on-call owner for that category, and the event is recorded on the ticket's activity timeline." },
  { q: "Can I change the priority after submitting?", a: "Priority is set at intake based on severity. If the situation changes, raise a note in the description or contact the on-call team directly for critical categories." },
  { q: "Who do I contact for a Life Support or Oxygen emergency?", a: "Biomedical On-Call — Suresh Kumar. For ER Power issues, contact Electrical On-Call — Farah Sheikh." },
];

export default function HelpCenter({ portal }) {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Help Center</h1>
        <p className="text-sm text-slate-500">
          {portal === "employee"
            ? "Guidance for raising and tracking maintenance requests."
            : "Guidance for dispatch, escalation, and SLA policy."}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
        {FAQS.map((f) => (
          <div key={f.q} className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">{f.q}</h2>
            <p className="text-sm text-slate-600 mt-1">{f.a}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-900">Still stuck?</h2>
        <p className="text-sm text-slate-600 mt-1">
          Facility Admin — Vikram Nair · Biomedical On-Call — Suresh Kumar · Electrical On-Call — Farah Sheikh
        </p>
      </div>
    </div>
  );
}
