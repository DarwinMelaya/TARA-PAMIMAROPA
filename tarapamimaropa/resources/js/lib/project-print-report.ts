import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    formatCompact,
    formatPeso,
    projectStatusLabel,
    summarizeProjects,
    type TaraProject,
} from '@/constants/taraProjects';

export type ProjectReportScope = {
    label: string;
    /** Optional filename stem, e.g. tara-mimaropa-2026-09-16 */
    fileStem?: string;
};

const countBy = <T extends string>(
    projects: TaraProject[],
    pick: (p: TaraProject) => T,
): { key: T; count: number }[] => {
    const map = new Map<T, number>();
    projects.forEach((p) => {
        const k = pick(p);
        map.set(k, (map.get(k) ?? 0) + 1);
    });
    return [...map.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12);
};

const lineList = (rows: { key: string; count: number }[]) =>
    rows.map((r) => `${r.key}: ${r.count}`).join('  ·  ') || '—';

/**
 * Build and auto-download a PDF report (no popup / print dialog).
 */
export function downloadProjectPdfReport(
    projects: TaraProject[],
    scope: ProjectReportScope,
): void {
    const stamp = new Date();
    const s = summarizeProjects(projects);
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    const marginX = 14;
    let y = 14;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('TARA PAMIMAROPA — Project Report', marginX, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(
        'Tracking of Accomplishments and Results of Activities and Programs · MIMAROPA',
        marginX,
        y,
    );
    y += 5;
    doc.text(`Generated ${stamp.toLocaleString('en-PH')}`, marginX, y);
    y += 5;
    doc.setTextColor(3, 105, 161);
    doc.setFont('helvetica', 'bold');
    doc.text(`Scope: ${scope.label}`, marginX, y);
    doc.setTextColor(15, 23, 42);
    y += 8;

    const summaryRows: [string, string][] = [
        ['Total projects', String(s.total)],
        ['Active', String(s.active)],
        ['Completed', String(s.completed)],
        ['Delayed / On hold', `${s.delayed} / ${s.onHold}`],
        ['Beneficiaries', formatCompact(s.beneficiaries)],
        ['Funding released', formatPeso(s.funding)],
        ['Funding utilized', formatPeso(s.utilized)],
        ['Municipalities', String(s.municipalities)],
    ];

    autoTable(doc, {
        startY: y,
        head: [['Summary', 'Value']],
        body: summaryRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [15, 56, 168], textColor: 255 },
        columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 60 } },
        margin: { left: marginX, right: marginX },
        tableWidth: 120,
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('By status', marginX, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const statusLines = doc.splitTextToSize(
        lineList(countBy(projects, (p) => projectStatusLabel(p))),
        270,
    );
    doc.text(statusLines, marginX, y);
    y += statusLines.length * 4 + 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('By program', marginX, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const programLines = doc.splitTextToSize(
        lineList(countBy(projects, (p) => p.program)),
        270,
    );
    doc.text(programLines, marginX, y);
    y += programLines.length * 4 + 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('By province', marginX, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const provinceLines = doc.splitTextToSize(
        lineList(countBy(projects, (p) => p.province)),
        270,
    );
    doc.text(provinceLines, marginX, y);
    y += provinceLines.length * 4 + 6;

    doc.setTextColor(15, 23, 42);

    autoTable(doc, {
        startY: y,
        head: [
            [
                'Project',
                'Program',
                'Location',
                'Status',
                'Progress',
                'Budget',
                'Beneficiaries',
                'End',
            ],
        ],
        body: projects.map((p) => [
            p.name,
            p.program,
            `${p.province} / ${p.municipality}, ${p.barangay}`,
            projectStatusLabel(p),
            `${p.progress}%`,
            formatPeso(p.budget),
            formatCompact(p.beneficiaries),
            p.end_date || '—',
        ]),
        theme: 'striped',
        styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: {
            fillColor: [15, 56, 168],
            textColor: 255,
            fontSize: 7,
        },
        columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 28 },
            2: { cellWidth: 48 },
            3: { cellWidth: 24 },
            4: { cellWidth: 18, halign: 'right' },
            5: { cellWidth: 32, halign: 'right' },
            6: { cellWidth: 26, halign: 'right' },
            7: { cellWidth: 22 },
        },
        margin: { left: marginX, right: marginX },
        didDrawPage: (data) => {
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(
                'DOST-MIMAROPA · TARA PAMIMAROPA public portfolio export.',
                marginX,
                doc.internal.pageSize.getHeight() - 8,
            );
            doc.text(
                `Page ${data.pageNumber}`,
                doc.internal.pageSize.getWidth() - marginX,
                doc.internal.pageSize.getHeight() - 8,
                { align: 'right' },
            );
            doc.setTextColor(15, 23, 42);
        },
    });

    const stem =
        scope.fileStem?.trim() ||
        `tara-report-${stamp.toISOString().slice(0, 10)}`;
    doc.save(`${stem}.pdf`);
}

/** @deprecated Use downloadProjectPdfReport — kept as alias for older call sites. */
export function openProjectPrintReport(
    projects: TaraProject[],
    scope: ProjectReportScope,
): boolean {
    downloadProjectPdfReport(projects, scope);
    return true;
}
