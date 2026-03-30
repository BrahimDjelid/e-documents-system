/*
  On submit, builds a clean JSON payload ready for:
  POST /api/requests
  Currently logs to console - replace the TODO block with a real fetch() when Flask is ready.
*/

(() => {
  "use strict";

  /* State */
  let currentStep = 1;
  let selectedDoc = null;
  let userData = null; // full user object from users.json

  /* Doc config */
  const DOC_CONFIG = {
    C20: {
      icon: "fa-regular fa-file-lines",
      iconClass: "form-doc-icon--purple",
    },
    "Extrait de rôle": {
      icon: "fa-solid fa-receipt",
      iconClass: "form-doc-icon--blue",
    },
  };

  /* DOM refs */
  const docCards = document.querySelectorAll(".doc-card");
  const btnContinue = document.getElementById("btn-step1-continue");
  const btnBack = document.getElementById("btn-step2-back");
  const btnSubmit = document.getElementById("btn-step2-submit");
  const declarationCheck = document.getElementById("declaration-check");
  const declarationBox = document.getElementById("declaration-box");
  const confirmCopyBtn = document.getElementById("confirm-copy-btn");
  const btnAnother = document.getElementById("btn-another");

  const stepItems = [1, 2, 3].map((n) =>
    document.getElementById(`step-item-${n}`),
  );
  const stepLines = [1, 2].map((n) =>
    document.getElementById(`step-line-${n}`),
  );
  const stepPanels = [1, 2, 3].map((n) =>
    document.getElementById(`panel-step-${n}`),
  );

  /* Helpers */
  function showToast(msg, isError = false) {
    const toast = document.getElementById("req-toast");
    const msgEl = document.getElementById("req-toast-msg");
    const icon = toast.querySelector(".req-toast-icon");
    msgEl.textContent = msg;
    icon.className = isError
      ? "fa-solid fa-circle-exclamation req-toast-icon"
      : "fa-solid fa-circle-check req-toast-icon";
    icon.style.color = isError
      ? "var(--status-rejected)"
      : "var(--status-approved)";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function generateRequestId() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const yr = String(now.getFullYear()).slice(-2);
    const rand = String(Math.floor(Math.random() * 900) + 100);
    return `REQ-${day}-${yr}-${rand}`;
  }

  function formatDate(date) {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatDOB(raw) {
    if (!raw) return "-";
    const [y, m, d] = raw.split("-");
    if (!y || !m || !d) return raw;
    return `${d}/${m}/${y}`;
  }

  function maskNationalId(id) {
    if (!id) return "-";
    const s = String(id);
    return s.length <= 4 ? s : "****" + s.slice(-4);
  }

  /* C20 validation */
  function canRequestC20() {
    if (!userData) {
      showToast("User data not loaded", true);
      return false;
    }

    const t = userData.taxInfo || {};
    const e = userData.eligibility || {};

    if (!e.identityVerified) {
      showToast("Identity not verified", true);
      return false;
    }

    if (userData.auth.id !== t.taxIdentificationNumber) {
      showToast("NIF mismatch", true);
      return false;
    }

    return true;
  }

  /* Compliance computation - never trust stored taxStatus */
  function computeCompliance(user) {
    const declared = user.taxInfo?.declarations?.submitted === true;
    const paid = user.taxInfo?.taxPayments?.[0]?.paid === true;
    return declared && paid;
  }

  /* Extrait de rôle validation */
  function canRequestExtrait() {
    if (!userData) {
      showToast("User data not loaded", true);
      return false;
    }

    const t = userData.taxInfo || {};
    const e = userData.eligibility || {};

    if (!e.identityVerified) {
      showToast("Identity not verified", true);
      return false;
    }

    if (userData.auth.id !== t.taxIdentificationNumber) {
      showToast("NIF mismatch", true);
      return false;
    }

    if (!t.taxPayments || t.taxPayments.length === 0) {
      showToast("No tax records available", true);
      return false;
    }

    return true;
  }

  /* Load full user from users.json */
  async function loadUser() {
    const authId = sessionStorage.getItem("userId");
    if (!authId) return null;
    try {
      const res = await fetch("../../data/users.json");
      if (!res.ok) throw new Error("fetch failed");
      const users = await res.json();
      return users.find((u) => u.auth && u.auth.id === authId) || null;
    } catch (err) {
      console.warn("[request.js] Falling back to sessionStorage:", err);
      return null;
    }
  }

  /* Step indicator */
  function updateStepIndicator(toStep) {
    stepItems.forEach((item, i) => {
      const n = i + 1;
      item.classList.remove("active", "completed");
      if (n < toStep) item.classList.add("completed");
      if (n === toStep) item.classList.add("active");
    });
    stepLines.forEach((line, i) => {
      if (i + 1 < toStep) line.classList.add("completed");
      else line.classList.remove("completed");
    });
  }

  /* Panel transition */
  function goToStep(nextStep) {
    if (nextStep === currentStep) return;
    const currentPanel = stepPanels[currentStep - 1];
    const nextPanel = stepPanels[nextStep - 1];
    currentPanel.classList.add("exit-left");
    setTimeout(() => {
      currentPanel.classList.remove("active", "exit-left");
      nextPanel.classList.add("active");
      currentStep = nextStep;
      updateStepIndicator(currentStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 280);
  }

  /* Step 1: Card selection */
  docCards.forEach((card) => {
    card.addEventListener("click", () => selectCard(card));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectCard(card);
      }
    });
  });

  function selectCard(card) {
    docCards.forEach((c) => {
      c.classList.remove("selected");
      c.setAttribute("aria-pressed", "false");
    });
    card.classList.add("selected");
    card.setAttribute("aria-pressed", "true");
    selectedDoc = card.getAttribute("data-doc");
    btnContinue.disabled = false;
  }

  btnContinue.addEventListener("click", () => {
    if (!selectedDoc) return;
    populateStep2();
    goToStep(2);
  });

  /* Step 2: Pre-fill form */
  function populateStep2() {
    const cfg = DOC_CONFIG[selectedDoc] || DOC_CONFIG["C20"];
    const docNameEl = document.getElementById("form-doc-name");
    const docIconEl = document.getElementById("form-doc-icon");
    docNameEl.textContent = selectedDoc;
    docIconEl.className = "form-doc-icon " + cfg.iconClass;
    docIconEl.innerHTML = `<i class="${cfg.icon}"></i>`;

    if (!userData) return;

    const p = userData.profile || {};
    const t = userData.taxInfo || {};
    const main = t.mainActivity || {};

    const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ");

    setField("pf-fullname", fullName);
    setField("pf-nationalid", maskNationalId(p.nationalId));
    setField("pf-dob", formatDOB(p.dateOfBirth));
    setField("pf-phone", p.phone);
    setField("pf-email", p.email);

    const activityLabel = main.activityName
      ? `${main.activityName}${main.activityCode ? " - Code " + main.activityCode : ""}`
      : "-";
    setField("pf-main-activity", activityLabel);
    setField("pf-tax-regime", t.taxRegime || "-");
    setField("pf-biz-address", t.businessAddress || "-");
  }

  function setField(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || "-";
  }

  /* Declaration checkbox */
  declarationCheck.addEventListener("change", () => {
    btnSubmit.disabled = !declarationCheck.checked;
    declarationBox.classList.toggle("checked", declarationCheck.checked);
  });

  btnBack.addEventListener("click", () => goToStep(1));

  /* Submit button */
  btnSubmit.addEventListener("click", () => {
    if (!declarationCheck.checked) return;
    if (selectedDoc === "C20" && !canRequestC20()) return;
    if (selectedDoc === "Extrait de rôle" && !canRequestExtrait()) return;
    submitRequest();
  });

  /* Submit request */
  async function submitRequest() {
    const purpose = document.getElementById("purpose-textarea").value.trim();
    const reqId = generateRequestId();
    const now = new Date();

    const p = userData?.profile || {};
    const t = userData?.taxInfo || {};
    const main = t.mainActivity || {};

    const payload = {
      requestId: reqId,
      submittedAt: now.toISOString(),
      status: "pending",
      userId: sessionStorage.getItem("userId"),
      documentType: selectedDoc,
      purpose: purpose || null,

      // Always computed - never trust stored taxStatus
      taxStatus: computeCompliance(userData) ? "À jour" : "Non à jour",

      applicant: {
        fullName: [p.firstName, p.lastName].filter(Boolean).join(" "),
        nationalId: p.nationalId || null,
        dateOfBirth: p.dateOfBirth || null,
        phone: p.phone || null,
        email: p.email || null,
      },

      business: {
        mainActivityName: main.activityName || null,
        mainActivityCode: main.activityCode || null,
        businessAddress: t.businessAddress || null,
        taxRegime: t.taxRegime || null,
        commercialRegisterNumber: t.commercialRegisterNumber || null,
      },

      // Only included for Extrait de rôle - undefined is stripped by JSON.stringify
      taxPayments:
        selectedDoc === "Extrait de rôle" ? t.taxPayments : undefined,
    };

    // TODO: replace with real fetch when Flask is ready
    //
    // const res = await fetch("/api/requests", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "Authorization": `Bearer ${sessionStorage.getItem("token")}`,
    //   },
    //   body: JSON.stringify(payload),
    // });
    // if (!res.ok) {
    //   showToast("Submission failed. Please try again.", true);
    //   return;
    // }
    // const data = await res.json();
    // console.log("[request.js] Server response:", data);

    console.log("[request.js] Payload ready for POST /api/requests:", payload);

    // Populate step 3 confirmation
    document.getElementById("confirm-req-id").textContent = reqId;
    document.getElementById("confirm-doc-type").textContent = selectedDoc;
    document.getElementById("confirm-date").textContent = formatDate(now);

    goToStep(3);
  }

  /* Step 3: Copy request ID */
  confirmCopyBtn.addEventListener("click", () => {
    const id = document.getElementById("confirm-req-id").textContent;
    navigator.clipboard
      .writeText(id)
      .then(() => {
        showToast("Request ID copied to clipboard!");
        confirmCopyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => {
          confirmCopyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
        }, 2000);
      })
      .catch(() => showToast("Could not copy - please copy manually.", true));
  });

  /* Step 3: Submit another */
  btnAnother.addEventListener("click", () => {
    selectedDoc = null;
    docCards.forEach((c) => {
      c.classList.remove("selected");
      c.setAttribute("aria-pressed", "false");
    });
    btnContinue.disabled = true;
    declarationCheck.checked = false;
    declarationBox.classList.remove("checked");
    btnSubmit.disabled = true;
    document.getElementById("purpose-textarea").value = "";
    goToStep(1);
  });

  /* Init */
  updateStepIndicator(1);

  loadUser().then((user) => {
    userData = user;
  });
})();
