export const PROVINCES = [
    'Occidental Mindoro',
    'Oriental Mindoro',
    'Marinduque',
    'Romblon',
    'Palawan',
] as const;

export type Province = (typeof PROVINCES)[number];

export const PROJECT_STATUSES = [
    'planning',
    'ongoing',
    'completed',
    'delayed',
    'on_hold',
    'cancelled',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type TaraProgram =
    | 'SETUP'
    | 'CEST'
    | 'GIA'
    | 'STARBOOKS'
    | 'Community'
    | 'Water'
    | 'Energy';

export type TaraProject = {
    id: string;
    code?: string | null;
    row_number?: number | null;
    name: string;
    description: string;
    beneficiary: string;
    program: TaraProgram;
    /** Excel "Type" when imported; falls back to program mapping. */
    type?: string | null;
    sector: string;
    province: Province;
    municipality: string;
    barangay: string;
    partner_agency: string;
    collaborators?: string | null;
    district?: string | null;
    status: ProjectStatus;
    /** Raw Excel / DB status label (On-going, Graduated, …). */
    status_label?: string | null;
    progress: number;
    budget: number;
    funding_source: string;
    beneficiaries: number;
    start_date: string;
    end_date: string;
    year_approved?: number | null;
    latest_accomplishment: string;
    latitude: number;
    longitude: number;
    photo_url?: string;
    amount_due?: number | null;
    refunded?: number | null;
    refund_rate?: number | null;
};

export const STATUS_META: Record<
    ProjectStatus,
    { label: string; className: string; classNameLight: string }
> = {
    planning: {
        label: 'Planning',
        className: 'bg-slate-800/80 text-slate-200 ring-slate-500/40',
        classNameLight: 'bg-slate-200 text-slate-800 ring-slate-400/50',
    },
    ongoing: {
        label: 'Ongoing',
        className: 'bg-blue-500/20 text-blue-100 ring-blue-400/40',
        classNameLight: 'bg-blue-100 text-blue-900 ring-blue-300/60',
    },
    completed: {
        label: 'Completed',
        className: 'bg-emerald-500/20 text-emerald-100 ring-emerald-400/40',
        classNameLight: 'bg-emerald-100 text-emerald-900 ring-emerald-300/60',
    },
    delayed: {
        label: 'Delayed',
        className: 'bg-red-500/20 text-red-100 ring-red-400/40',
        classNameLight: 'bg-red-100 text-red-900 ring-red-300/60',
    },
    on_hold: {
        label: 'On hold',
        className: 'bg-amber-500/20 text-amber-100 ring-amber-400/40',
        classNameLight: 'bg-amber-100 text-amber-950 ring-amber-300/60',
    },
    cancelled: {
        label: 'Cancelled',
        className: 'bg-rose-500/20 text-rose-100 ring-rose-400/40',
        classNameLight: 'bg-rose-100 text-rose-900 ring-rose-300/60',
    },
};

export const statusBadgeClass = (
    status: ProjectStatus,
    mode: 'light' | 'dark' = 'dark',
): string => {
    const meta = STATUS_META[status];
    if (!meta) {
        return mode === 'light'
            ? 'bg-slate-200 text-slate-800 ring-slate-400/50'
            : 'bg-slate-800/80 text-slate-200 ring-slate-500/40';
    }

    return mode === 'light' ? meta.classNameLight : meta.className;
};

/** Badge styles for raw Excel status labels. */
const RAW_STATUS_CLASS: Record<string, string> = {
    'on-going': 'bg-blue-500/20 text-blue-100 ring-blue-400/40',
    ongoing: 'bg-blue-500/20 text-blue-100 ring-blue-400/40',
    graduated: 'bg-emerald-500/20 text-emerald-100 ring-emerald-400/40',
    completed: 'bg-emerald-500/20 text-emerald-100 ring-emerald-400/40',
    terminated: 'bg-rose-500/20 text-rose-100 ring-rose-400/40',
    cancelled: 'bg-rose-500/20 text-rose-100 ring-rose-400/40',
    canceled: 'bg-rose-500/20 text-rose-100 ring-rose-400/40',
    widthdrawn: 'bg-slate-500/20 text-slate-200 ring-slate-400/40',
    withdrawn: 'bg-slate-500/20 text-slate-200 ring-slate-400/40',
    new: 'bg-cyan-500/20 text-cyan-100 ring-cyan-400/40',
    planning: 'bg-slate-800/80 text-slate-200 ring-slate-500/40',
    delayed: 'bg-red-500/20 text-red-100 ring-red-400/40',
    'on hold': 'bg-amber-500/20 text-amber-100 ring-amber-400/40',
    on_hold: 'bg-amber-500/20 text-amber-100 ring-amber-400/40',
};

export const projectStatusLabel = (project: TaraProject): string => {
    if (project.status_label && project.status_label.trim() !== '') {
        return project.status_label;
    }

    return STATUS_META[project.status]?.label ?? String(project.status);
};

export const projectStatusClass = (project: TaraProject): string => {
    const raw = projectStatusLabel(project).trim().toLowerCase();
    const key = raw.replace(/[_]+/g, ' ').replace(/\s+/g, ' ');
    if (RAW_STATUS_CLASS[key]) return RAW_STATUS_CLASS[key];
    if (RAW_STATUS_CLASS[raw.replace(/\s+/g, '-')]) {
        return RAW_STATUS_CLASS[raw.replace(/\s+/g, '-')];
    }

    return STATUS_META[project.status]?.className
        ?? 'bg-slate-800/80 text-slate-200 ring-slate-500/40';
};

export const formatMoneyOrDash = (value: number | null | undefined): string => {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '—';
    }

    return formatPeso(value);
};

