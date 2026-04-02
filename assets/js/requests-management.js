// requests-management.js - Admin Request Management
//
// Loads all requests from users.json, filters by
// admin service (sessionStorage.service), allows
// status updates stored in localStorage (mock).
//
// When Flask is ready:
//   GET  /api/requests          -> replace loadRequests()
//   POST /api/requests/{id}/decision -> replace saveDecision()

"use strict";

// Session
const adminId = sessionStorage.getItem("userId") || "";
const adminService = sessionStorage.getItem("service") || "";

// State
let allRequests = []; // all requests for this admin's service
let activeRequest = null; // request currently open in modal
let selectedStatus = null;

// DOM refs
const searchInput = document.getElementById("search-input");
const searchClear = document.getElementById("search-clear");
const filterStatus = document.getElementById("filter-status");
const resultsCount = document.getElementById("results-count");
const tbody = document.getElementById("rm-tbody");
const tableWrapper = document.getElementById("table-wrapper");
const emptyNoData = document.getElementById("empty-no-data");
const emptyNoResults = document.getElementById("empty-no-results");

// banner
const serviceTitle = document.getElementById("service-title");
const serviceIcon = document.getElementById("service-icon");

// modal
const backdrop = document.getElementById("modal-backdrop");
const modalReqId = document.getElementById("modal-req-id");
const modalUserName = document.getElementById("modal-user-name");
const modalNif = document.getElementById("modal-nif");
const modalDob = document.getElementById("modal-dob");
const modalPhone = document.getElementById("modal-phone");
const modalEmail = document.getElementById("modal-email");
const modalTaxRegime = document.getElementById("modal-tax-regime");
const modalCompliance = document.getElementById("modal-compliance-badge");
const modalRec = document.getElementById("modal-recommendation-badge");
const modalTaxSection = document.getElementById("modal-tax-records-section");
const modalTaxTbody = document.getElementById("modal-tax-records-tbody");
const modalNotes = document.getElementById("modal-notes");
const modalClose = document.getElementById("modal-close");
const modalCancel = document.getElementById("modal-cancel");
const modalSave = document.getElementById("modal-save");
const statusOptions = document.querySelectorAll(".status-option");

// toast
const toast = document.getElementById("rm-toast");
const toastIcon = document.getElementById("rm-toast-icon");
const toastMsg = document.getElementById("rm-toast-msg");

let toastTimer = null;

