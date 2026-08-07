import { openHtmlPrintDialog } from "@/lib/print-html";

export type TeacherDayListPdfRow = {
  time: string;
  student: string;
  instrument: string;
};

export type TeacherDayListPdfLabels = {
  title: string;
  subtitle: string;
  time: string;
  student: string;
  instrument: string;
  empty: string;
  printHint: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildTeacherDayListHtml(
  labels: TeacherDayListPdfLabels,
  rows: TeacherDayListPdfRow[],
) {
  const bodyRows =
    rows.length === 0
      ? `<tr><td colspan="3">${escapeHtml(labels.empty)}</td></tr>`
      : rows
          .map(
            (row) => `<tr>
  <td>${escapeHtml(row.time)}</td>
  <td>${escapeHtml(row.student)}</td>
  <td>${escapeHtml(row.instrument)}</td>
</tr>`,
          )
          .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(labels.title)}</title>
  <style>
    @page { margin: 0.75in; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111827;
      font-family: "Helvetica Neue", Helvetica, Arial, "PingFang SC",
        "Microsoft YaHei", "Noto Sans SC", sans-serif;
      font-size: 12pt;
      line-height: 1.4;
    }
    h1 {
      margin: 0 0 4px;
      font-size: 18pt;
      font-weight: 700;
    }
    .subtitle {
      margin: 0 0 20px;
      color: #4b5563;
      font-size: 11pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 8px 10px;
      border-bottom: 1px solid #d1d5db;
      text-align: left;
      vertical-align: top;
    }
    th {
      border-bottom: 2px solid #111827;
      font-size: 10pt;
      font-weight: 700;
      text-transform: none;
    }
    .hint {
      margin-top: 24px;
      color: #6b7280;
      font-size: 9pt;
    }
    @media print {
      .hint { display: none; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(labels.title)}</h1>
  <p class="subtitle">${escapeHtml(labels.subtitle)}</p>
  <table>
    <thead>
      <tr>
        <th>${escapeHtml(labels.time)}</th>
        <th>${escapeHtml(labels.student)}</th>
        <th>${escapeHtml(labels.instrument)}</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>
  <p class="hint">${escapeHtml(labels.printHint)}</p>
</body>
</html>`;
}

/** Opens a print dialog so the browser can save/share a PDF copy. */
export function openTeacherDayListPdf(
  labels: TeacherDayListPdfLabels,
  rows: TeacherDayListPdfRow[],
) {
  return openHtmlPrintDialog(
    buildTeacherDayListHtml(labels, rows),
    labels.title,
  );
}
