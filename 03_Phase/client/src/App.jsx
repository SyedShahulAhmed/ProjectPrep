import { useEffect, useRef, useState } from "react";

export default function App() {
  const [messages, setMessages] = useState([{ id: 1, role: "ai", text: "Hi — I'm Gemini-powered. Ask me anything!" }]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamCtrl, setStreamCtrl] = useState(null); // holds EventSource
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  const startStream = (userText) => {
    const userMsg = { id: Date.now(), role: "user", text: userText };
    setMessages(prev => [...prev, userMsg]);

    // add placeholder AI message we will update
    const aiId = Date.now() + 1;
    setMessages(prev => [...prev, { id: aiId, role: "ai", text: "" }]);

    setLoading(true);

    // Build URL with encoded message as query param for GET SSE endpoint
    const url = `http://localhost:4000/api/ai/stream?message=${encodeURIComponent(userText)}`;

    const es = new EventSource(url);

    setStreamCtrl(es); // allow stop

    let accumulated = "";

    es.onmessage = (ev) => {
      // ev.data contains JSON we sent from server
      let payload = null;
      try { payload = JSON.parse(ev.data); } catch(e) { payload = { type: "chunk", text: ev.data }; }

      if (payload.type === "chunk") {
        accumulated += payload.text;
        // update last AI message
        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: accumulated } : m));
      } else if (payload.type === "meta") {
        // ignore or show small metadata
      } else if (payload.type === "done") {
        es.close();
        setStreamCtrl(null);
        setLoading(false);
      } else if (payload.type === "error") {
        es.close();
        setStreamCtrl(null);
        setLoading(false);
        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: "⚠️ Error from AI: " + (payload.message || "unknown") } : m));
      } else if (payload.type === "meta-chunk") {
        // optional handling
      }
    };

    es.onerror = (err) => {
      console.error("SSE error", err);
      es.close();
      setStreamCtrl(null);
      setLoading(false);
      // fallback: call non-stream endpoint
      fetchFallback(userText, aiId);
    };
  };

  const fetchFallback = async (userText, aiId) => {
    try {
      const res = await fetch("http://localhost:4000/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: data.reply || "No reply" } : m));
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: "Error reaching AI" } : m));
    } finally {
      setLoading(false);
    }
  };

  const stopStream = () => {
    if (streamCtrl) {
      streamCtrl.close();
      setStreamCtrl(null);
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    startStream(text.trim());
    setText("");
  };
    const handleKeyDown = (e) => {
    // If Enter pressed without Shift, send; Shift+Enter -> newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // prevent newline
      if (!loading) startStream(text.trim());
      setText("")
    }
  };

  return (
    <div className="max-w-2xl mx-auto h-screen flex flex-col p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-white">AI</div>
        <h1 className="text-lg font-semibold">Gemini Chat</h1>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto bg-gray-900 rounded-lg p-4 space-y-3">
        {messages.map(m => (
          <div key={m.id} className={`max-w-xs px-3 py-2 rounded-lg text-sm ${m.role === "user" ? "ml-auto bg-blue-500 text-white" : "mr-auto bg-gray-700 text-gray-100"}`}>
            {m.text || (m.role === "ai" && <span className="text-gray-400">…</span>)}
          </div>
        ))}
        {loading && <div className="text-gray-400 text-sm">Streaming…</div>}
      </div>

      <form onSubmit={onSubmit} className="mt-4 flex gap-2">
        <textarea
          className="flex-1 p-2 rounded-lg border border-gray-600 bg-gray-800 text-white resize-none"
          rows={1}
          placeholder="Type a message... (Enter to send)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 disabled:opacity-50">{loading ? "…" : "Send"}</button>
        <button type="button" onClick={stopStream} disabled={!loading} className="px-3 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50">Stop</button>
      </form>
    </div>
  );
}
