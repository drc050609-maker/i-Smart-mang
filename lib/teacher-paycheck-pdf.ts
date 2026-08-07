import { openHtmlPrintDialog } from "@/lib/print-html";

export type TeacherPaycheckPdfLine = {
  classLabel: string;
  sessions: string;
  rate: string;
  subtotal: string;
};

export type TeacherPaycheckPdfLabels = {
  title: string;
  subtitle: string;
  classLabel: string;
  sessions: string;
  rate: string;
  subtotal: string;
  total: string;
  totalAmount: string;
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

function buildTeacherPaycheckHtml(
  labels: TeacherPaycheckPdfLabels,
  lines: TeacherPaycheckPdfLine[],
) {
  const bodyRows =
    lines.length === 0
      ? `<tr><td colspan="4"></td></tr>`
      : lines
          .map(
            (line) => `<tr>
  <td>${escapeHtml(line.classLabel)}</td>
  <td class="num">${escapeHtml(line.sessions)}</td>
  <td class="num">${escapeHtml(line.rate)}</td>
  <td class="num">${escapeHtml(line.subtotal)}</td>
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
    }
    td.num, th.num {
      text-align: right;
      white-space: nowrap;
    }
    tfoot td {
      border-bottom: none;
      padding-top: 12px;
      font-weight: 700;
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
        <th>${escapeHtml(labels.classLabel)}</th>
        <th class="num">${escapeHtml(labels.sessions)}</th>
        <th class="num">${escapeHtml(labels.rate)}</th>
        <th class="num">${escapeHtml(labels.subtotal)}</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3">${escapeHtml(labels.total)}</td>
        <td class="num">${escapeHtml(labels.totalAmount)}</td>
      </tr>
    </tfoot>
  </table>
  <p class="hint">${escapeHtml(labels.printHint)}</p>
</body>
</html>`;
}

/** Opens a print dialog so the browser can save/share a PDF copy. */
export function openTeacherPaycheckPdf(
  labels: TeacherPaycheckPdfLabels,
  lines: TeacherPaycheckPdfLine[],
) {
  return openHtmlPrintDialog(
    buildTeacherPaycheckHtml(labels, lines),
    labels.title,
  );
}
