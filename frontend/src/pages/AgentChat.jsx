import { useState, useRef, useEffect } from "react";
import { aiChat, aiAnalyze, createRequest } from "../api/client";

const SUGGESTIONS = [
  "ICU ventilator in bed 4 is showing low tidal volume alarm",
  "Vaccine fridge temperature drifting above 8°C",
  "Wi-Fi is down at nurse station, can't access EMR",
  "AC unit in ward 3 leaking near patient monitor",
  "ER backup generator failed auto-transfer test",
];

function Message({ msg }) {
  const isUser = msg.role === "user";
  const isSystem = msg.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{msg.content}</span>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
        isUser ? "bg-slate-900 text-white" : "bg-red-600 text-white"
      }`}>
        {isUser ? "U" : "AI"}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
        isUser ? "bg-slate-900 text-white rounded-tr-sm" : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm"
      }`}>
        {msg.content}
        {msg.ticket && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 text-slate-800">
            <div className="font-semibold text-green-700 mb-1">✅ Ticket Created</div>
            <div className="text-xs space-y-0.5">
              <div><span className="font-medium">ID:</span> #{msg.ticket.id}</div>
              <div><span className="font-medium">Title:</span> {msg.ticket.title}</div>
              <div><span className="font-medium">Category:</span> {msg.ticket.category}</div>
              <div><span className="font-medium">Priority:</span>
                <span className={`ml-1 font-bold ${
                  msg.ticket.priority === "Critical" ? "text-red-600" :
                  msg.ticket.priority === "High" ? "text-orange-500" :
                  msg.ticket.priority === "Medium" ? "text-yellow-600" : "text-slate-500"
                }`}>{msg.ticket.priority}</span>
              </div>
              <div><span className="font-medium">SLA:</span> {msg.ticket.sla_minutes} min</div>
            </div>
          </div>
        )}
        {msg.analysis && !msg.ticket && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-slate-800">
            <div className="font-semibold text-blue-700 mb-1">🤖 AI Analysis</div>
            <div className="text-xs space-y-0.5">
              <div><span className="font-medium">Category:</span> {msg.analysis.category}</div>
              <div><span className="font-medium">Priority:</span>
                <span className={`ml-1 font-bold ${
                  msg.analysis.priority === "Critical" ? "text-red-600" :
                  msg.analysis.priority === "High" ? "text-orange-500" :
                  msg.analysis.priority === "Medium" ? "text-yellow-600" : "text-slate-500"
                }`}>{msg.analysis.priority}</span>
              </div>
              <div><span className="font-medium">Reasoning:</span> {msg.analysis.reasoning}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentChat({ currentUser }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm SENTINEL-AI 🤖 Describe your maintenance issue in plain English — I'll analyze it, suggest the category and priority, and create the ticket for you automatically.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addMsg(msg) {
    setMessages((prev) => [...prev, msg]);
  }

  async function handleSend(text) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    addMsg({ role: "user", content: msg });
    setLoading(true);

    try {
      // Step 1 — analyze the description
      addMsg({ role: "system", content: "Analyzing your issue..." });
      const analysis = await aiAnalyze(msg);
      setPendingAnalysis({ ...analysis, description: msg });

      addMsg({
        role: "assistant",
        content: `I've analyzed your issue. Here's what I found — shall I create this ticket now? Reply **yes** to confirm or tell me to adjust anything.`,
        analysis,
      });
    } catch (e) {
      // fallback to general chat
      try {
        const res = await aiChat(msg);
        addMsg({ role: "assistant", content: res.reply });
      } catch {
        addMsg({ role: "assistant", content: "Sorry, I had trouble processing that. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(text) {
    const msg = text.trim().toLowerCase();
    if (!msg || loading) return;
    setInput("");
    addMsg({ role: "user", content: text.trim() });

    if ((msg === "yes" || msg === "y" || msg.includes("yes") || msg.includes("confirm") || msg.includes("create")) && pendingAnalysis) {
      setLoading(true);
      addMsg({ role: "system", content: "Creating ticket..." });
      try {
        const ticket = await createRequest({
          title: pendingAnalysis.title,
          description: pendingAnalysis.description,
          category: pendingAnalysis.category,
          priority: pendingAnalysis.priority,
        });
        setPendingAnalysis(null);
        addMsg({
          role: "assistant",
          content: `Your ticket has been created successfully! The system will monitor its SLA automatically.`,
          ticket,
        });
      } catch (e) {
        addMsg({ role: "assistant", content: `Failed to create ticket: ${e.message}` });
      } finally {
        setLoading(false);
      }
    } else if (msg.includes("no") || msg.includes("cancel")) {
      setPendingAnalysis(null);
      addMsg({ role: "assistant", content: "No problem! Describe the issue again and I'll re-analyze it." });
    } else {
      setLoading(true);
      try {
        const res = await aiChat(text.trim(), pendingAnalysis);
        addMsg({ role: "assistant", content: res.reply });
      } catch {
        addMsg({ role: "assistant", content: "Sorry, I had trouble with that." });
      } finally {
        setLoading(false);
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (pendingAnalysis) {
      handleConfirm(input);
    } else {
      handleSend(input);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 flex flex-col h-[calc(100vh-64px)]">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">🤖 SENTINEL-AI Agent</h1>
        <p className="text-sm text-slate-500">Describe your issue in plain English — AI handles category, priority, and ticket creation.</p>
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSend(s)}
              className="text-xs bg-white border border-slate-200 rounded-full px-3 py-1.5 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition"
            >
              {s.length > 50 ? s.slice(0, 50) + "…" : s}
            </button>
          ))}
        </div>
      )}

      {/* Chat window */}
      <div className="flex-1 overflow-y-auto space-y-4 bg-slate-50 rounded-2xl p-4 border border-slate-200">
        {messages.map((m, i) => <Message key={i} msg={m} />)}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold shrink-0">AI</div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-5">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
          placeholder={pendingAnalysis ? 'Type "yes" to confirm or describe changes…' : "Describe your maintenance issue…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-red-600 text-white px-5 py-3 text-sm font-semibold hover:bg-red-700 transition disabled:opacity-40"
        >
          Send
        </button>
      </form>

      {pendingAnalysis && (
        <p className="text-xs text-center text-slate-400 mt-2">
          Waiting for confirmation — type <strong>yes</strong> to create ticket or describe any changes
        </p>
      )}
    </div>
  );
}
