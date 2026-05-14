"use strict";

const adminService = sessionStorage.getItem("service") || "";
const adminId = sessionStorage.getItem("userId") || "";

//  Helpers
function tr(key, params) {
  return typeof t === "function" ? t(key, params) : key;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return tr("dashboard.goodMorning");
  if (h < 18) return tr("dashboard.goodAfternoon");
  return tr("dashboard.goodEvening");
}

function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function setHTML(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function getDocumentLabel(type) {
  const map = {
    C20: tr("document.c20"),
    "Extrait de rôle": tr("document.taxRollExtract"),
  };
  return map[type] || type || "—";
}

//  Compliance — always recomputed
function computeCompliance(taxRecords) {
  if (!taxRecords || taxRecords.length === 0) return false;
  return taxRecords.every((r) => {
    const total = r.principal + r.penalties;
    const paid = r.paidPrincipal + r.paidPenalties;
    return paid >= total;
  });
}

// Init
async function initAdminDashboard() {
  try {
    const allRequests = await apiGetAdminDashboard();

    //  Welcome banner
    const firstName = sessionStorage.getItem("userFirstName") || "Admin";
    setText("welcome-title", `${getGreeting()}, ${firstName}`);

    const pending = allRequests.filter((r) => r.status === "pending").length;
    const approved = allRequests.filter((r) => r.status === "approved").length;
    const rejected = allRequests.filter((r) => r.status === "rejected").length;
    const total = allRequests.length;

    if (pending > 0) {
      setText(
        "welcome-sub",
        tr("dashboard.adminPendingSub", {
          count: pending,
          plural: pending > 1 ? "s" : "",
        }),
      );
    } else {
      setText("welcome-sub", tr("dashboard.adminNoPendingSub"));
    }

    // Service badge
    const serviceBadge = document.getElementById("service-badge");
    if (serviceBadge) {
      const icon =
        adminService === "C20"
          ? "fa-regular fa-file-lines"
          : "fa-solid fa-receipt";
      serviceBadge.innerHTML = `<i class="${icon}"></i> ${getDocumentLabel(adminService)}`;
    }

    //  Stats
    setText("stat-total", total);
    setText("stat-pending", pending);
    setText("stat-approved", approved);
    setText("stat-rejected", rejected);

    setHTML(
      "stat-total-sub",
      total > 0
        ? `<i class="fa-solid fa-layer-group"></i> ${total} ${tr("requests.received")}`
        : tr("requests.noRequestsYet"),
    );
    setHTML(
      "stat-pending-sub",
      pending > 0
        ? `<i class="fa-regular fa-clock"></i> ${tr("requests.awaitingReview")}`
        : tr("requests.nonePending"),
    );
    setHTML(
      "stat-approved-sub",
      approved > 0
        ? `<i class="fa-solid fa-arrow-trend-up"></i> ${approved} ${tr("requests.processed")}`
        : tr("requests.noneYet"),
    );
    setHTML(
      "stat-rejected-sub",
      rejected > 0
        ? `<i class="fa-solid fa-arrow-trend-down"></i> ${rejected} ${tr("requests.declined")}`
        : tr("requests.noneRejected"),
    );

    //  Pending requests table
    const pendingRequests = allRequests
      .filter((r) => r.status === "pending")
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 5);

    const tbody = document.getElementById("pending-tbody");
    const emptyState = document.getElementById("empty-pending");
    const tableWrapper = document.getElementById("pending-table-wrapper");

    if (pendingRequests.length === 0) {
      if (emptyState) emptyState.style.display = "flex";
      if (tableWrapper) tableWrapper.style.display = "none";
    } else {
      if (emptyState) emptyState.style.display = "none";
      if (tableWrapper) tableWrapper.style.display = "block";

      tbody.innerHTML = pendingRequests
        .map((req) => {
          const isCompliant = computeCompliance(req._taxRecords);
          const compBadge = isCompliant
            ? `<span class="compliance-badge compliance-badge--ok"><i class="fa-solid fa-circle-check"></i> ${tr("status.upToDate")}</span>`
            : `<span class="compliance-badge compliance-badge--nok"><i class="fa-solid fa-circle-xmark"></i> ${tr("status.notUpToDate")}</span>`;

          return `
          <tr>
            <td class="req-id">
              ${req.requestId}
              ${
                req.documentType === "C20" && req.year
                  ? `<div class="req-year">${tr("requests.year")}: ${req.year}</div>`
                  : ""
              }
            </td>
            <td><span class="user-name">${req._fullName}</span></td>
            <td class="req-date">${formatDate(req.submittedAt)}</td>
            <td>${compBadge}</td>
            <td>
              <button type="button" class="btn-review" data-id="${req.requestId}">
                <i class="fa-solid fa-pen-to-square"></i> ${tr("requests.review")}
              </button>
            </td>
          </tr>
        `;
        })
        .join("");

      // Wire Review buttons → navigate to requests-management with ?id=
      tbody.querySelectorAll(".btn-review").forEach((btn) => {
        btn.onclick = () => {
          const target = `requests-management.html?id=${btn.dataset.id}`;
          if (!window.location.href.includes(target)) {
            window.location.href = target;
          }
        };
      });
    }
  } catch (err) {
    console.error("[admin-dashboard.js] Error:", err);
  }
}

if (!window.__adminDashboardInitialized) {
  window.__adminDashboardInitialized = true;
  initAdminDashboard();
  document.addEventListener("i18n:change", initAdminDashboard);
}
