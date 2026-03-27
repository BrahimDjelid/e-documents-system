const userId = sessionStorage.getItem("userId");

// Grab elements
const searchInput = document.getElementById("search-input");
const searchClear = document.getElementById("search-clear");
const filterType = document.getElementById("filter-type");
const filterStatus = document.getElementById("filter-status");
const resultsCount = document.getElementById("results-count");
const tbody = document.getElementById("docs-tbody");
const tableWrapper = document.getElementById("table-wrapper");
const emptyNoData = document.getElementById("empty-no-data");
const emptyNoResults = document.getElementById("empty-no-results");

// modal
const backdrop = document.getElementById("modal-backdrop");
const modalReqId = document.getElementById("modal-req-id");
const modalDocBadge = document.getElementById("modal-doc-badge");
const modalStatusBadge = document.getElementById("modal-status-badge");
const modalDate = document.getElementById("modal-date");
const modalNoteWrapper = document.getElementById("modal-note-wrapper");
const modalNote = document.getElementById("modal-note");
const modalDownload = document.getElementById("modal-download-wrapper");
const modalDownloadBtn = document.getElementById("modal-download-btn");
const modalClose = document.getElementById("modal-close");
const modalCloseBtn = document.getElementById("modal-close-btn");

// toast
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toast-msg");

// State
let allRequests = [];
let toastTimer = null;

// Helpers
function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDocBadgeClass(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("c20")) return "doc-badge doc-badge--c20";
  if (t.includes("extrait")) return "doc-badge doc-badge--extrait";
}

function getStatusBadgeHTML(status) {
  const map = {
    approved: { cls: "status-badge--approved", label: "Approved" },
    pending: { cls: "status-badge--pending", label: "Pending" },
    rejected: { cls: "status-badge--rejected", label: "Rejected" },
  };
  const s = map[status] || { cls: "", label: status };
  return `<span class="status-badge ${s.cls}">
    <i class="fa-solid fa-circle"></i>${s.label}
  </span>`;
}

function showToast(message) {
  toastMsg.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

function setHTML(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value;
}

// Render table
function renderTable(requests) {
  // Hide all states first
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
      const isApproved = req.status === "approved";
      return `
      <tr>
        <td class="req-id">${req.requestId}</td>
        <td><span class="${getDocBadgeClass(req.documentType)}">${req.documentType}</span></td>
        <td class="req-date">${formatDate(req.submittedAt)}</td>
        <td>${getStatusBadgeHTML(req.status)}</td>
        <td>
          <div class="actions-cell">
            ${
              isApproved
                ? `
              <button class="btn-dl" data-id="${req.requestId}">
                <i class="fa-solid fa-download"></i> Download
              </button>
            `
                : ""
            }
            <button class="btn-view" data-id="${req.requestId}">
              <i class="fa-regular fa-eye"></i> View
            </button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");

  // Wire row buttons
  tbody.querySelectorAll(".btn-view").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.dataset.id));
  });

  tbody.querySelectorAll(".btn-dl").forEach((btn) => {
    btn.addEventListener("click", () => {
      showToast("Download will be available once the backend is connected.");
    });
  });
}

// Filter logic
function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const type = filterType.value;
  const status = filterStatus.value;

  // show/hide clear button
  searchClear.style.display = query ? "block" : "none";

  const filtered = allRequests.filter((req) => {
    const matchSearch =
      !query ||
      req.requestId.toLowerCase().includes(query) ||
      req.documentType.toLowerCase().includes(query);

    const matchType = !type || req.documentType === type;
    const matchStatus = !status || req.status === status;

    return matchSearch && matchType && matchStatus;
  });

  renderTable(filtered);
}

// Modal
function setTimeline(status) {
  const step1 = document.getElementById("tl-step-1");
  const step2 = document.getElementById("tl-step-2");
  const step3 = document.getElementById("tl-step-3");
  const conn1 = document.getElementById("tl-conn-1");
  const conn2 = document.getElementById("tl-conn-2");
  const label3 = document.getElementById("tl-step-3-label");
  const desc3 = document.getElementById("tl-step-3-desc");
  const icon3 = document.getElementById("tl-step-3-icon");

  // Reset all
  [step1, step2, step3].forEach((s) => (s.className = "timeline-step"));
  [conn1, conn2].forEach((c) => (c.className = "timeline-connector"));

  if (status === "pending") {
    step1.classList.add("done");
    conn1.classList.add("done");
    step2.classList.add("active");
    // step3 stays waiting (default)
    label3.textContent = "Completed";
    desc3.textContent = "Awaiting completion";
    icon3.innerHTML = `<i class="fa-solid fa-flag-checkered"></i>`;
  } else if (status === "approved") {
    step1.classList.add("done");
    conn1.classList.add("done");
    step2.classList.add("done");
    conn2.classList.add("done");
    step3.classList.add("done");
    label3.textContent = "Approved";
    desc3.textContent = "Document ready";
    icon3.innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
  } else if (status === "rejected") {
    step1.classList.add("done");
    conn1.classList.add("done");
    step2.classList.add("done");
    conn2.classList.add("rejected");
    step3.classList.add("rejected");
    label3.textContent = "Rejected";
    desc3.textContent = "See note below";
    icon3.innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`;
  }
}

