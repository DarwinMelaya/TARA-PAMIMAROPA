import { useState } from 'react';
import { HiChatBubbleLeftRight, HiClipboardDocumentList, HiSparkles } from 'react-icons/hi2';
import AnalyticsChatBot from '@/components/region/dashboard/AnalyticsChatBot';
import RegionalDirectorAiAnalytics from '@/components/region/dashboard/RegionalDirectorAiAnalytics';
import ChartAiInterpretation, {
    type ChartInterpretContext,
} from '@/components/region/graphs/ChartAiInterpretation';
import type { TaraProject } from '@/constants/taraProjects';

type PanelTab = 'interpret' | 'chat' | 'plan';

type RegionGraphsAiPanelProps = {
    context: ChartInterpretContext;
    projects: TaraProject[];
};

const RegionGraphsAiPanel = ({
    context,
    projects,
}: RegionGraphsAiPanelProps) => {
    const [tab, setTab] = useState<PanelTab>('interpret');
    const [chatOpen, setChatOpen] = useState(true);
    const [planOpen, setPlanOpen] = useState(true);
    const [seedPrompt, setSeedPrompt] = useState<string | null>(null);

    const tabs: Array<{
        id: PanelTab;
        label: string;
        hint: string;
        icon: typeof HiSparkles;
    }> = [
        {
            id: 'interpret',
            label: 'Explain charts',
            hint: 'Short story of this view',
            icon: HiSparkles,
        },
        {
            id: 'chat',
            label: 'Ask TARA',
            hint: 'Chat about the projects',
            icon: HiChatBubbleLeftRight,
        },
        {
            id: 'plan',
            label: 'Planning notes',
            hint: 'Priorities for the team',
            icon: HiClipboardDocumentList,
        },
    ];

    return (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-950/60 sm:p-5">
            <div>
                <p className="text-xs font-medium tracking-wide text-cyan-700 uppercase dark:text-cyan-300">
                    TARA helper
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                    Understand your numbers
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
                    Ask questions, get chart notes, or pull planning ideas — written
                    for everyone on the team.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {tabs.map((item) => {
                    const Icon = item.icon;
                    const on = tab === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setTab(item.id)}
                            className={[
                                'rounded-xl border px-3 py-3 text-left transition',
                                on
                                    ? 'border-cyan-500 bg-cyan-600 text-white shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:bg-cyan-50/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
                            ].join(' ')}
                        >
                            <span className="flex items-center gap-2 text-sm font-semibold">
                                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                                {item.label}
                            </span>
                            <span
                                className={[
                                    'mt-1 block text-xs leading-snug',
                                    on ? 'text-cyan-50' : 'text-slate-500',
                                ].join(' ')}
                            >
                                {item.hint}
                            </span>
                        </button>
                    );
                })}
            </div>

            {tab === 'interpret' ? (
                <ChartAiInterpretation context={context} />
            ) : null}

            {tab === 'chat' ? (
                chatOpen ? (
                    <AnalyticsChatBot
                        open={chatOpen}
                        onClose={() => setChatOpen(false)}
                        projects={projects}
                        variant="sheet"
                        audience="general"
                        seedPrompt={seedPrompt}
                        onSeedPromptConsumed={() => setSeedPrompt(null)}
                        className="!max-h-[min(70vh,640px)] !w-full !max-w-none"
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => setChatOpen(true)}
                        className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    >
                        Open chat
                    </button>
                )
            ) : null}

            {tab === 'plan' ? (
                planOpen ? (
                    <RegionalDirectorAiAnalytics
                        open={planOpen}
                        onClose={() => setPlanOpen(false)}
                        onAskChat={(prompt) => {
                            setSeedPrompt(prompt);
                            setTab('chat');
                            setChatOpen(true);
                        }}
                        variant="sheet"
                        className="!max-h-[min(70vh,640px)] !w-full !max-w-none"
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => setPlanOpen(true)}
                        className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    >
                        Open planning notes
                    </button>
                )
            ) : null}
        </div>
    );
};

export default RegionGraphsAiPanel;
