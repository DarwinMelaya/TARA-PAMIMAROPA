import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  HiPaperAirplane,
  HiSparkles,
  HiXMark,
  HiArrowPath,
} from "react-icons/hi2";
import type { TaraProject } from '@/constants/taraProjects';
import { buildLiveInsights } from '@/constants/taraProjects';
import {
  CHAT_QUICK_PROMPTS,
  buildAssistantReply,
  buildUserMessage,
  createWelcomeMessage,
  type ChatMessage,
} from "./analyticsChatEngine";
import { useTheme } from '@/theme/ThemeProvider';

type AnalyticsChatBotProps = {
  open: boolean;
  onClose: () => void;
  projects: TaraProject[];
  className?: string;
  /** Compact sheet mode (mobile) vs floating dock */
  variant?: "dock" | "sheet";
};

const AnalyticsChatBot = ({
  open,
  onClose,
  projects,
  className = "",
  variant = "dock",
}: AnalyticsChatBotProps) => {
  const { theme } = useTheme();
  const light = theme === "light";
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createWelcomeMessage(projects.length),
  ]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [insightIndex, setInsightIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  const projectCount = projects.length;

  const tips = useMemo(() => CHAT_QUICK_PROMPTS, []);
  const insights = useMemo(() => buildLiveInsights(projects), [projects]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages, typing, open]);

  const pushAnswer = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || typing) return;

    const userMsg = buildUserMessage(trimmed);
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setTyping(true);

    window.setTimeout(() => {
      const reply = buildAssistantReply(trimmed, projectsRef.current);
      setMessages((prev) => [...prev, reply]);
      setTyping(false);
    }, 380 + Math.min(700, trimmed.length * 8));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    pushAnswer(draft);
  };

  const resetChat = () => {
    setMessages([createWelcomeMessage(projectsRef.current.length)]);
    setDraft("");
    setTyping(false);
  };

  if (!open) return null;

  const shellClass =
    variant === "sheet"
      ? light
        ? "flex h-full max-h-[min(58vh,480px)] w-full flex-col overflow-hidden rounded-2xl border border-violet-300/50 bg-white shadow-sm"
        : "flex h-full max-h-[min(58vh,480px)] w-full flex-col overflow-hidden rounded-2xl border border-violet-400/35 bg-slate-900/96 shadow-[0_8px_48px_rgba(0,0,0,0.55),0_0_28px_rgba(167,139,250,0.15)] backdrop-blur-xl"
      : light
        ? "pointer-events-auto flex h-[min(520px,62vh)] w-full max-w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-violet-300/50 bg-white shadow-lg"
        : "pointer-events-auto flex h-[min(520px,62vh)] w-full max-w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-violet-400/35 bg-slate-900/96 shadow-[0_8px_48px_rgba(0,0,0,0.55),0_0_28px_rgba(167,139,250,0.18)] backdrop-blur-xl";

  const iconBtn = light
    ? "rounded-lg border border-slate-300 p-1.5 text-slate-500 hover:text-slate-900"
    : "rounded-lg border border-slate-700/80 p-1.5 text-slate-400 hover:text-white";

  return (
    <div className={[shellClass, className].join(" ")} role="dialog" aria-label="AI analytics chat">
      <header
        className={`flex items-start justify-between gap-2 border-b px-3 py-2.5 sm:px-4 ${
          light ? "border-violet-200" : "border-violet-900/50"
        }`}
      >
        <div className="min-w-0">
          <p
            className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] ${
              light ? "text-violet-800" : "text-violet-200"
            }`}
          >
            <HiSparkles
              className={`h-4 w-4 shrink-0 ${light ? "text-violet-600" : "text-violet-300"}`}
              aria-hidden
            />
            AI analytics chat
          </p>
          <p
            className={`mt-0.5 truncate text-[10px] ${
              light ? "text-slate-500" : "text-slate-400"
            }`}
          >
            Grounded on {projectCount} filtered map project
            {projectCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={resetChat}
            className={iconBtn}
            title="Reset chat"
          >
            <HiArrowPath className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onClose}
            className={iconBtn}
            aria-label="Close chat"
          >
            <HiXMark className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>

      <div
        className={`border-b px-3 py-2 ${
          light
            ? "border-violet-100 bg-violet-50/80"
            : "border-violet-950/80 bg-violet-950/25"
        }`}
      >
        <p
          className={`text-[9px] font-bold uppercase tracking-[0.14em] ${
            light ? "text-violet-700/80" : "text-violet-300/80"
          }`}
        >
          Live insight
        </p>
        <p
          className={`mt-0.5 text-[11px] leading-snug ${
            light ? "text-slate-800" : "text-slate-200"
          }`}
        >
          {insights[insightIndex % insights.length]}
        </p>
        <button
          type="button"
          onClick={() =>
            setInsightIndex((i) => (i + 1) % Math.max(insights.length, 1))
          }
          className={`mt-1 text-[10px] font-semibold ${
            light
              ? "text-violet-700 hover:text-violet-900"
              : "text-violet-300 hover:text-violet-100"
          }`}
        >
          Next insight
        </button>
      </div>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={[
              "max-w-[92%] rounded-xl px-2.5 py-2 text-xs leading-relaxed whitespace-pre-wrap",
              msg.role === "user"
                ? light
                  ? "ml-auto border border-cyan-300/50 bg-cyan-50 text-cyan-900"
                  : "ml-auto bg-cyan-500/20 text-cyan-50 border border-cyan-400/25"
                : light
                  ? "mr-auto border border-violet-200 bg-slate-50 text-slate-800"
                  : "mr-auto bg-slate-950/70 text-slate-200 border border-violet-500/20",
            ].join(" ")}
          >
            {msg.role === "assistant" ? (
              <span
                className={`mb-1 block text-[9px] font-bold uppercase tracking-wide ${
                  light ? "text-violet-700/80" : "text-violet-300/80"
                }`}
              >
                TARA AI
              </span>
            ) : null}
            {msg.text}
          </div>
        ))}
        {typing ? (
          <div
            className={`mr-auto rounded-xl border px-3 py-2 text-xs ${
              light
                ? "border-violet-200 bg-slate-50 text-violet-700"
                : "border-violet-500/20 bg-slate-950/70 text-violet-200/80"
            }`}
          >
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300 [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300 [animation-delay:240ms]" />
            </span>
          </div>
        ) : null}
      </div>

      <div
        className={`border-t px-3 pb-1 pt-2 ${
          light ? "border-violet-100" : "border-violet-900/40"
        }`}
      >
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          {tips.map((tip) => (
            <button
              key={tip}
              type="button"
              disabled={typing}
              onClick={() => pushAnswer(tip)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition disabled:opacity-50 ${
                light
                  ? "border-violet-300 bg-violet-50 text-violet-800 hover:border-violet-400"
                  : "border-violet-500/30 bg-violet-950/40 text-violet-100 hover:border-violet-400/60"
              }`}
            >
              {tip}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2 pb-3">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about projects, funding, risk…"
            disabled={typing}
            className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-xs outline-none ${
              light
                ? "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-violet-400/50"
                : "border-slate-700/80 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus:border-violet-400/50"
            }`}
          />
          <button
            type="submit"
            disabled={typing || !draft.trim()}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition disabled:opacity-40 ${
              light
                ? "border-violet-400/50 bg-violet-50 text-violet-800 hover:bg-violet-100"
                : "border-violet-400/40 bg-violet-500/25 text-violet-100 hover:bg-violet-500/40"
            }`}
            aria-label="Send message"
          >
            <HiPaperAirplane className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AnalyticsChatBot;
