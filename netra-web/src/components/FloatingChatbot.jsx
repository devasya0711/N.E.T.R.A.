import { useState, useRef, useEffect } from "react";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Fallback chain — try multiple models in order (current free-tier models as of March 2026)
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
];

function getUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
}

const SYSTEM_PROMPT = `You are N.E.T.R.A. AI Assistant — an intelligent copilot embedded in the N.E.T.R.A. (Networked Edge Tracking for Road Anomalies) platform.
Your job is to help government administrators and citizens understand road-safety data, pothole reports, AI detections, repair workflows, and predictive maintenance insights.
Keep answers concise (2-4 sentences max unless asked for detail). Be professional, helpful, and reference N.E.T.R.A. features when relevant.
If the user asks something unrelated to road infrastructure or the platform, politely redirect them.`;

export default function FloatingChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hello! I'm the N.E.T.R.A. AI Assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: "user", text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      // Build Gemini conversation history
      const contents = [
        { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
        { role: "model", parts: [{ text: "Understood. I am the N.E.T.R.A. AI Assistant." }] },
        ...next.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.text }],
        })),
      ];

      let reply = null;

      // Try each model in order until one succeeds
      for (const model of MODELS) {
        try {
          const res = await fetch(getUrl(model), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents }),
          });

          if (res.ok) {
            const data = await res.json();
            reply = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
            if (reply) {
              console.log(`Gemini reply via ${model}`);
              break;
            }
          } else {
            const errBody = await res.text();
            console.warn(`Model ${model} failed (${res.status}):`, errBody);
          }
        } catch (fetchErr) {
          console.warn(`Model ${model} fetch error:`, fetchErr);
        }
      }

      if (reply) {
        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      } else {
        throw new Error("All models exhausted");
      }
    } catch (err) {
      console.error("Gemini chatbot error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Apologies — I encountered an error connecting to the AI service. Please check your Gemini API key or try again later." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Chat Window ─────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-[9999] w-[380px] max-h-[520px] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-slate-200"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-700 to-blue-600 px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <BotIcon />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white leading-tight">N.E.T.R.A. AI Assistant</h4>
              <p className="text-[10px] text-indigo-100 font-medium">Powered by Google Gemini</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 space-y-3" style={{ maxHeight: 360 }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-br-md"
                      : "bg-white text-slate-700 border border-slate-200 rounded-bl-md"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2 px-3 py-3 bg-white border-t border-slate-200"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about potholes, reports, analytics…"
              className="flex-1 bg-slate-100 border-0 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-center shrink-0 hover:shadow-md disabled:opacity-40 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* ── Floating Action Button ──────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          open
            ? "bg-slate-700 hover:bg-slate-800 rotate-0"
            : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-xl hover:scale-105"
        }`}
        aria-label="Toggle AI Chatbot"
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <BotIcon />
        )}
        {/* Pulse ring when closed */}
        {!open && (
          <span className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-20" />
        )}
      </button>
    </>
  );
}

function BotIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}
