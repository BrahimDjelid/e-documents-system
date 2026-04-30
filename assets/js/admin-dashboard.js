"use strict";

const adminService = sessionStorage.getItem("service") || "";
const adminId = sessionStorage.getItem("userId") || "";

//  Helpers
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
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
        `You have ${pending} pending request${pending > 1 ? "s" : ""} awaiting your review.`,
      );
    } else {
      setText(
        "welcome-sub",
        "All requests are up to date. No pending reviews.",
      );
    }

    // Service badge
    const serviceBadge = document.getElementById("service-badge");
    if (serviceBadge) {
      const icon =
        adminService === "C20"
          ? "fa-regular fa-file-lines"
          : "fa-solid fa-receipt";
      serviceBadge.innerHTML = `<i class="${icon}"></i> ${adminService || "—"}`;
    }

    //  Stats
    setText("stat-total", total);
    setText("stat-pending", pending);
    setText("stat-approved", approved);
    setText("stat-rejected", rejected);

    setHTML(
      "stat-total-sub",
      total > 0
        ? `<i class="fa-solid fa-layer-group"></i> ${total} received`
        : "No requests yet",
    );
    setHTML(
      "stat-pending-sub",
      pending > 0
        ? `<i class="fa-regular fa-clock"></i> Awaiting review`
        : "None pending",
    );
    setHTML(
      "stat-approved-sub",
      approved > 0
        ? `<i class="fa-solid fa-arrow-trend-up"></i> ${approved} processed`
        : "None yet",
    );
    setHTML(
      "stat-rejected-sub",
      rejected > 0
        ? `<i class="fa-solid fa-arrow-trend-down"></i> ${rejected} declined`
        : "None rejected",
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
            ? `<span class="compliance-badge compliance-badge--ok"><i class="fa-solid fa-circle-check"></i> À jour</span>`
            : `<span class="compliance-badge compliance-badge--nok"><i class="fa-solid fa-circle-xmark"></i> Non à jour</span>`;

          return `
          <tr>
            <td class="req-id">
              ${req.requestId}
              ${
                req.documentType === "C20" && req.year
                  ? `<div class="req-year">Year: ${req.year}</div>`
                  : ""
              }
            </td>
            <td><span class="user-name">${req._fullName}</span></td>
            <td class="req-date">${formatDate(req.submittedAt)}</td>
            <td>${compBadge}</td>
            <td>
              <button class="btn-review" data-id="${req.requestId}">
                <i class="fa-solid fa-pen-to-square"></i> Review
              </button>
            </td>
          </tr>
        `;
        })
        .join("");

      // Wire Review buttons → navigate to requests-management with ?id=
      tbody.querySelectorAll(".btn-review").forEach((btn) => {
        btn.addEventListener("click", () => {
          window.location.href = `requests-management.html?id=${btn.dataset.id}`;
        });
      });
    }
  } catch (err) {
    console.error("[admin-dashboard.js] Error:", err);
  }
}

initAdminDashboard();