// Helpers
function formatDate(str) {
  if (!str) return "-";
  return new Date(str).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDOB(raw) {
  if (!raw) return "-";
  const [y, m, d] = raw.split("-");
  return `${d}/${m}/${y}`;
}

function showToast(msg, isError = false) {
  toastMsg.textContent = msg;
  toastIcon.className = isError
    ? "fa-solid fa-circle-exclamation rm-toast-icon"
    : "fa-solid fa-circle-check rm-toast-icon";
  toastIcon.style.color = isError
    ? "var(--status-rejected)"
    : "var(--status-approved)";
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

// Compliance - always recomputed, never trusted
function computeCompliance(taxRecords) {
  if (!taxRecords || taxRecords.length === 0) return false;
  return taxRecords.every((r) => {
    const total = r.principal + r.penalties;
    const paid = r.paidPrincipal + r.paidPenalties;
    return paid >= total;
  });
}

function getEffectiveStatus(req) {
  return req.status;
}

function getEffectiveNote(req) {
  return req.note || "";
}

// Setup service banner
function setupBanner() {
  if (serviceTitle) serviceTitle.textContent = adminService || "All Requests";
  if (serviceIcon && adminService === "Extrait de rôle") {
    serviceIcon.innerHTML = `<i class="fa-solid fa-receipt"></i>`;
  }
}

// Build stats
function updateStats() {
  const total = allRequests.length;
  const pending = allRequests.filter(
    (r) => getEffectiveStatus(r) === "pending",
  ).length;
  const approved = allRequests.filter(
    (r) => getEffectiveStatus(r) === "approved",
  ).length;
  const rejected = allRequests.filter(
    (r) => getEffectiveStatus(r) === "rejected",
  ).length;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-pending").textContent = pending;
  document.getElementById("stat-approved").textContent = approved;
  document.getElementById("stat-rejected").textContent = rejected;
}

// Render table
function renderTable(requests) {
  emptyNoData.style.display = "none";
  emptyNoResults.style.display = "none";
  tableWrapper.style.display = "block";

  if (allRequests.length === 0) {
    tableWrapper.style.display = "none";
    emptyNoData.style.display = "flex";
    resultsCount.textContent = "";
    return;
  }

  if (requests.length === 0) {
    tableWrapper.style.display = "none";
    emptyNoResults.style.display = "flex";
    resultsCount.textContent = "No results";
    return;
  }

  resultsCount.textContent = `Showing ${requests.length} of ${allRequests.length}`;

  tbody.innerHTML = requests
    .map((req) => {
      const isCompliant = computeCompliance(req._taxRecords);
      const effectStatus = getEffectiveStatus(req);

      const complianceHTML = isCompliant
        ? `<span class="compliance-badge compliance-badge--ok"><i class="fa-solid fa-circle-check"></i> À jour</span>`
        : `<span class="compliance-badge compliance-badge--nok"><i class="fa-solid fa-circle-xmark"></i> Non à jour</span>`;

      const recHTML = isCompliant
        ? `<span class="rec-badge rec-badge--approve"><i class="fa-solid fa-thumbs-up"></i> Approve</span>`
        : `<span class="rec-badge rec-badge--reject"><i class="fa-solid fa-thumbs-down"></i> Reject</span>`;

      const statusHTML = getStatusBadgeHTML(effectStatus);

      return `
      <tr>
        <td class="req-id">${req.requestId}</td>
        <td>
          <div class="user-name">${req._fullName}</div>
          <div class="user-date">${formatDate(req.submittedAt)}</div>
        </td>
        <td>${formatDate(req.submittedAt)}</td>
        <td>${complianceHTML}</td>
        <td>${recHTML}</td>
        <td>${statusHTML}</td>
        <td>
          <button class="btn-edit-status" data-id="${req.requestId}">
            <i class="fa-solid fa-pen-to-square"></i> Edit Status
          </button>
        </td>
      </tr>
    `;
    })
    .join("");

  // Wire edit buttons
  tbody.querySelectorAll(".btn-edit-status").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.dataset.id));
  });
}

function getStatusBadgeHTML(status) {
  const map = {
    approved: { cls: "status-badge--approved", label: "Approved" },
    pending: { cls: "status-badge--pending", label: "Pending" },
    rejected: { cls: "status-badge--rejected", label: "Rejected" },
  };
  const s = map[status] || { cls: "", label: status };
  return `<span class="status-badge ${s.cls}"><i class="fa-solid fa-circle"></i> ${s.label}</span>`;
}

// Filters
function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const status = filterStatus.value;

  searchClear.style.display = query ? "block" : "none";

  const filtered = allRequests.filter((req) => {
    const effectStatus = getEffectiveStatus(req);
    const matchSearch =
      !query ||
      req.requestId.toLowerCase().includes(query) ||
      req._fullName.toLowerCase().includes(query);
    const matchStatus = !status || effectStatus === status;
    return matchSearch && matchStatus;
  });

  renderTable(filtered);
}

