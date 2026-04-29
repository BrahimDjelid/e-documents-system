const userId = sessionStorage.getItem("userId");
const userRole = sessionStorage.getItem("role");

// Compliance is ALWAYS computed from taxRecords — never trust the stored flag
function computeCompliance(taxRecords) {
  if (!taxRecords || taxRecords.length === 0) return false;
  return taxRecords.every((r) => {
    const total = (r.principal || 0) + (r.penalties || 0);
    const paid = (r.paidPrincipal || 0) + (r.paidPenalties || 0);
    return paid >= total;
  });
}

// toast
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toast-msg");
let toastTimer = null;

//  Helpers
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDocBadgeClass(type) {
  if (!type) return "doc-badge";
  const t = type.toLowerCase();
  if (t.includes("c20")) return "doc-badge doc-badge--c20";
  if (t.includes("extrait")) return "doc-badge doc-badge--extrait";
  return "doc-badge";
}

function showToast(message, isError = false) {
  toastMsg.textContent = message;

  toast.classList.remove("error");
  if (isError) {
    toast.classList.add("error");
  }

  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

//  Main
async function initDashboard() {
  try {
    const user = await apiGetCurrentUser();

    if (!user) {
      sessionStorage.clear();
      window.location.replace("../../index.html");
      return;
    }

    const requests = user.requests || [];
    const eligibility = user.eligibility || {};
    const firstName = user.profile?.firstName || "";

    // Override stored taxCompliance with live-computed value from taxRecords
    eligibility.taxCompliance = computeCompliance(user.taxInfo?.taxRecords);

    // Welcome banner
    const welcomeTitle = document.getElementById("welcome-title");
    const welcomeSub = document.getElementById("welcome-sub");

    if (welcomeTitle) {
      welcomeTitle.innerHTML = `${getGreeting()}, ${firstName}`;
    }

    if (welcomeSub) {
      const pending = requests.filter((r) => r.status === "pending").length;
      const approved = requests.filter((r) => r.status === "approved").length;

      if (requests.length === 0) {
        welcomeSub.textContent =
          "Welcome! You have no requests yet. Start by submitting one.";
      } else {
        const parts = [];
        if (pending > 0)
          parts.push(`${pending} pending request${pending > 1 ? "s" : ""}`);
        if (approved > 0)
          parts.push(`${approved} approved request${approved > 1 ? "s" : ""}`);
        welcomeSub.textContent =
          parts.length > 0
            ? "You have " + parts.join(" and ") + "."
            : "All your requests have been processed.";
      }
    }

    // Stats card
    const total = requests.length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const pending = requests.filter((r) => r.status === "pending").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;

    setText("stat-total", total);
    setText("stat-approved", approved);
    setText("stat-pending", pending);
    setText("stat-rejected", rejected);

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

    // Recent requests table
    const tbody = document.getElementById("requests-tbody");
    const emptyState = document.getElementById("requests-empty");
    const tableWrapper = document.getElementById("requests-table-wrapper");

    if (requests.length === 0) {
      if (emptyState) emptyState.style.display = "flex";
      if (tableWrapper) tableWrapper.style.display = "none";
    } else {
      if (emptyState) emptyState.style.display = "none";
      if (tableWrapper) tableWrapper.style.display = "block";

      const recent = [...requests]
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, 5);

      if (tbody) {
        tbody.innerHTML = recent
          .map(
            (req) => `
          <tr>
            <td class="req-id">${req.requestId}</td>
            <td><span class="${getDocBadgeClass(req.documentType)}">${req.documentType}</span></td>
            <td class="req-date">${formatDate(req.submittedAt)}</td>
            <td>${getStatusBadge(req.status)}</td>
            <td><button class="action-link" data-id="${req.requestId}">Details</button></td>
          </tr>
        `,
          )
          .join("");

        tbody.querySelectorAll(".action-link").forEach((btn) => {
          btn.addEventListener("click", () => {
            window.location.href = `documents.html?id=${btn.dataset.id}`;
          });
        });
      }
    }

    // Eligibility status
    const eligibilityList = document.getElementById("eligibility-list");
    const eligibilityScore = document.getElementById("eligibility-score");

    const eligibilityItems = [
      { key: "taxCompliance", label: "Tax Compliance" },
      { key: "identityVerified", label: "Identity Verified" },
      { key: "addressConfirmed", label: "Address Confirmed" },
    ];

    const verifiedCount = eligibilityItems.filter(
      (i) => eligibility[i.key],
    ).length;

    if (eligibilityScore) {
      eligibilityScore.textContent = `${verifiedCount}/${eligibilityItems.length}`;
    }

    if (eligibilityList) {
      eligibilityList.innerHTML = eligibilityItems
        .map((item) => {
          const ok = eligibility[item.key];
          return `
          <div class="eligibility-item">
            <span class="eligibility-label">${item.label}</span>
            <span class="eligibility-badge ${ok ? "eligibility-badge--ok" : "eligibility-badge--pending"}">
              <i class="fa-solid ${ok ? "fa-circle-check" : "fa-clock"}"></i>
              ${ok ? "Verified" : "Pending"}
            </span>
          </div>
        `;
        })
        .join("");
    }

    // Ready to download
    const downloadList = document.getElementById("download-list");
    const readyItems = requests.filter((r) => r.status === "approved");

    if (downloadList) {
      if (readyItems.length === 0) {
        downloadList.innerHTML = `
          <div class="download-empty">
            <i class="fa-regular fa-folder-open"></i>
            <p>Nothing ready yet</p>
            <span>Approved documents will appear here for download.</span>
          </div>
        `;
      } else {
        downloadList.innerHTML = `
          <div class="download-list">
            ${readyItems
              .map(
                (req) => `
              <div class="download-item">
                <div class="download-item-info">
                  <span class="download-item-id">${req.requestId}</span>
                  <span class="download-item-type">${req.documentType}</span>
                </div>
                <button class="download-btn" data-id="${req.requestId}">
                  <i class="fa-solid fa-download"></i>
                  Download
                </button>
              </div>
            `,
              )
              .join("")}
          </div>
        `;

        downloadList.querySelectorAll(".download-btn").forEach((btn) => {
          let _btnDownloading = false; // FIX 3.1: per-button guard
          btn.addEventListener("click", async () => {
            if (_btnDownloading) return;
            const req = readyItems.find((r) => r.requestId === btn.dataset.id);
            if (!req) return;

            // FIX 3.2: Loading state
            _btnDownloading = true;
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            btn.disabled = true;

            try {
              await apiDownloadDocument(req.requestId, req.documentType);
            } catch (err) {
              if (err.message === "MOCK") {
                showToast(
                  "Download will be available once the backend is connected.",
                );
              } else {
                showToast("Download failed. Please try again.", true);
              }
            } finally {
              btn.innerHTML = originalHTML;
              btn.disabled = false;
              _btnDownloading = false;
            }
          });
        });
      }
    }
  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

//  Util: set text safely
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

//  Util: set innerHTML safely
function setHTML(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value;
}

//  Status badge HTM
function getStatusBadge(status) {
  const map = {
    approved: { cls: "status-badge--approved", label: "Approved" },
    pending: { cls: "status-badge--pending", label: "Pending" },
    rejected: { cls: "status-badge--rejected", label: "Rejected" },
  };
  const s = map[status] || { cls: "", label: status };
  return `<span class="status-badge ${s.cls}">
    <i class="fa-solid fa-circle"></i> ${s.label}
  </span>`;
}

//  Run
initDashboard();
