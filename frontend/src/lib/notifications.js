// Derives a notification feed from live request/escalation data — there is
// no dedicated notifications endpoint, so this recomputes on every fetch.
export function buildNotifications(requests, escalations, currentUser) {
  const items = [];

  for (const e of escalations.slice(0, 6)) {
    items.push({
      id: `esc-${e.id}`,
      tone: "critical",
      icon: "🔴",
      text: `Ticket #${e.request_id} — ${e.request_title} breached its SLA.`,
      created_at: e.created_at,
    });
  }

  for (const r of requests) {
    if (r.status === "Resolved") {
      items.push({
        id: `res-${r.id}`,
        tone: "resolved",
        icon: "🟢",
        text: `#${r.id} — ${r.title} has been resolved.`,
        created_at: r.updated_at,
      });
    } else if (!r.is_breached && r.minutes_remaining > 0 && r.minutes_remaining <= 5) {
      items.push({
        id: `warn-${r.id}`,
        tone: "warning",
        icon: "🟠",
        text: `Ticket #${r.id} has ${r.minutes_remaining} minute${r.minutes_remaining === 1 ? "" : "s"} remaining.`,
        created_at: r.updated_at,
      });
    }
    if (currentUser && r.assigned_to === currentUser.id) {
      items.push({
        id: `asn-${r.id}`,
        tone: "info",
        icon: "🔵",
        text: `You have been assigned #${r.id} — ${r.title}.`,
        created_at: r.updated_at,
      });
    }
  }

  return items
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 12);
}