function openModal(requestId) {
  const req = allRequests.find((r) => r.requestId === requestId);
  if (!req) return;

  modalReqId.textContent = req.requestId;
  modalDocBadge.textContent = req.documentType;
  modalDocBadge.className = "modal-doc-type";
  modalDate.textContent = formatDate(req.submittedAt);
  modalStatusBadge.innerHTML = getStatusBadgeHTML(req.status);

  // Set timeline based on status
  setTimeline(req.status);

  // Note
  if (req.note) {
    modalNote.textContent = req.note;
    modalNoteWrapper.style.display = "flex";
  } else {
    modalNoteWrapper.style.display = "none";
  }

  // Download button in modal
  if (req.status === "approved") {
    modalDownload.style.display = "block";
  } else {
    modalDownload.style.display = "none";
  }

  backdrop.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  backdrop.classList.remove("open");
  document.body.style.overflow = "";
}

modalClose.addEventListener("click", closeModal);
modalCloseBtn.addEventListener("click", closeModal);
modalDownloadBtn.addEventListener("click", () => {
  showToast("Download will be available once the backend is connected.");
});

// Close on backdrop click
backdrop.addEventListener("click", (e) => {
  if (e.target === backdrop) closeModal();
});

// Close on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// Search clear button
searchClear.addEventListener("click", () => {
  searchInput.value = "";
  searchClear.style.display = "none";
  applyFilters();
  searchInput.focus();
});

// Filter events
searchInput.addEventListener("input", applyFilters);
filterType.addEventListener("change", applyFilters);
filterStatus.addEventListener("change", applyFilters);

// Init
async function init() {
  try {
    const res = await fetch("../../data/users.json");
    const users = await res.json();

    const user = users.find((u) => u.auth.id === userId);
    if (!user) {
      sessionStorage.clear();
      window.location.replace("../../index.html");
      return;
    }

    allRequests = user.requests || [];

    // Stats
    const total = allRequests.length;
    const approved = allRequests.filter((r) => r.status === "approved").length;
    const pending = allRequests.filter((r) => r.status === "pending").length;
    const rejected = allRequests.filter((r) => r.status === "rejected").length;

    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-approved").textContent = approved;
    document.getElementById("stat-pending").textContent = pending;
    document.getElementById("stat-rejected").textContent = rejected;
    document.getElementById("docs-total-count").textContent = total;

    // Sub labels
    setHTML(
      "stat-total-sub",
      total > 0
        ? `<i class="fa-solid fa-layer-group"></i> ${total} submitted`
        : "No requests yet",
    );
    setHTML(
      "stat-approved-sub",
      approved > 0
        ? `<i class="fa-solid fa-arrow-trend-up"></i> ${approved} completed`
        : "None yet",
    );
    setHTML(
      "stat-pending-sub",
      pending > 0
        ? `<i class="fa-regular fa-clock"></i> Awaiting review`
        : "None pending",
    );
    setHTML(
      "stat-rejected-sub",
      rejected > 0
        ? `<i class="fa-solid fa-arrow-trend-down"></i> ${rejected} unsuccessful`
        : "None rejected",
    );

    // Initial render — show all
    renderTable(allRequests);

    // Auto-open modal if ?id= param is in the URL
    // This is triggered when navigating from the dashboard Details button
    const params = new URLSearchParams(window.location.search);
    const autoOpen = params.get("id");
    if (autoOpen) {
      // Small delay so the table renders first and the modal feels natural
      setTimeout(() => openModal(autoOpen), 150);
    }
  } catch (err) {
    console.error("Documents page error:", err);
  }
}

init();
