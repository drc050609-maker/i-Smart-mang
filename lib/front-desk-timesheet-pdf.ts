import { openHtmlPrintDialog } from "@/lib/print-html";

export type FrontDeskTimesheetPdfLine = {
  date: string;
  clockIn: string;
  clockOut: string;
  duration: string;
  rate: string;
  pay: string;
  notes: string;
};

export type FrontDeskTimesheetPdfLabels = {
  title: string;
  subtitle: string;
  date: string;
  clockIn: string;
  clockOut: string;
  duration: string;
  rate: string;
  pay: string;
  notes: string;
  totalHours: string;
  totalHoursValue: string;
  totalPay: string;
  totalPayValue: string;
  empty: string;
  receivedAck: string;
  signature: string;
  signatureDate: string;
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

function buildFrontDeskTimesheetHtml(
  labels: FrontDeskTimesheetPdfLabels,
  lines: FrontDeskTimesheetPdfLine[],
) {
  const bodyRows =
    lines.length === 0
      ? `<tr><td colspan="7">${escapeHtml(labels.empty)}</td></tr>`
      : lines
          .map(
            (line) => `<tr>
  <td>${escapeHtml(line.date)}</td>
  <td class="num">${escapeHtml(line.clockIn)}</td>
  <td class="num">${escapeHtml(line.clockOut)}</td>
  <td class="num">${escapeHtml(line.duration)}</td>
  <td class="num">${escapeHtml(line.rate)}</td>
  <td class="num">${escapeHtml(line.pay)}</td>
  <td>${escapeHtml(line.notes)}</td>
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
      font-size: 11pt;
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
    .summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }
    .summary-card {
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .summary-card .label {
      color: #6b7280;
      font-size: 9pt;
    }
    .summary-card .value {
      margin-top: 4px;
      font-size: 14pt;
      font-weight: 700;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 7px 8px;
      border-bottom: 1px solid #d1d5db;
      text-align: left;
      vertical-align: top;
    }
    th {
      border-bottom: 2px solid #111827;
      font-size: 9pt;
      font-weight: 700;
    }
    td.num, th.num {
      text-align: right;
      white-space: nowrap;
    }
    .hint {
      margin-top: 24px;
      color: #6b7280;
      font-size: 9pt;
    }
    .signature-block {
      margin-top: 40px;
      page-break-inside: avoid;
    }
    .signature-ack {
      margin: 0 0 28px;
      font-size: 11pt;
    }
    .signature-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 32px;
    }
    .signature-field .line {
      border-bottom: 1px solid #111827;
      height: 36px;
    }
    .signature-field .label {
      margin-top: 6px;
      color: #4b5563;
      font-size: 10pt;
    }
    @media print {
      .hint { display: none; }
      .summary-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(labels.title)}</h1>
  <p class="subtitle">${escapeHtml(labels.subtitle)}</p>
  <div class="summary">
    <div class="summary-card">
      <div class="label">${escapeHtml(labels.totalHours)}</div>
      <div class="value">${escapeHtml(labels.totalHoursValue)}</div>
    </div>
    <div class="summary-card">
      <div class="label">${escapeHtml(labels.totalPay)}</div>
      <div class="value">${escapeHtml(labels.totalPayValue)}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>${escapeHtml(labels.date)}</th>
        <th class="num">${escapeHtml(labels.clockIn)}</th>
        <th class="num">${escapeHtml(labels.clockOut)}</th>
        <th class="num">${escapeHtml(labels.duration)}</th>
        <th class="num">${escapeHtml(labels.rate)}</th>
        <th class="num">${escapeHtml(labels.pay)}</th>
        <th>${escapeHtml(labels.notes)}</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>
  <div class="signature-block">
    <p class="signature-ack">${escapeHtml(labels.receivedAck)}</p>
    <div class="signature-row">
      <div class="signature-field">
        <div class="line"></div>
        <div class="label">${escapeHtml(labels.signature)}</div>
      </div>
      <div class="signature-field">
        <div class="line"></div>
        <div class="label">${escapeHtml(labels.signatureDate)}</div>
      </div>
    </div>
  </div>
  <p class="hint">${escapeHtml(labels.printHint)}</p>
</body>
</html>`;
}

/** Opens a print dialog so the browser can save/share a PDF copy. */
export function openFrontDeskTimesheetPdf(
  labels: FrontDeskTimesheetPdfLabels,
  lines: FrontDeskTimesheetPdfLine[],
) {
  return openHtmlPrintDialog(
    buildFrontDeskTimesheetHtml(labels, lines),
    labels.title,
  );
}
