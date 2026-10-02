import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    projectStatusLabel,
    type TaraProject,
} from '@/constants/taraProjects';
import { exportMethod } from '@/routes/region/programs/summary-graphs';

export type ReportChart = 'bar' | 'column' | 'donut';
export type ReportFormat = 'number' | 'peso';

export type ReportRow = { label: string; value: number; color: string };

export type ReportSection = {
    id: string;
    title: string;
    chart: ReportChart;
    format: ReportFormat;
    rows: ReportRow[];
};

export type ReportStat = { label: string; value: number; format: ReportFormat };

export type SummaryReport = {
    title: string;
    scopeLabel: string;
    stats: ReportStat[];
    sections: ReportSection[];
    /** Null when the project list is not part of the export. */
    projects: TaraProject[] | null;
};

const fileStem = () =>
    `tara-summary-report-${new Date().toISOString().slice(0, 10)}`;

/** Excel keeps the peso sign; the built-in PDF fonts cannot render it. */
const formatAmount = (value: number, format: ReportFormat, peso: string) => {
    if (format === 'number') {
        return new Intl.NumberFormat('en-PH').format(Math.round(value));
    }
    return `${peso}${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(value)}`;
};

const formatShort = (value: number, format: ReportFormat) => {
    const compact = new Intl.NumberFormat('en', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(value);
    return format === 'peso' ? `PHP ${compact}` : compact;
};

/* ── Excel (server renders native charts) ───────────────────────── */

const readXsrfToken = (): string => {
    const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith('XSRF-TOKEN='));
    return match ? decodeURIComponent(match.slice('XSRF-TOKEN='.length)) : '';
};

const saveBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

export async function downloadSummaryExcel(report: SummaryReport) {
    const response = await fetch(exportMethod.url(), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': readXsrfToken(),
        },
        body: JSON.stringify({
            title: report.title,
            scope_label: report.scopeLabel,
            stats: report.stats.map((s) => ({
                label: s.label,
                value: formatAmount(s.value, s.format, '₱'),
            })),
            sections: report.sections.map((s) => ({
                title: s.title,
                chart: s.chart,
                format: s.format,
                rows: s.rows,
            })),
            project_ids: report.projects
                ? report.projects
                      .map((p) => p.db_id)
                      .filter((id): id is number => typeof id === 'number')
                : null,
        }),
    });

    if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
            message?: string;
        };
        throw new Error(data.message || 'Could not build the Excel file.');
    }

    saveBlob(await response.blob(), `${fileStem()}.xlsx`);
}

/* ── PDF (drawn as vectors with jsPDF) ──────────────────────────── */

type Rgb = [number, number, number];

const INK: Rgb = [15, 23, 42];
const MUTED: Rgb = [100, 116, 139];
const LINE: Rgb = [226, 232, 240];
const SOFT: Rgb = [248, 250, 252];
const TRACK: Rgb = [241, 245, 249];

