"use strict";

const reportState = {
  currentReport: null,
  charts: {
    status: null,
    monthly: null,
  },
  loading: false,
  exporting: false,
};

const el = {
  form: document.getElementById("reports-filter-form"),
  dateFrom: document.getElementById("filter-date-from"),
  dateTo: document.getElementById("filter-date-to"),
  status: document.getElementById("filter-report-status"),
  generateBtn: document.getElementById("generate-report-btn"),
  resetBtn: document.getElementById("reset-filters-btn"),
  exportPdfBtn: document.getElementById("export-pdf-btn"),
  exportCsvBtn: document.getElementById("export-csv-btn"),
  loading: document.getElementById("reports-loading"),
  error: document.getElementById("reports-error"),
  empty: document.getElementById("reports-empty"),
  tableWrapper: document.getElementById("reports-table-wrapper"),
  tbody: document.getElementById("reports-tbody"),
  count: document.getElementById("reports-count"),
  toast: document.getElementById("reports-toast"),
  toastIcon: document.getElementById("reports-toast-icon"),
  toastMsg: document.getElementById("reports-toast-msg"),
};

let toastTimer = null;

function tr(key, params) {
  return typeof t === "function" ? t(key, params) : key;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getFilters() {
  return {
    dateFrom: el.dateFrom.value,
    dateTo: el.dateTo.value,
    status: el.status.value,
  };
}

function isRtl() {
  return document.documentElement.dir === "rtl";
}

function isDark() {
  return document.documentElement.classList.contains("dark");
}

function chartTextColor() {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue("--text-muted")
      .trim() || "#6b7280"
  );
}

function chartGridColor() {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue("--border-light")
      .trim() || "#e5e7eb"
  );
}

function formatDate(iso) {
  if (!iso) return "-";
  const localeMap = { ar: "ar-DZ", fr: "fr-FR", en: "en-GB" };
  const lang = window.i18n?.getLanguage() || "en";
  return new Date(iso).toLocaleDateString(localeMap[lang] || "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function documentLabel(type) {
  const labels = {
    C20: tr("document.c20"),
    "Extrait de rôle": tr("document.taxRollExtract"),
    "Extrait de rÃ´le": tr("document.taxRollExtract"),
  };
  return labels[type] || type || "-";
}

function statusLabel(status) {
  const labels = {
    approved: tr("status.approved"),
    pending: tr("status.pending"),
    rejected: tr("status.rejected"),
  };
  return labels[status] || status || "-";
}

function statusBadge(status) {
  const safeStatus = ["approved", "pending", "rejected"].includes(status)
    ? status
    : "pending";
  return `
    <span class="report-status report-status--${safeStatus}">
      <i class="fa-solid fa-circle"></i>
      ${escapeHtml(statusLabel(status))}
    </span>
  `;
}

function showToast(message, isError = false) {
  el.toastMsg.textContent = message;
  el.toastIcon.className = isError
    ? "fa-solid fa-circle-exclamation rm-toast-icon"
    : "fa-solid fa-circle-check rm-toast-icon";
  el.toastIcon.style.color = isError
    ? "var(--status-rejected)"
    : "var(--status-approved)";
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), 3000);
}

function setLoading(state) {
  reportState.loading = state;
  el.generateBtn.disabled = state;
  el.resetBtn.disabled = state;
  el.loading.style.display = state ? "flex" : "none";
  if (state) {
    el.error.style.display = "none";
    el.empty.style.display = "none";
    el.tableWrapper.style.display = "none";
  }
}

function setExporting(button, state) {
  reportState.exporting = state;
  el.exportPdfBtn.disabled = state;
  el.exportCsvBtn.disabled = state;
  if (button) {
    button.classList.toggle("loading", state);
  }
}

function updateKpis(summary) {
  const total = summary?.totalRequests ?? 0;
  document.getElementById("kpi-total").textContent = total;
  document.getElementById("kpi-approved").textContent = summary?.approved ?? 0;
  document.getElementById("kpi-pending").textContent = summary?.pending ?? 0;
  document.getElementById("kpi-rejected").textContent = summary?.rejected ?? 0;
  document.getElementById("kpi-users").textContent = summary?.totalUsers ?? 0;
  document.getElementById("kpi-documents").textContent =
    summary?.totalDocuments ?? 0;
  document.getElementById("kpi-approval-rate").textContent = tr(
    "reports.approvalRate",
    {
      rate: summary?.approvalRate ?? 0,
    },
  );
  document.getElementById("kpi-rejection-rate").textContent = tr(
    "reports.rejectionRate",
    {
      rate: summary?.rejectionRate ?? 0,
    },
  );
}

function destroyChart(name) {
  if (reportState.charts[name]) {
    reportState.charts[name].destroy();
    reportState.charts[name] = null;
  }
}

