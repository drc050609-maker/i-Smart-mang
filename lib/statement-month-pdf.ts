import { openHtmlPrintDialog } from "@/lib/print-html";

export type StatementMonthPdfEntry = {
  date: string;
  description: string;
  amount: string;
  category?: string;
};

export type StatementMonthPdfLabels = {
  title: string;
  totalIncome: string;
  fixedExpenses: string;
  variableExpenses: string;
  net: string;
  income: string;
  expenses: string;
  date: string;
  description: string;
  amount: string;
  category: string;
  noIncome: string;
  noExpenses: string;
  printHint: string;
  incomeTotal: string;
  expenseTotal: string;
  fixedTotal: string;
  variableTotal: string;
  netTotal: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function entryRowsHtml(
  entries: StatementMonthPdfEntry[],
  emptyMessage: string,
  includeCategory: boolean,
) {
  if (entries.length === 0) {
    const colspan = includeCategory ? 4 : 3;
    return `<tr><td colspan="${colspan}">${escapeHtml(emptyMessage)}</td></tr>`;
  }

  return entries
    .map((entry) => {
      const categoryCell = includeCategory
        ? `<td>${escapeHtml(entry.category ?? "")}</td>`
        : "";
      return `<tr>
  <td>${escapeHtml(entry.date)}</td>
  <td>${escapeHtml(entry.description)}</td>
  ${categoryCell}
  <td class="amount">${escapeHtml(entry.amount)}</td>
</tr>`;
    })
    .join("\n");
}

function buildStatementMonthHtml(
  labels: StatementMonthPdfLabels,
  incomeEntries: StatementMonthPdfEntry[],
  expenseEntries: StatementMonthPdfEntry[],
) {
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
      margin: 0 0 16px;
      font-size: 18pt;
      font-weight: 700;
    }
    h2 {
      margin: 0 0 8px;
      font-size: 13pt;
      font-weight: 700;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
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
    .section {
      margin-bottom: 24px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
    }
    .section-total {
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
    td.amount, th.amount {
      text-align: right;
      white-space: nowrap;
    }
    .hint {
      margin-top: 24px;
      color: #6b7280;
      font-size: 9pt;
    }
    @media print {
      .hint { display: none; }
      .summary-card { break-inside: avoid; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(labels.title)}</h1>
  <div class="summary">
    <div class="summary-card">
      <div class="label">${escapeHtml(labels.totalIncome)}</div>
      <div class="value">${escapeHtml(labels.incomeTotal)}</div>
    </div>
    <div class="summary-card">
      <div class="label">${escapeHtml(labels.fixedExpenses)}</div>
      <div class="value">${escapeHtml(labels.fixedTotal)}</div>
    </div>
    <div class="summary-card">
      <div class="label">${escapeHtml(labels.variableExpenses)}</div>
      <div class="value">${escapeHtml(labels.variableTotal)}</div>
    </div>
    <div class="summary-card">
      <div class="label">${escapeHtml(labels.net)}</div>
      <div class="value">${escapeHtml(labels.netTotal)}</div>
    </div>
  </div>

  <section class="section">
    <div class="section-header">
      <h2>${escapeHtml(labels.income)}</h2>
      <div class="section-total">${escapeHtml(labels.incomeTotal)}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>${escapeHtml(labels.date)}</th>
          <th>${escapeHtml(labels.description)}</th>
          <th class="amount">${escapeHtml(labels.amount)}</th>
        </tr>
      </thead>
      <tbody>
        ${entryRowsHtml(incomeEntries, labels.noIncome, false)}
      </tbody>
    </table>
  </section>

  <section class="section">
    <div class="section-header">
      <h2>${escapeHtml(labels.expenses)}</h2>
      <div class="section-total">${escapeHtml(labels.expenseTotal)}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>${escapeHtml(labels.date)}</th>
          <th>${escapeHtml(labels.description)}</th>
          <th>${escapeHtml(labels.category)}</th>
          <th class="amount">${escapeHtml(labels.amount)}</th>
        </tr>
      </thead>
      <tbody>
        ${entryRowsHtml(expenseEntries, labels.noExpenses, true)}
      </tbody>
    </table>
  </section>

  <p class="hint">${escapeHtml(labels.printHint)}</p>
</body>
</html>`;
}

/** Opens a print dialog so the browser can save/share a PDF copy. */
export function openStatementMonthPdf(
  labels: StatementMonthPdfLabels,
  incomeEntries: StatementMonthPdfEntry[],
  expenseEntries: StatementMonthPdfEntry[],
) {
  return openHtmlPrintDialog(
    buildStatementMonthHtml(labels, incomeEntries, expenseEntries),
    labels.title,
  );
}