export const formatRateOrDash = (value: number | null | undefined): string => {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '—';
    }

    return `${value}%`;
};

export const PROGRAM_META: Record<
    TaraProgram,
    { short: string; pinClass: string; accent: string }
> = {
    SETUP: {
        short: 'SETUP',
        pinClass: 'project-pin--setup',
        accent: 'text-sky-300',
    },
    CEST: {
        short: 'CEST',
        pinClass: 'project-pin--cest',
        accent: 'text-violet-300',
    },
    GIA: {
        short: 'GIA',
        pinClass: 'project-pin--gia',
        accent: 'text-amber-300',
    },
    STARBOOKS: {
        short: 'STAR',
        pinClass: 'project-pin--starbooks',
        accent: 'text-emerald-300',
    },
    Community: {
        short: 'COMM',
        pinClass: 'project-pin--hub',
        accent: 'text-cyan-300',
    },
    Water: {
        short: 'H2O',
        pinClass: 'project-pin--water',
        accent: 'text-blue-300',
    },
    Energy: {
        short: 'NRG',
        pinClass: 'project-pin--energy',
        accent: 'text-yellow-300',
    },
};

export const MOCK_TARA_PROJECTS: TaraProject[] = [
    {
        id: 'tara-001',
        name: 'SETUP Food Processing Hub – Calapan',
        description:
            'Shared food processing facility for MSMEs in Oriental Mindoro with packaging and cold storage support.',
        beneficiary: 'Calapan City MSME Cooperative',
        program: 'SETUP',
        sector: 'Industry',
        province: 'Oriental Mindoro',
        municipality: 'Calapan City',
        barangay: 'Ibaba East',
        partner_agency: 'DOST-MIMAROPA / LGU Calapan',
        status: 'ongoing',
        progress: 68,
        budget: 4_850_000,
        funding_source: 'DOST SETUP',
        beneficiaries: 120,
        start_date: '2024-03-01',
        end_date: '2026-02-28',
        latest_accomplishment: 'Equipment installation 80% complete.',
        latitude: 13.4117,
        longitude: 121.1803,
    },
    {
        id: 'tara-002',
        name: 'Community Water System – Sablayan',
        description:
            'Level II water system upgrade serving upland barangays with solar-assisted pumping.',
        beneficiary: 'Sablayan Water Association',
        program: 'Water',
        sector: 'Water',
        province: 'Occidental Mindoro',
        municipality: 'Sablayan',
        barangay: 'Claudio Salgado',
        partner_agency: 'DOST-MIMAROPA / DPWH',
        status: 'ongoing',
        progress: 45,
        budget: 6_200_000,
        funding_source: 'GIA + LGU counterpart',
        beneficiaries: 2400,
        start_date: '2024-06-15',
        end_date: '2026-06-15',
        latest_accomplishment: 'Pipeline trenching ongoing in sitio Proper.',
        latitude: 12.8344,
        longitude: 120.7829,
    },
    {
        id: 'tara-003',
        name: 'STARBOOKS Digital Library – Boac',
        description:
            'Offline digital library deployment for public secondary schools in Marinduque.',
        beneficiary: 'Marinduque National High School',
        program: 'STARBOOKS',
        sector: 'Education',
        province: 'Marinduque',
        municipality: 'Boac',
        barangay: 'Mercadillo',
        partner_agency: 'DOST-STII / DepEd',
        status: 'completed',
        progress: 100,
        budget: 980_000,
        funding_source: 'DOST STARBOOKS',
        beneficiaries: 1800,
        start_date: '2023-08-01',
        end_date: '2024-11-30',
        latest_accomplishment: 'Turned over; librarian training completed.',
        latitude: 13.4467,
        longitude: 121.8394,
    },
    {
        id: 'tara-004',
        name: 'Coral Reef Monitoring Buoy – Puerto Galera',
        description:
            'Nearshore buoy network for temperature and turbidity monitoring supporting tourism LGUs.',
        beneficiary: 'Puerto Galera Tourism Office',
        program: 'CEST',
        sector: 'Environment',
        province: 'Oriental Mindoro',
        municipality: 'Puerto Galera',
        barangay: 'Sabang',
        partner_agency: 'DOST-MIMAROPA / DENR',
        status: 'planning',
        progress: 15,
        budget: 2_150_000,
        funding_source: 'CEST',
        beneficiaries: 8500,
        start_date: '2025-01-10',
        end_date: '2026-12-31',
        latest_accomplishment: 'Site survey and MoA drafting.',
        latitude: 13.5031,
        longitude: 120.9517,
    },
    {
        id: 'tara-005',
        name: 'Solar Microgrid – Culion Island',
        description:
            'Hybrid solar-battery microgrid for remote barangay electrification.',
        beneficiary: 'Culion Electric Cooperative',
        program: 'Energy',
        sector: 'Energy',
        province: 'Palawan',
        municipality: 'Culion',
        barangay: 'Balala',
        partner_agency: 'DOST / DOE',
        status: 'delayed',
        progress: 38,
        budget: 12_500_000,
        funding_source: 'GIA Energy',
        beneficiaries: 920,
        start_date: '2023-11-01',
        end_date: '2025-10-31',
        latest_accomplishment: 'Battery shipment delayed; civil works paused.',
        latitude: 11.8375,
        longitude: 119.9928,
    },
    {
        id: 'tara-006',
        name: 'SETUP Metalworks Shop – Odiongan',
        description:
            'Modernization of metal fabrication MSME with CNC and safety upgrades.',
        beneficiary: 'Romblon Fabricators Association',
        program: 'SETUP',
        sector: 'Industry',
        province: 'Romblon',
        municipality: 'Odiongan',
        barangay: 'Liwanag',
        partner_agency: 'DOST-MIMAROPA',
        status: 'ongoing',
        progress: 72,
        budget: 3_400_000,
        funding_source: 'DOST SETUP',
        beneficiaries: 45,
        start_date: '2024-02-01',
        end_date: '2025-12-31',
        latest_accomplishment: 'CNC commissioned; operator training week 2.',
        latitude: 12.4008,
        longitude: 121.9881,
    },
    {
        id: 'tara-007',
        name: 'Community Disaster Early Warning – Coron',
        description:
            'Siren and SMS alert network for coastal barangays prone to storm surge.',
        beneficiary: 'Coron MDRRMO',
        program: 'Community',
        sector: 'DRRM',
        province: 'Palawan',
        municipality: 'Coron',
        barangay: 'Poblacion 1',
        partner_agency: 'DOST-PAGASA / LGU Coron',
        status: 'completed',
        progress: 100,
        budget: 1_750_000,
        funding_source: 'CEST Community',
        beneficiaries: 12_000,
        start_date: '2023-04-01',
        end_date: '2024-09-30',
        latest_accomplishment: 'Drill completed with barangay captains.',
        latitude: 12.0011,
        longitude: 120.2097,
    },
    {
        id: 'tara-008',
        name: 'GIA Seaweed Dryer – Looc',
        description:
            'Mechanical dryer and quality lab for seaweed farmers.',
        beneficiary: 'Looc Seaweed Growers Coop',
        program: 'GIA',
        sector: 'Agriculture',
        province: 'Romblon',
        municipality: 'Looc',
        barangay: 'Poblacion',
        partner_agency: 'DOST-MIMAROPA / BFAR',
        status: 'on_hold',
        progress: 22,
        budget: 2_900_000,
        funding_source: 'GIA',
        beneficiaries: 310,
        start_date: '2024-09-01',
        end_date: '2026-03-31',
        latest_accomplishment: 'Awaiting site title clearance.',
        latitude: 12.2603,
        longitude: 121.9925,
    },
    {
        id: 'tara-009',
        name: 'STARBOOKS Hub – San Jose',
        description:
            'Municipal STARBOOKS hub with public access terminals.',
        beneficiary: 'San Jose Municipal Library',
        program: 'STARBOOKS',
        sector: 'Education',
        province: 'Occidental Mindoro',
        municipality: 'San Jose',
        barangay: 'Poblacion 7',
        partner_agency: 'DOST-STII',
        status: 'ongoing',
        progress: 55,
        budget: 1_120_000,
        funding_source: 'DOST STARBOOKS',
        beneficiaries: 3500,
        start_date: '2024-07-01',
        end_date: '2025-12-15',
        latest_accomplishment: 'Network wiring and kiosk install started.',
        latitude: 12.3528,
        longitude: 121.0675,
    },
    {
        id: 'tara-010',
        name: 'CEST Tourism Mapping – El Nido',
        description:
            'GIS-based tourism asset inventory and visitor flow dashboard.',
        beneficiary: 'El Nido Tourism Office',
        program: 'CEST',
        sector: 'Tourism',
        province: 'Palawan',
        municipality: 'El Nido',
        barangay: 'Corong-Corong',
        partner_agency: 'DOST-MIMAROPA / DOT',
        status: 'planning',
        progress: 10,
        budget: 1_450_000,
        funding_source: 'CEST',
        beneficiaries: 15_000,
        start_date: '2025-02-01',
        end_date: '2026-08-31',
        latest_accomplishment: 'Stakeholder inception workshop held.',
        latitude: 11.1787,
        longitude: 119.3915,
    },
    {
        id: 'tara-011',
        name: 'SETUP Cassava Starch Plant – Victoria',
        description:
            'Upgrade of cassava starch processing line and wastewater treatment.',
        beneficiary: 'Victoria Farmers Enterprise',
        program: 'SETUP',
        sector: 'Agriculture',
        province: 'Oriental Mindoro',
        municipality: 'Victoria',
        barangay: 'Malabo',
        partner_agency: 'DOST-MIMAROPA',
        status: 'ongoing',
        progress: 61,
        budget: 5_600_000,
        funding_source: 'DOST SETUP',
        beneficiaries: 280,
        start_date: '2024-01-15',
        end_date: '2026-01-15',
        latest_accomplishment: 'WWTP civil works 50% complete.',
        latitude: 13.1764,
        longitude: 121.2756,
    },
    {
        id: 'tara-012',
        name: 'Rainwater Harvesting Demo – Torrijos',
        description:
            'School-based rainwater harvesting and filtration demo site.',
        beneficiary: 'Torrijos Central School',
        program: 'Water',
        sector: 'Water',
        province: 'Marinduque',
        municipality: 'Torrijos',
        barangay: 'Maranlig',
        partner_agency: 'DOST-MIMAROPA / DepEd',
        status: 'completed',
        progress: 100,
        budget: 640_000,
        funding_source: 'GIA Water',
        beneficiaries: 900,
        start_date: '2023-06-01',
        end_date: '2024-05-31',
        latest_accomplishment: 'Turnover and O&M training done.',
        latitude: 13.3186,
        longitude: 122.0856,
    },
    {
        id: 'tara-013',
        name: 'Solar Ice Maker – Roxas Palawan',
        description:
            'Solar-powered ice plant for fishers to reduce post-harvest loss.',
        beneficiary: 'Roxas Fisherfolk Association',
        program: 'Energy',
        sector: 'Fisheries',
        province: 'Palawan',
        municipality: 'Roxas',
        barangay: 'New Barbacan',
        partner_agency: 'DOST / BFAR',
        status: 'ongoing',
        progress: 48,
        budget: 7_800_000,
        funding_source: 'GIA Energy',
        beneficiaries: 640,
        start_date: '2024-05-01',
        end_date: '2026-04-30',
        latest_accomplishment: 'PV array foundation poured.',
        latitude: 10.3194,
        longitude: 119.3431,
    },
    {
        id: 'tara-014',
        name: 'Community Innovation Hub – Mamburao',
        description:
            'Shared makerspace and packaging design lab for Occidental Mindoro MSMEs.',
        beneficiary: 'Mamburao Chamber of Commerce',
        program: 'Community',
        sector: 'Industry',
        province: 'Occidental Mindoro',
        municipality: 'Mamburao',
        barangay: 'Balansay',
        partner_agency: 'DOST-MIMAROPA / DTI',
        status: 'cancelled',
        progress: 5,
        budget: 2_200_000,
        funding_source: 'CEST',
        beneficiaries: 0,
        start_date: '2024-04-01',
        end_date: '2025-04-01',
        latest_accomplishment: 'Project terminated; funds returned.',
        latitude: 13.2233,
        longitude: 120.5964,
    },
    {
        id: 'tara-015',
        name: 'GIA Marble Processing – Romblon',
        description:
            'Dust-control and cutting modernization for marble artisans.',
        beneficiary: 'Romblon Marble Artisans Guild',
        program: 'GIA',
        sector: 'Industry',
        province: 'Romblon',
        municipality: 'Romblon',
        barangay: 'Capaclan',
        partner_agency: 'DOST-MIMAROPA',
        status: 'ongoing',
        progress: 40,
        budget: 3_100_000,
        funding_source: 'GIA',
        beneficiaries: 75,
        start_date: '2024-08-01',
        end_date: '2026-07-31',
        latest_accomplishment: 'Dust collector fabrication in progress.',
        latitude: 12.5754,
        longitude: 122.2708,
    },
];

