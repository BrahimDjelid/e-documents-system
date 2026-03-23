(() => {
  "use strict";

  /* State */
  let currentStep = 1;
  let selectedDoc = null;
  let userProfile = null;

  /* Icon & color config per doc type */
  const DOC_CONFIG = {
    C20: {
      icon: "fa-regular fa-file-lines",
      iconClass: "form-doc-icon--purple",
    },
    "Extrait de rôle": {
      icon: "fa-solid fa-receipt",
      iconClass: "form-doc-icon--blue",
    },
    "Déclaration d'existence": {
      icon: "fa-solid fa-building-columns",
      iconClass: "form-doc-icon--teal",
    },
  };

  /* DOM refs  */
  const docCards = document.querySelectorAll(".doc-card");
  const btnContinue = document.getElementById("btn-step1-continue");
  const btnBack = document.getElementById("btn-step2-back");
  const btnSubmit = document.getElementById("btn-step2-submit");
  const declarationCheck = document.getElementById("declaration-check");
  const declarationBox = document.getElementById("declaration-box");
  const confirmCopyBtn = document.getElementById("confirm-copy-btn");
  const btnAnother = document.getElementById("btn-another");

  /* Step UI */
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
    if (isError) {
      icon.className = "fa-solid fa-circle-exclamation req-toast-icon";
      icon.style.color = "var(--status-rejected)";
    } else {
      icon.className = "fa-solid fa-circle-check req-toast-icon";
      icon.style.color = "var(--status-approved)";
    }
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

  /* Convert stored YYYY-MM-DD → DD/MM/YYYY for display */
  function formatDOB(raw) {
    if (!raw) return "-";
    const [y, m, d] = raw.split("-");
    if (!y || !m || !d) return raw; // return as-is if unexpected format
    return `${d}/${m}/${y}`;
  }

  function maskNationalId(id) {
    if (!id) return "-";
    const s = String(id);
    if (s.length <= 4) return s;
    return "****" + s.slice(-4);
  }

  /* Fetch user profile from users.json */
  async function loadUserProfile() {
    const authId = sessionStorage.getItem("userId");
    if (!authId) return null;

    try {
      const res = await fetch("../../data/users.json");
      if (!res.ok) throw new Error("Could not load users.json");
      const users = await res.json();

      const match = users.find((u) => u.auth && u.auth.id === authId);
      return match ? match.profile : null;
    } catch (err) {
      console.warn("[request.js] Falling back to sessionStorage keys:", err);
      return {
        firstName: sessionStorage.getItem("userFirstName") || "",
        lastName: sessionStorage.getItem("userLastName") || "",
      };
    }
  }

  /* Step indicator  */
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

  /* Panel transition  */
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

  /* Step 2: Pre-fill form  */
  function populateStep2() {
    // Form header icon + title
    const cfg = DOC_CONFIG[selectedDoc] || DOC_CONFIG["C20"];
    const docNameEl = document.getElementById("form-doc-name");
    const docIconEl = document.getElementById("form-doc-icon");
    docNameEl.textContent = selectedDoc;
    docIconEl.className = "form-doc-icon " + cfg.iconClass;
    docIconEl.innerHTML = `<i class="${cfg.icon}"></i>`;

    // Profile fields
    const p = userProfile || {};
    const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ");

    document.getElementById("pf-fullname").value = fullName || "-";
    document.getElementById("pf-nationalid").value = maskNationalId(
      p.nationalId,
    );
    document.getElementById("pf-dob").value = formatDOB(p.dateOfBirth);
    document.getElementById("pf-phone").value = p.phone || "-";
    document.getElementById("pf-address").value = p.address || "-";
    document.getElementById("pf-email").value = p.email || "-";
  }

  /* Declaration checkbox ─ */
  declarationCheck.addEventListener("change", () => {
    btnSubmit.disabled = !declarationCheck.checked;
    declarationBox.classList.toggle("checked", declarationCheck.checked);
  });

  btnBack.addEventListener("click", () => goToStep(1));

  /* Step 2: Submit  */
  btnSubmit.addEventListener("click", () => {
    if (!declarationCheck.checked) return;
    submitRequest();
  });

  function submitRequest() {
    const copies = document.getElementById("copies-select").value;
    const reqId = generateRequestId();
    const today = formatDate(new Date());

    document.getElementById("confirm-req-id").textContent = reqId;
    document.getElementById("confirm-doc-type").textContent = selectedDoc;
    document.getElementById("confirm-copies").textContent =
      copies + (copies === "1" ? " copy" : " copies");
    document.getElementById("confirm-date").textContent = today;

    goToStep(3);
  }

  /* Step 3: Copy request ID  */
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
      .catch(() => showToast("Could not copy — please copy manually.", true));
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
    document.getElementById("copies-select").value = "1";
    document.getElementById("purpose-textarea").value = "";
    goToStep(1);
  });

  /* Init */
  updateStepIndicator(1);

  // Fetch fresh profile from users.json on page load
  loadUserProfile().then((profile) => {
    userProfile = profile;
  });
})();