const hexToRgb = (hex: string): Rgb => {
    const clean = hex.replace('#', '');
    const n = Number.parseInt(clean.length === 6 ? clean : '334155', 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const fit = (doc: jsPDF, text: string, width: number) => {
    if (doc.getTextWidth(text) <= width) return text;
    let out = text;
    while (out.length > 1 && doc.getTextWidth(`${out}...`) > width) {
        out = out.slice(0, -1);
    }
    return `${out}...`;
};

const PAGE = { w: 210, h: 297, margin: 14, footer: 14 };
const CARD_H = 84;
const BAR_LIMIT = 10;

const drawBar = (
    doc: jsPDF,
    section: ReportSection,
    x: number,
    y: number,
    w: number,
) => {
    const rows = section.rows.slice(0, BAR_LIMIT);
    const max = Math.max(1, ...rows.map((r) => r.value));
    const labelW = w * 0.36;
    const valueW = 20;
    const trackW = w - labelW - valueW - 4;
    const step = Math.min(6.4, (CARD_H - 20) / Math.max(rows.length, 1));

    doc.setFontSize(7);
    rows.forEach((row, i) => {
        const rowY = y + i * step;
        doc.setTextColor(...INK);
        doc.text(fit(doc, row.label, labelW - 2), x, rowY + 2.6);
        doc.setFillColor(...TRACK);
        doc.roundedRect(x + labelW, rowY, trackW, 3.4, 1.2, 1.2, 'F');
        const barW = Math.max((row.value / max) * trackW, row.value > 0 ? 1.5 : 0);
        if (barW > 0) {
            doc.setFillColor(...hexToRgb(row.color));
            doc.roundedRect(x + labelW, rowY, barW, 3.4, 1.2, 1.2, 'F');
        }
        doc.setTextColor(...MUTED);
        doc.text(formatShort(row.value, section.format), x + w, rowY + 2.6, {
            align: 'right',
        });
    });

    if (section.rows.length > BAR_LIMIT) {
        doc.setFontSize(6.5);
        doc.setTextColor(...MUTED);
        doc.text(
            `Top ${BAR_LIMIT} of ${section.rows.length} shown. Full list in Excel export.`,
            x,
            y + rows.length * step + 3,
        );
    }
};

const drawColumn = (
    doc: jsPDF,
    section: ReportSection,
    x: number,
    y: number,
    w: number,
) => {
    const rows = section.rows.slice(-12);
    const max = Math.max(1, ...rows.map((r) => r.value));
    const chartH = CARD_H - 32;
    const slot = w / Math.max(rows.length, 1);
    const barW = Math.min(9, slot * 0.6);
    const base = y + chartH + 4;

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    [0.5, 1].forEach((g) => doc.line(x, base - chartH * g, x + w, base - chartH * g));
    doc.line(x, base, x + w, base);

    doc.setFontSize(6.5);
    rows.forEach((row, i) => {
        const cx = x + slot * i + slot / 2;
        const h = (row.value / max) * chartH;
        doc.setFillColor(...hexToRgb(row.color));
        doc.rect(cx - barW / 2, base - h, barW, h, 'F');
        doc.setTextColor(...INK);
        doc.text(formatShort(row.value, section.format), cx, base - h - 1.2, {
            align: 'center',
        });
        doc.setTextColor(...MUTED);
        doc.text(fit(doc, row.label, slot - 1), cx, base + 4, {
            align: 'center',
        });
    });
};

const drawDonut = (
    doc: jsPDF,
    section: ReportSection,
    x: number,
    y: number,
    w: number,
) => {
    const total = section.rows.reduce((s, r) => s + r.value, 0) || 1;
    const outer = 17;
    const inner = 10.5;
    const cx = x + outer + 2;
    const cy = y + outer + 4;
    let angle = -Math.PI / 2;

    section.rows.forEach((row) => {
        const sweep = (row.value / total) * Math.PI * 2;
        if (sweep <= 0) return;
        const steps = Math.max(2, Math.ceil(sweep / (Math.PI / 48)));
        const points: [number, number][] = [];
        for (let i = 0; i <= steps; i++) {
            const a = angle + (sweep * i) / steps;
            points.push([cx + outer * Math.cos(a), cy + outer * Math.sin(a)]);
        }
        for (let i = steps; i >= 0; i--) {
            const a = angle + (sweep * i) / steps;
            points.push([cx + inner * Math.cos(a), cy + inner * Math.sin(a)]);
        }
        const deltas = points
            .slice(1)
            .map(([px, py], i) => [px - points[i][0], py - points[i][1]]);
        doc.setFillColor(...hexToRgb(row.color));
        doc.lines(deltas, points[0][0], points[0][1], [1, 1], 'F', true);
        angle += sweep;
    });

    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(formatShort(total, section.format), cx, cy + 1, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.text('TOTAL', cx, cy + 4.5, { align: 'center' });

    const legendX = x + outer * 2 + 6;
    const legendW = x + w - legendX;
    doc.setFontSize(6.8);
    section.rows.slice(0, 9).forEach((row, i) => {
        const ly = y + 4 + i * 6;
        const valueText = `${formatShort(row.value, section.format)} (${Math.round((row.value / total) * 100)}%)`;
        const labelW = legendW - 4 - doc.getTextWidth(valueText) - 2;
        doc.setFillColor(...hexToRgb(row.color));
        doc.circle(legendX + 1.2, ly - 0.9, 1.2, 'F');
        doc.setTextColor(...INK);
        doc.text(fit(doc, row.label, labelW), legendX + 4, ly);
        doc.setTextColor(...MUTED);
        doc.text(valueText, x + w, ly, { align: 'right' });
    });
};

const drawCard = (
    doc: jsPDF,
    section: ReportSection,
    x: number,
    y: number,
    w: number,
) => {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, CARD_H, 2.5, 2.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(fit(doc, section.title, w - 10), x + 5, y + 8);
    doc.setFont('helvetica', 'normal');

    const innerX = x + 5;
    const innerY = y + 14;
    const innerW = w - 10;
    if (section.chart === 'donut') drawDonut(doc, section, innerX, innerY, innerW);
    else if (section.chart === 'column') drawColumn(doc, section, innerX, innerY, innerW);
    else drawBar(doc, section, innerX, innerY, innerW);
};

export function downloadSummaryPdf(report: SummaryReport) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const { margin } = PAGE;
    const contentW = PAGE.w - margin * 2;
    const generated = new Date().toLocaleString('en-PH', {
        dateStyle: 'long',
        timeStyle: 'short',
    });

    doc.setFillColor(...INK);
    doc.rect(0, 0, PAGE.w, 4, 'F');

    let y = 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('TARA PAMIMAROPA  ·  DOST-MIMAROPA', margin, y);
    doc.text(generated, PAGE.w - margin, y, { align: 'right' });

    y += 9;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...INK);
    doc.text(report.title, margin, y);

    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(report.scopeLabel, margin, y);

    y += 5;
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.6);
    doc.line(margin, y, PAGE.w - margin, y);
    y += 7;

    if (report.stats.length > 0) {
        const cols = 3;
        const gap = 4;
        const tileW = (contentW - gap * (cols - 1)) / cols;
        const tileH = 18;
        report.stats.forEach((stat, i) => {
            const tx = margin + (i % cols) * (tileW + gap);
            const ty = y + Math.floor(i / cols) * (tileH + gap);
            doc.setFillColor(...SOFT);
            doc.setDrawColor(...LINE);
            doc.setLineWidth(0.3);
            doc.roundedRect(tx, ty, tileW, tileH, 2, 2, 'FD');
            doc.setFontSize(7);
            doc.setTextColor(...MUTED);
            doc.text(stat.label.toUpperCase(), tx + 4, ty + 6);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(...INK);
            doc.text(
                fit(doc, formatAmount(stat.value, stat.format, 'PHP '), tileW - 8),
                tx + 4,
                ty + 13.5,
            );
            doc.setFont('helvetica', 'normal');
        });
        y += Math.ceil(report.stats.length / cols) * (tileH + gap) + 4;
    }

    const gap = 6;
    const cardW = (contentW - gap) / 2;
    report.sections.forEach((section, i) => {
        const col = i % 2;
        if (col === 0 && y + CARD_H > PAGE.h - PAGE.footer - 4) {
            doc.addPage();
            y = 18;
        }
        drawCard(doc, section, margin + col * (cardW + gap), y, cardW);
        if (col === 1 || i === report.sections.length - 1) y += CARD_H + gap;
    });

    if (report.projects && report.projects.length > 0) {
        doc.addPage();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...INK);
        doc.text(`Project list (${report.projects.length})`, margin, 18);

        autoTable(doc, {
            startY: 23,
            head: [['Project', 'Program', 'Location', 'Status', 'Year', 'Cost (PHP)']],
            body: report.projects.map((p) => [
                p.name,
                p.type || p.program,
                [p.barangay, p.municipality, p.province].filter(Boolean).join(', '),
                projectStatusLabel(p),
                String(p.year_approved ?? ''),
                new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(p.budget),
            ]),
            theme: 'plain',
            styles: { fontSize: 7, cellPadding: 1.8, textColor: INK, overflow: 'linebreak' },
            headStyles: { fillColor: INK, textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: SOFT },
            columnStyles: {
                0: { cellWidth: 56 },
                1: { cellWidth: 26 },
                2: { cellWidth: 46 },
                3: { cellWidth: 18 },
                4: { cellWidth: 11 },
                5: { cellWidth: 25, halign: 'right' },
            },
            margin: { left: margin, right: margin, bottom: PAGE.footer + 4 },
        });
    }

    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
        doc.setPage(page);
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.3);
        doc.line(margin, PAGE.h - PAGE.footer, PAGE.w - margin, PAGE.h - PAGE.footer);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(
            'Information & Monitoring of Projects, Services and S&T Interventions · DOST-MIMAROPA',
            margin,
            PAGE.h - PAGE.footer + 5,
        );
        doc.text(`Page ${page} of ${pages}`, PAGE.w - margin, PAGE.h - PAGE.footer + 5, {
            align: 'right',
        });
    }

    doc.save(`${fileStem()}.pdf`);
}