export const formatPeso = (value: number): string =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 0,
    }).format(value);

export const formatCompact = (value: number): string =>
    new Intl.NumberFormat('en', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(value);

export const projectImage = (id: string): string =>
    `https://picsum.photos/seed/${encodeURIComponent(id)}/800/450`;

export const describeProject = (project: TaraProject): string =>
    project.description;

/** DOST Impression-style project type labels shown in Programs UI. */
export type TaraType =
    | 'SETUP'
    | 'Roll-out'
    | 'TAPI-assisted'
    | 'GIA (Community Based)'
    | 'GIA (Region-initiated Projects) Internally Funded'
    | 'GIA (Region-initiated Projects) Externally Funded'
    | 'CEST';

export const TARA_TYPES: TaraType[] = [
    'SETUP',
    'Roll-out',
    'TAPI-assisted',
    'GIA (Community Based)',
    'GIA (Region-initiated Projects) Internally Funded',
    'GIA (Region-initiated Projects) Externally Funded',
    'CEST',
];

const PROGRAM_TO_TYPE: Record<TaraProgram, TaraType> = {
    SETUP: 'SETUP',
    CEST: 'CEST',
    GIA: 'GIA (Community Based)',
    STARBOOKS: 'Roll-out',
    Community: 'GIA (Community Based)',
    Water: 'GIA (Community Based)',
    Energy: 'GIA (Region-initiated Projects) Internally Funded',
};

/** Sector chips used by ProgramsGraphs (matches mock project sectors). */
export const SECTORS = [
    'Industry',
    'Water',
    'Education',
    'Environment',
    'Energy',
    'DRRM',
    'Agriculture',
    'Tourism',
    'Fisheries',
] as const;

export type TaraSector = (typeof SECTORS)[number];

export const projectType = (project: TaraProject): string => {
    if (project.type && project.type.trim() !== '') {
        return project.type;
    }

    return PROGRAM_TO_TYPE[project.program];
};

export const projectYear = (project: TaraProject): number => {
    if (project.year_approved && project.year_approved > 1900) {
        return project.year_approved;
    }

    return Number(project.start_date.slice(0, 4));
};

export const PROGRAMS: TaraProgram[] = [
    'SETUP',
    'CEST',
    'GIA',
    'STARBOOKS',
    'Community',
    'Water',
    'Energy',
];

export const AI_INSIGHTS = [
    'Marinduque currently leads project completion rate among MIMAROPA provinces.',
    'Palawan received the highest technology intervention investments this year.',
    'Occidental Mindoro shows rising demand for renewable energy and water projects.',
    '3 projects flagged delayed — Sablayan Water System needs priority review.',
];

/** Build insight blurbs from the current project list (DB / filters). */
export const buildLiveInsights = (projects: TaraProject[]): string[] => {
    if (projects.length === 0) {
        return ['No projects loaded yet. Import the Excel list on Programs to populate analytics.'];
    }

    const stats = summarizeProjects(projects);
    const byProvince = PROVINCES.map((province) => {
        const list = projects.filter((p) => p.province === province);
        const completed = list.filter((p) => p.status === 'completed').length;
        const budget = list.reduce((s, p) => s + p.budget, 0);
        const rate =
            list.length > 0 ? Math.round((completed / list.length) * 100) : 0;
        return { province, count: list.length, completed, budget, rate };
    }).filter((r) => r.count > 0);

    const topCount = [...byProvince].sort((a, b) => b.count - a.count)[0];
    const topBudget = [...byProvince].sort((a, b) => b.budget - a.budget)[0];
    const topComplete = [...byProvince].sort((a, b) => b.rate - a.rate)[0];
    const topType = (() => {
        const map = new Map<string, number>();
        projects.forEach((p) => {
            const t = projectType(p);
            map.set(t, (map.get(t) ?? 0) + 1);
        });
        return [...map.entries()].sort((a, b) => b[1] - a[1])[0];
    })();

    const lines = [
        `${stats.total} MIMAROPA projects in view · ${formatPeso(stats.funding)} total project cost · ${stats.active} ongoing · ${stats.completed} graduated/completed.`,
    ];

    if (topCount) {
        lines.push(
            `${topCount.province} has the most projects (${topCount.count}).`,
        );
    }
    if (topBudget) {
        lines.push(
            `${topBudget.province} leads funding at ${formatPeso(topBudget.budget)}.`,
        );
    }
    if (topComplete && topComplete.count >= 5) {
        lines.push(
            `${topComplete.province} leads completion rate at ${topComplete.rate}% (${topComplete.completed}/${topComplete.count}).`,
        );
    }
    if (topType) {
        lines.push(`Most common type: ${topType[0]} (${topType[1]} projects).`);
    }
    if (stats.delayed > 0) {
        lines.push(`${stats.delayed} delayed project${stats.delayed === 1 ? '' : 's'} need review.`);
    } else {
        lines.push('No delayed projects in the current filter.');
    }

    return lines;
};

export const summarizeProjects = (projects: TaraProject[]) => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === 'ongoing').length;
    const completed = projects.filter((p) => p.status === 'completed').length;
    const onHold = projects.filter((p) => p.status === 'on_hold').length;
    const delayed = projects.filter((p) => p.status === 'delayed').length;
    const beneficiaries = projects.reduce((s, p) => s + p.beneficiaries, 0);
    const funding = projects.reduce((s, p) => s + p.budget, 0);
    const utilized = projects.reduce(
        (s, p) => s + Math.round((p.budget * p.progress) / 100),
        0,
    );
    const municipalities = new Set(projects.map((p) => p.municipality)).size;
    const barangays = new Set(projects.map((p) => p.barangay)).size;
    const partners = new Set(projects.map((p) => p.partner_agency)).size;

    return {
        total,
        active,
        completed,
        onHold,
        delayed,
        beneficiaries,
        funding,
        utilized,
        municipalities,
        barangays,
        partners,
    };
};
