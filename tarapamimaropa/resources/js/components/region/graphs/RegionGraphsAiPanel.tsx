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
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
            <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    TARA helper
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                    Understand your numbers
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
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
                                    ? 'border-transparent bg-primary text-primary-foreground shadow-xs'
                                    : 'border-border bg-background text-foreground/80 hover:bg-muted hover:text-foreground',
                            ].join(' ')}
                        >
                            <span className="flex items-center gap-2 text-sm font-semibold">
                                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                                {item.label}
                            </span>
                            <span
                                className={[
                                    'mt-1 block text-xs leading-snug',
                                    on ? 'text-primary-foreground/70' : 'text-muted-foreground',
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
                        className="min-h-10 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground hover:bg-muted"
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
                        className="min-h-10 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground hover:bg-muted"
                    >
                        Open planning notes
                    </button>
                )
            ) : null}
        </div>
    );
};

export default RegionGraphsAiPanel;