// Modal
function openModal(requestId) {
  activeRequest = allRequests.find((r) => r.requestId === requestId);
  if (!activeRequest) return;

  const isCompliant = computeCompliance(activeRequest._taxRecords);
  const effectStatus = getEffectiveStatus(activeRequest);
  const effectNote = getEffectiveNote(activeRequest);

  // Header
  modalReqId.textContent = activeRequest.requestId;
  modalUserName.textContent = activeRequest._fullName;

  // Applicant info
  modalNif.textContent = activeRequest._nif || "-";
  modalDob.textContent = formatDOB(activeRequest._dob) || "-";
  modalPhone.textContent = activeRequest._phone || "-";
  modalEmail.textContent = activeRequest._email || "-";
  modalTaxRegime.textContent = activeRequest._taxRegime || "-";

  // Compliance
  if (isCompliant) {
    modalCompliance.className = "compliance-badge compliance-badge--ok";
    modalCompliance.innerHTML = `<i class="fa-solid fa-circle-check"></i> À jour`;
    modalRec.className = "rec-badge rec-badge--approve";
    modalRec.innerHTML = `<i class="fa-solid fa-thumbs-up"></i> Recommended: Approve`;
  } else {
    modalCompliance.className = "compliance-badge compliance-badge--nok";
    modalCompliance.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Non à jour`;
    modalRec.className = "rec-badge rec-badge--reject";
    modalRec.innerHTML = `<i class="fa-solid fa-thumbs-down"></i> Recommended: Reject`;
  }

  // Tax records (Extrait de rôle only)
  if (
    activeRequest.documentType === "Extrait de rôle" &&
    activeRequest._taxRecords?.length
  ) {
    modalTaxSection.style.display = "flex";
    modalTaxTbody.innerHTML = activeRequest._taxRecords
      .map((r) => {
        const total = r.principal + r.penalties;
        const paid = r.paidPrincipal + r.paidPenalties;
        const remaining = total - paid;
        const remCls =
          remaining <= 0 ? "tax-remaining--ok" : "tax-remaining--nok";
        return `
        <tr>
          <td><strong>${r.type}</strong></td>
          <td>${r.year}</td>
          <td>${r.principal.toLocaleString()} DA</td>
          <td>${r.penalties.toLocaleString()} DA</td>
          <td>${paid.toLocaleString()} DA</td>
          <td class="${remCls}">${remaining <= 0 ? "0 DA" : remaining.toLocaleString() + " DA"}</td>
        </tr>
      `;
      })
      .join("");
  } else {
    modalTaxSection.style.display = "none";
  }

  // Status selector
  selectedStatus = effectStatus;
  statusOptions.forEach((opt) => {
    opt.classList.toggle("selected", opt.dataset.status === effectStatus);
  });

  // Notes
  modalNotes.value = effectNote;

  backdrop.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  backdrop.classList.remove("open");
  document.body.style.overflow = "";
  activeRequest = null;
  selectedStatus = null;
}

// Status option selection
statusOptions.forEach((opt) => {
  opt.addEventListener("click", () => {
    selectedStatus = opt.dataset.status;
    statusOptions.forEach((o) => o.classList.remove("selected"));
    opt.classList.add("selected");
  });
});

// Save changes
modalSave.addEventListener("click", async () => {
  if (!activeRequest || !selectedStatus) return;

  const note = modalNotes.value.trim();

  try {
    await apiSaveDecision(activeRequest.requestId, selectedStatus, note);
  } catch (err) {
    showToast("Could not save decision. Please try again.", true);
    return;
  }

  // Update local state to reflect the saved decision immediately
  activeRequest.status = selectedStatus;
  activeRequest.note = note;

  closeModal();
  updateStats();
  applyFilters();

  const labels = {
    approved: "Request approved",
    rejected: "Request rejected",
    pending: "Request set to pending",
  };
  showToast(labels[selectedStatus] || "Status updated");
});

// Close events
modalClose.addEventListener("click", closeModal);
modalCancel.addEventListener("click", closeModal);
backdrop.addEventListener("click", (e) => {
  if (e.target === backdrop) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// Search / filter events
searchInput.addEventListener("input", applyFilters);
filterStatus.addEventListener("change", applyFilters);
searchClear.addEventListener("click", () => {
  searchInput.value = "";
  searchClear.style.display = "none";
  applyFilters();
  searchInput.focus();
});

// Load data
async function loadRequests() {
  try {
    allRequests = await apiGetRequests();

    // Sort: pending first, then by date descending
    allRequests.sort((a, b) => {
      const order = { pending: 0, approved: 1, rejected: 2 };
      const sa = order[getEffectiveStatus(a)] ?? 3;
      const sb = order[getEffectiveStatus(b)] ?? 3;
      if (sa !== sb) return sa - sb;
      return new Date(b.submittedAt) - new Date(a.submittedAt);
    });

    setupBanner();
    updateStats();
    renderTable(allRequests);

    // Set topbar title
    const pageTitle = document.getElementById("page-title");
    if (pageTitle) pageTitle.textContent = "Request Management";
  } catch (err) {
    console.error("[requests-management.js] Error loading data:", err);
    showToast("Could not load requests. Please try again.", true);
  }
}

// Init
loadRequests();
