import {
    PROGRAM_META,
    STATUS_META,
    formatCompact,
    formatPeso,
    summarizeProjects,
    type Province,
    type TaraProgram,
    type TaraProject,
    PROVINCES,
    PROGRAMS,
} from '@/constants/taraProjects';

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: number;
};

export const CHAT_QUICK_PROMPTS = [
  "Give me an executive summary",
  "Which projects are delayed?",
  "Compare provinces",
  "Show funding breakdown",
  "Who has the most beneficiaries?",
  "What needs attention first?",
];

const uid = () =>
  `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const createWelcomeMessage = (projectCount: number): ChatMessage => ({
  id: uid(),
  role: "assistant",
  createdAt: Date.now(),
  text: `TARA AI Analytics online (Gemini). I read live project records from the TARA backend — not just the ${projectCount} project${projectCount === 1 ? "" : "s"} currently on your map filters. Ask about status, provinces, funding, progress, or risk.`,
});

const findProvince = (q: string): Province | null => {
  const lower = q.toLowerCase();
  if (lower.includes("oriental") || lower.includes("ormin"))
    return "Oriental Mindoro";
  if (lower.includes("occidental") || lower.includes("ocmin"))
    return "Occidental Mindoro";
  return (
    PROVINCES.find((p) => lower.includes(p.toLowerCase())) ??
    (lower.includes("mindoro") && !lower.includes("oriental") && !lower.includes("occidental")
      ? null
      : null)
  );
};

const findProgram = (q: string): TaraProgram | null => {
  const lower = q.toLowerCase();
  for (const program of PROGRAMS) {
    const short = PROGRAM_META[program].short.toLowerCase();
    if (
      lower.includes(program.toLowerCase()) ||
      (short.length > 2 && lower.includes(short))
    ) {
      return program;
    }
  }
  return null;
};

const rankProvinces = (
  projects: TaraProject[],
  metric: "count" | "budget" | "beneficiaries" | "progress" | "completed",
) => {
  return PROVINCES.map((province) => {
    const list = projects.filter((p) => p.province === province);
    let value = 0;
    if (metric === "count") value = list.length;
    if (metric === "budget") value = list.reduce((s, p) => s + p.budget, 0);
    if (metric === "beneficiaries")
      value = list.reduce((s, p) => s + p.beneficiaries, 0);
    if (metric === "progress")
      value =
        list.length > 0
          ? Math.round(list.reduce((s, p) => s + p.progress, 0) / list.length)
          : 0;
    if (metric === "completed")
      value =
        list.length > 0
          ? Math.round(
              (list.filter((p) => p.status === "completed").length /
                list.length) *
                100,
            )
          : 0;
    return { province, value, count: list.length };
  }).sort((a, b) => b.value - a.value);
};

const listProjectsBrief = (projects: TaraProject[], limit = 5) =>
  projects
    .slice(0, limit)
    .map(
      (p) =>
        `• ${p.name} (${p.province}) — ${STATUS_META[p.status].label}, ${p.progress}%, ${formatPeso(p.budget)}`,
    )
    .join("\n");

export const answerAnalyticsQuestion = (
  rawQuestion: string,
  projects: TaraProject[],
): string => {
  const q = rawQuestion.trim();
  if (!q) {
    return "Ask about MIMAROPA TARA projects — status, funding, provinces, programs, or risk.";
  }

  const lower = q.toLowerCase();
  const stats = summarizeProjects(projects);

  if (projects.length === 0) {
    return "No projects match the current map filters. Clear filters, then ask again.";
  }

  const provinceHit = findProvince(lower);
  const programHit = findProgram(lower);

  // greetings / help
  if (
    /^(hi|hello|hey|yo)\b/.test(lower) ||
    lower.includes("help") ||
    lower.includes("what can you")
  ) {
    return `I analyze live TARA map data (${stats.total} projects in view).\nTry: delayed projects, province compare, funding summary, beneficiaries, or name a province/program.`;
  }

  // delayed / risk / attention
  if (
    lower.includes("delay") ||
    lower.includes("risk") ||
    lower.includes("attention") ||
    lower.includes("flag") ||
    lower.includes("problem") ||
    lower.includes("issue")
  ) {
    const risk = projects.filter(
      (p) => p.status === "delayed" || p.status === "on_hold",
    );
    if (risk.length === 0) {
      return "No delayed or on-hold projects in the current filter. Portfolio looks stable on status.";
    }
    return `Priority watch — ${risk.length} project(s) need attention:\n${listProjectsBrief(risk, 8)}\n\nSuggest: open each pin on the map and review latest accomplishment notes.`;
  }

  // executive summary
  if (
    lower.includes("summary") ||
    lower.includes("overview") ||
    lower.includes("executive") ||
    lower.includes("situation")
  ) {
    const topBudget = [...projects].sort((a, b) => b.budget - a.budget)[0];
    const util =
      stats.funding > 0
        ? Math.round((stats.utilized / stats.funding) * 100)
        : 0;
    return [
      `Executive snapshot (${stats.total} projects):`,
      `• Active ${stats.active} · Completed ${stats.completed} · Delayed ${stats.delayed} · On hold ${stats.onHold}`,
      `• Funding ${formatPeso(stats.funding)} · Utilized ~${util}% (${formatPeso(stats.utilized)})`,
      `• Beneficiaries ${formatCompact(stats.beneficiaries)} across ${stats.municipalities} LGUs`,
      topBudget
        ? `• Largest budget: ${topBudget.name} (${formatPeso(topBudget.budget)})`
        : null,
      stats.delayed > 0
        ? `• Alert: ${stats.delayed} delayed — escalate before next reporting cycle.`
        : `• No delays in current filter.`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  // funding / budget
  if (
    lower.includes("fund") ||
    lower.includes("budget") ||
    lower.includes("peso") ||
    lower.includes("money") ||
    lower.includes("investment")
  ) {
    if (provinceHit) {
      const list = projects.filter((p) => p.province === provinceHit);
      const sum = list.reduce((s, p) => s + p.budget, 0);
      return `${provinceHit}: ${list.length} project(s), total budget ${formatPeso(sum)}.\n${listProjectsBrief(list, 6)}`;
    }
    if (programHit) {
      const list = projects.filter((p) => p.program === programHit);
      const sum = list.reduce((s, p) => s + p.budget, 0);
      return `${programHit}: ${list.length} project(s), ${formatPeso(sum)} total.\n${listProjectsBrief(list, 6)}`;
    }
    const byProvince = rankProvinces(projects, "budget")
      .filter((r) => r.count > 0)
      .map((r) => `• ${r.province}: ${formatPeso(r.value)} (${r.count})`)
      .join("\n");
    const util =
      stats.funding > 0
        ? Math.round((stats.utilized / stats.funding) * 100)
        : 0;
    return `Funding breakdown (filtered):\nTotal ${formatPeso(stats.funding)} · Utilized ${formatPeso(stats.utilized)} (${util}%)\n\nBy province:\n${byProvince}`;
  }

  // beneficiaries
  if (
    lower.includes("beneficiar") ||
    lower.includes("people") ||
    lower.includes("reach") ||
    lower.includes("who has the most")
  ) {
    const ranked = rankProvinces(projects, "beneficiaries").filter(
      (r) => r.count > 0,
    );
    const top = ranked[0];
    const lines = ranked
      .map((r) => `• ${r.province}: ${formatCompact(r.value)} people`)
      .join("\n");
    return `Beneficiary reach: ${formatCompact(stats.beneficiaries)} total.\n${top ? `Highest: ${top.province} (${formatCompact(top.value)}).\n` : ""}${lines}`;
  }

  // compare provinces
  if (
    lower.includes("compare") ||
    lower.includes("province") ||
    lower.includes("which province") ||
    lower.includes("leads") ||
    lower.includes("ranking")
  ) {
    if (provinceHit) {
      const list = projects.filter((p) => p.province === provinceHit);
      const s = summarizeProjects(list);
      return `${provinceHit} digests:\n• Projects ${s.total} (active ${s.active}, completed ${s.completed}, delayed ${s.delayed})\n• Budget ${formatPeso(s.funding)}\n• Beneficiaries ${formatCompact(s.beneficiaries)}\n${list.length ? listProjectsBrief(list, 6) : "No projects in filter for this province."}`;
    }
    const byCount = rankProvinces(projects, "count").filter((r) => r.count > 0);
    const byComplete = rankProvinces(projects, "completed").filter(
      (r) => r.count > 0,
    );
    const byBudget = rankProvinces(projects, "budget").filter((r) => r.count > 0);
    return [
      "Province comparison:",
      `• Most projects: ${byCount[0]?.province ?? "—"} (${byCount[0]?.value ?? 0})`,
      `• Best completion rate: ${byComplete[0]?.province ?? "—"} (${byComplete[0]?.value ?? 0}%)`,
      `• Highest budget: ${byBudget[0]?.province ?? "—"} (${formatPeso(byBudget[0]?.value ?? 0)})`,
      "",
      "Counts:",
      ...byCount.map((r) => `  ${r.province}: ${r.value}`),
    ].join("\n");
  }

  // progress
  if (
    lower.includes("progress") ||
    lower.includes("completion") ||
    lower.includes("percent") ||
    lower.includes("%")
  ) {
    const ranked = rankProvinces(projects, "progress").filter((r) => r.count > 0);
    const avg =
      projects.length > 0
        ? Math.round(
            projects.reduce((s, p) => s + p.progress, 0) / projects.length,
          )
        : 0;
    const low = [...projects].sort((a, b) => a.progress - b.progress).slice(0, 3);
    return [
      `Average progress ${avg}% across ${projects.length} projects.`,
      "Province averages:",
      ...ranked.map((r) => `• ${r.province}: ${r.value}%`),
      "",
      "Lowest progress:",
      listProjectsBrief(low, 3),
    ].join("\n");
  }

  // program specific
  if (programHit || lower.includes("program")) {
    if (programHit) {
      const list = projects.filter((p) => p.program === programHit);
      if (list.length === 0) {
        return `No ${programHit} projects in the current filter.`;
      }
      const s = summarizeProjects(list);
      return `${programHit} (${PROGRAM_META[programHit].short}): ${s.total} project(s), ${formatPeso(s.funding)}, ${formatCompact(s.beneficiaries)} people.\n${listProjectsBrief(list, 8)}`;
    }
    const counts = new Map<string, number>();
    projects.forEach((p) => {
      counts.set(p.program, (counts.get(p.program) ?? 0) + 1);
    });
    const lines = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => `• ${name}: ${n}`)
      .join("\n");
    return `Programs in view:\n${lines}`;
  }

  // status lists
  if (
    lower.includes("ongoing") ||
    lower.includes("active") ||
    lower.includes("completed") ||
    lower.includes("planning") ||
    lower.includes("hold") ||
    lower.includes("cancel")
  ) {
    let status: TaraProject["status"] | null = null;
    if (lower.includes("ongoing") || lower.includes("active")) status = "ongoing";
    else if (lower.includes("completed") || lower.includes("done"))
      status = "completed";
    else if (lower.includes("planning")) status = "planning";
    else if (lower.includes("hold")) status = "on_hold";
    else if (lower.includes("cancel")) status = "cancelled";
    else if (lower.includes("delay")) status = "delayed";

    if (status) {
      const list = projects.filter((p) => p.status === status);
      return list.length
        ? `${STATUS_META[status].label} projects (${list.length}):\n${listProjectsBrief(list, 10)}`
        : `No ${STATUS_META[status].label.toLowerCase()} projects in filter.`;
    }
  }

  // search by project name fragment
  const named = projects.filter((p) =>
    lower.split(/\s+/).some(
      (token) =>
        token.length > 3 &&
        (p.name.toLowerCase().includes(token) ||
          p.municipality.toLowerCase().includes(token) ||
          p.barangay.toLowerCase().includes(token)),
    ),
  );
  if (named.length > 0 && named.length <= 8) {
    return `Matched ${named.length} project(s):\n${listProjectsBrief(named, 8)}`;
  }

  // default insight
  const delayed = projects.filter((p) => p.status === "delayed");
  const topProvince = rankProvinces(projects, "budget").find((r) => r.count > 0);
  return [
    `I read ${stats.total} filtered projects.`,
    `Status — ongoing ${stats.active}, completed ${stats.completed}, delayed ${stats.delayed}, on hold ${stats.onHold}.`,
    `Budget ${formatPeso(stats.funding)} · people reach ${formatCompact(stats.beneficiaries)}.`,
    topProvince
      ? `Highest budget province: ${topProvince.province} (${formatPeso(topProvince.value)}).`
      : null,
    delayed.length
      ? `Watch list: ${delayed.map((p) => p.name).join("; ")}.`
      : "No delayed projects in view.",
    "",
    "Ask a sharper question — e.g. “Palawan funding”, “delayed projects”, or “compare provinces”.",
  ]
    .filter(Boolean)
    .join("\n");
};

export const buildAssistantReply = (
  question: string,
  projects: TaraProject[],
): ChatMessage => ({
  id: uid(),
  role: "assistant",
  createdAt: Date.now(),
  text: answerAnalyticsQuestion(question, projects),
});

export const buildUserMessage = (text: string): ChatMessage => ({
  id: uid(),
  role: "user",
  createdAt: Date.now(),
  text: text.trim(),
});