function baseChartOptions() {
  const textColor = chartTextColor();
  const gridColor = chartGridColor();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        rtl: isRtl(),
        labels: {
          color: textColor,
          boxWidth: 12,
          usePointStyle: true,
        },
      },
      tooltip: {
        rtl: isRtl(),
        textDirection: isRtl() ? "rtl" : "ltr",
      },
    },
    scales: {
      x: {
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
      y: {
        beginAtZero: true,
        ticks: { color: textColor, precision: 0 },
        grid: { color: gridColor },
      },
    },
  };
}

function renderCharts(report) {
  if (typeof Chart === "undefined") {
    showToast(tr("reports.chartLoadFailed"), true);
    return;
  }

  destroyChart("status");
  destroyChart("monthly");

  const statusCanvas = document.getElementById("status-chart");
  const monthlyCanvas = document.getElementById("monthly-chart");

  const statusData = report.charts.byStatus || [];
  reportState.charts.status = new Chart(statusCanvas, {
    type: "pie",
    data: {
      labels: statusData.map((item) => statusLabel(item.status)),
      datasets: [
        {
          data: statusData.map((item) => item.count),
          backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
          borderColor: isDark() ? "#1e293b" : "#ffffff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      ...baseChartOptions(),
      scales: {},
    },
  });

  const monthlyOptions = baseChartOptions();
  reportState.charts.monthly = new Chart(monthlyCanvas, {
    type: "line",
    data: {
      labels: (report.charts.monthlyRequests || []).map((item) => item.month),
      datasets: [
        {
          label: tr("reports.requests"),
          data: (report.charts.monthlyRequests || []).map((item) => item.count),
          borderColor: "#035e7b",
          backgroundColor: "rgba(3, 94, 123, 0.12)",
          tension: 0.35,
          fill: true,
          pointRadius: 4,
        },
      ],
    },
    options: monthlyOptions,
  });
}

function renderTable(report) {
  const rows = report.data || [];
  el.count.textContent = tr("reports.rowsCount", { count: rows.length });

  if (!rows.length) {
    el.tableWrapper.style.display = "none";
    el.empty.style.display = "flex";
    el.tbody.innerHTML = "";
    return;
  }

  el.empty.style.display = "none";
  el.tableWrapper.style.display = "block";
  el.tbody.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td class="req-id">${escapeHtml(row.requestId)}</td>
        <td><span class="user-name">${escapeHtml(row.userName)}</span></td>
        <td class="report-nif">${escapeHtml(row.userNif)}</td>
        <td>${statusBadge(row.status)}</td>
        <td class="report-date">${escapeHtml(formatDate(row.submittedAt))}</td>
      </tr>
    `,
    )
    .join("");
}

function renderReport(report) {
  reportState.currentReport = report;
  updateKpis(report.summary);
  renderCharts(report);
  renderTable(report);
}

async function loadStats() {
  try {
    await apiGetAdminStats();
  } catch (err) {
    console.warn("[reports.js] Could not load global stats:", err);
  }
}

async function generateReport() {
  if (reportState.loading) return;
  setLoading(true);
  try {
    const report = await apiGenerateAdminReport(getFilters());
    el.error.style.display = "none";
    renderReport(report);
  } catch (err) {
    console.error("[reports.js] Report error:", err);
    el.error.style.display = "flex";
    el.tableWrapper.style.display = "none";
    showToast(tr("reports.generateFailed"), true);
  } finally {
    setLoading(false);
  }
}

async function exportReport(format, button) {
  if (reportState.exporting) return;
  setExporting(button, true);
  try {
    await apiExportAdminReport(format, getFilters());
    showToast(
      format === "pdf" ? tr("reports.pdfExported") : tr("reports.csvExported"),
    );
  } catch (err) {
    console.error("[reports.js] Export error:", err);
    showToast(tr("reports.exportFailed"), true);
  } finally {
    setExporting(button, false);
  }
}

function resetFilters() {
  el.dateFrom.value = "";
  el.dateTo.value = "";
  el.status.value = "";
  generateReport();
}

function rerenderForLocaleOrTheme() {
  if (!reportState.currentReport) return;
  renderReport(reportState.currentReport);
}

function initReportsPage() {
  el.form.addEventListener("submit", (event) => {
    event.preventDefault();
    generateReport();
  });
  el.resetBtn.addEventListener("click", resetFilters);
  el.exportPdfBtn.addEventListener("click", () =>
    exportReport("pdf", el.exportPdfBtn),
  );
  el.exportCsvBtn.addEventListener("click", () =>
    exportReport("csv", el.exportCsvBtn),
  );

  document.addEventListener("i18n:change", rerenderForLocaleOrTheme);

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.attributeName === "class")) {
      rerenderForLocaleOrTheme();
    }
  });
  observer.observe(document.documentElement, { attributes: true });

  loadStats();
  generateReport();
}

if (!window.__reportsInitialized) {
  window.__reportsInitialized = true;
  initReportsPage();
}
