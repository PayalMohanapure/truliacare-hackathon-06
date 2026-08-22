export default function UserSwitcher({ employees, value, onChange }) {
  return (
    <select
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none bg-white"
      value={value ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {employees.map((e) => (
        <option key={e.id} value={e.id}>
          {e.name} · {e.role} · {e.department}
        </option>
      ))}
    </select>
  );
}
