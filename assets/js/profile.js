(() => {
  "use strict";

  /* State */
  let userData = null;
  let editMode = false;
  let originalEmail = "";
  let originalPhone = "";

  /* DOM refs*/
  const btnEditProfile = document.getElementById("btn-edit-profile");
  const btnSaveEdit = document.getElementById("btn-save-edit");
  const btnCancelEdit = document.getElementById("btn-cancel-edit");
  const editActions = document.getElementById("edit-actions");
  const infoCard = document.querySelector(".info-card");

  const avatarImg = document.getElementById("avatar-img");
  const avatarInitials = document.getElementById("avatar-initials");
  const avatarUploadLabel = document.getElementById("avatar-upload-label");
  const avatarUploadInput = document.getElementById("avatar-upload-input");

  const secCurrent = document.getElementById("sec-current");
  const secNew = document.getElementById("sec-new");
  const secConfirm = document.getElementById("sec-confirm");
  const secError = document.getElementById("sec-error");
  const btnUpdatePw = document.getElementById("btn-update-pw");

  /* Helpers */
  function showToast(msg, isError = false) {
    const toast = document.getElementById("profile-toast");
    const msgEl = document.getElementById("profile-toast-msg");
    const iconEl = document.getElementById("profile-toast-icon");
    msgEl.textContent = msg;
    iconEl.className = isError
      ? "fa-solid fa-circle-exclamation profile-toast-icon"
      : "fa-solid fa-circle-check profile-toast-icon";
    iconEl.style.color = isError
      ? "var(--status-rejected)"
      : "var(--status-approved)";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3200);
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

  function getInitials(firstName, lastName) {
    const f = (firstName || "").trim();
    const l = (lastName || "").trim();
    return ((f[0] || "") + (l[0] || "")).toUpperCase() || "?";
  }

  function setField(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || "-";
  }

  /* Fetch user from users.json */
  async function loadUser() {
    const authId = sessionStorage.getItem("userId");
    if (!authId) return null;

    try {
      const res = await fetch("../../data/users.json");
      if (!res.ok) throw new Error("fetch failed");
      const users = await res.json();
      return users.find((u) => u.auth && u.auth.id === authId) || null;
    } catch (err) {
      console.warn("[profile.js] Could not load users.json:", err);
      return null;
    }
  }

  /* Render all sections */
  function render(user) {
    if (!user) return;
    userData = user;
    const p = user.profile || {};
    const e = user.eligibility || {};
    const requests = user.requests || [];

    const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ");

    /* Avatar */
    avatarInitials.textContent = getInitials(p.firstName, p.lastName);
    document.getElementById("avatar-name").textContent = fullName || "-";

    /* Load saved photo from localStorage */
    const savedPhoto = localStorage.getItem(`avatar_${user.auth.id}`);
    if (savedPhoto) {
      avatarImg.src = savedPhoto;
      avatarImg.style.display = "block";
      avatarInitials.style.display = "none";
    }

    /* Personal info */
    setField("pf-fullname", fullName);
    setField("pf-email", p.email);
    setField("pf-phone", p.phone);
    setField("pf-dob", formatDOB(p.dateOfBirth));
    setField("pf-address", p.address);

    originalEmail = p.email || "";
    originalPhone = p.phone || "";

    /* Government info */
    setField("pf-nationalid", maskNationalId(p.nationalId));
    setField("pf-civil", p.civilStatus || "Not specified");

    /* Account summary */
    const total = requests.length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const pending = requests.filter((r) => r.status === "pending").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;

    document.getElementById("sum-total").textContent = total;
    document.getElementById("sum-approved").textContent = approved;
    document.getElementById("sum-pending").textContent = pending;
    document.getElementById("sum-rejected").textContent = rejected;

    /* Eligibility */
    renderEligibility(e);

    /* Tax info */
    renderTaxInfo(user.taxInfo || {});
  }

  /* Tax regime badge colors */
  const TAX_REGIME_CONFIG = {
    "Régime réel": { cls: "tax-regime--blue", label: "Régime réel" },
    "Régime simplifié": { cls: "tax-regime--teal", label: "Régime simplifié" },
    "Régime forfaitaire": {
      cls: "tax-regime--amber",
      label: "Régime forfaitaire",
    },
  };

  function formatTaxDate(raw) {
    if (!raw) return "-";
    const [y, m, d] = raw.split("-");
    if (!y || !m || !d) return raw;
    return `${d}/${m}/${y}`;
  }

  function renderTaxInfo(t) {
    if (!t || Object.keys(t).length === 0) {
      const section = document.getElementById("tax-section");
      if (section) section.style.display = "none";
      return;
    }

    /* Nature */
    const natureMap = {
      personne_physique: "Physical Person",
      personne_morale: "Legal Entity",
    };
    const natureEl = document.getElementById("tax-nature");
    if (natureEl) natureEl.textContent = natureMap[t.nature] || t.nature || "-";

    /* Establishment date */
    const estabEl = document.getElementById("tax-estab-date");
    if (estabEl) estabEl.textContent = formatTaxDate(t.establishmentDate);

    /* Business address */
    const bizAddrEl = document.getElementById("tax-biz-address");
    if (bizAddrEl) bizAddrEl.textContent = t.businessAddress || "-";

    /* Commercial register — hide row if empty */
    const rcRow = document.getElementById("tax-rc-row");
    const rcEl = document.getElementById("tax-rc");
    if (t.commercialRegisterNumber && t.commercialRegisterNumber.trim()) {
      if (rcEl) rcEl.textContent = t.commercialRegisterNumber;
      if (rcRow) rcRow.style.display = "";
    } else {
      if (rcRow) rcRow.style.display = "none";
    }

    /* Tax regime badge */
    const regimeBadge = document.getElementById("tax-regime-badge");
    if (regimeBadge && t.taxRegime) {
      const cfg = TAX_REGIME_CONFIG[t.taxRegime] || {
        cls: "tax-regime--blue",
        label: t.taxRegime,
      };
      regimeBadge.textContent = cfg.label;
      regimeBadge.className = `tax-regime-badge ${cfg.cls}`;
    }

    /* Main activity */
    const main = t.mainActivity || {};
    const mainNameEl = document.getElementById("tax-main-name");
    const mainCodeEl = document.getElementById("tax-main-code");
    const mainAddrEl = document.getElementById("tax-main-addr");
    if (mainNameEl) mainNameEl.textContent = main.activityName || "-";
    if (mainCodeEl)
      mainCodeEl.textContent = main.activityCode
        ? `Code ${main.activityCode}`
        : "-";
    if (mainAddrEl) mainAddrEl.textContent = main.address || "-";

    /* Secondary activities */
    const secList = document.getElementById("tax-secondary-list");
    if (secList) {
      const secondaries = t.secondaryActivities || [];
      if (secondaries.length === 0) {
        secList.innerHTML = `
          <div class="tax-no-secondary">
            <i class="fa-regular fa-folder-open"></i>
            <span>No secondary activities registered.</span>
          </div>`;
      } else {
        secList.innerHTML = secondaries
          .map(
            (s) => `
          <div class="tax-activity-card tax-activity-card--secondary">
            <div class="tax-activity-top">
              <span class="tax-activity-name">${s.activityName || "-"}</span>
              <span class="tax-activity-code">${s.activityCode ? `Code ${s.activityCode}` : "-"}</span>
            </div>
            <div class="tax-activity-addr">
              <i class="fa-solid fa-location-dot"></i>
              <span>${s.address || "-"}</span>
            </div>
          </div>`,
          )
          .join("");
      }
    }
  }

  function renderEligibility(e) {
    const fields = [
      { id: "elig-civil", value: e.civilStatus, label: "Verified" },
      { id: "elig-tax", value: e.taxCompliance, label: "Verified" },
      { id: "elig-identity", value: e.identityVerified, label: "Verified" },
      { id: "elig-address", value: e.addressConfirmed, label: "Verified" },
    ];

    let verifiedCount = 0;
    fields.forEach((f) => {
      const el = document.getElementById(f.id);
      if (!el) return;
      if (f.value) {
        verifiedCount++;
        el.textContent = "";
        el.innerHTML = `<i class="fa-solid fa-circle-check"></i> Verified`;
        el.className = "eligibility-badge eligibility-badge--verified";
      } else {
        el.textContent = "";
        el.innerHTML = `<i class="fa-regular fa-clock"></i> Pending`;
        el.className = "eligibility-badge eligibility-badge--pending";
      }
    });

    const scoreEl = document.getElementById("eligibility-score");
    scoreEl.textContent = `${verifiedCount}/${fields.length}`;
    if (verifiedCount === fields.length) scoreEl.classList.add("full");
  }

  /* Edit mode */
  btnEditProfile.addEventListener("click", () => {
    if (editMode) return;
    enterEditMode();
  });

  function enterEditMode() {
    editMode = true;
    infoCard.classList.add("edit-mode");
    editActions.style.display = "flex";
    btnEditProfile.style.display = "none";
    avatarUploadLabel.style.display = "flex";

    // Make editable fields actually editable
    document.getElementById("pf-email").removeAttribute("readonly");
    document.getElementById("pf-phone").removeAttribute("readonly");
    document.getElementById("pf-email").focus();
  }

  function exitEditMode(save) {
    editMode = false;
    infoCard.classList.remove("edit-mode");
    editActions.style.display = "none";
    btnEditProfile.style.display = "";
    avatarUploadLabel.style.display = "none";

    document.getElementById("pf-email").setAttribute("readonly", true);
    document.getElementById("pf-phone").setAttribute("readonly", true);

    if (!save) {
      // Restore original values
      document.getElementById("pf-email").value = originalEmail || "-";
      document.getElementById("pf-phone").value = originalPhone || "-";
    } else {
      // Update originals to saved values
      originalEmail = document.getElementById("pf-email").value;
      originalPhone = document.getElementById("pf-phone").value;
      showToast("Profile updated successfully!");
    }
  }

  btnSaveEdit.addEventListener("click", () => exitEditMode(true));
  btnCancelEdit.addEventListener("click", () => exitEditMode(false));

  /* Avatar upload */
  avatarUploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file.", true);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image must be under 2MB.", true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      avatarImg.src = base64;
      avatarImg.style.display = "block";
      avatarInitials.style.display = "none";

      // Persist per user
      if (userData?.auth?.id) {
        localStorage.setItem(`avatar_${userData.auth.id}`, base64);
      }
      showToast("Profile photo updated!");
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  });

  /* Password update (mock)*/
  btnUpdatePw.addEventListener("click", () => {
    const current = secCurrent.value.trim();
    const newPw = secNew.value.trim();
    const confirm = secConfirm.value.trim();

    secError.style.display = "none";

    if (!current || !newPw || !confirm) {
      showSecError("Please fill in all password fields.");
      return;
    }
    if (newPw.length < 8) {
      showSecError("New password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirm) {
      showSecError("New passwords do not match.");
      return;
    }

    // Mock success
    secCurrent.value = "";
    secNew.value = "";
    secConfirm.value = "";
    showToast("Password updated successfully!");
  });

  function showSecError(msg) {
    secError.textContent = msg;
    secError.style.display = "block";
    // Shake animation
    secConfirm.style.borderColor = "var(--error)";
    setTimeout(() => {
      secConfirm.style.borderColor = "";
    }, 2000);
  }

  /* Password show/hide toggles */
  document.querySelectorAll(".sec-toggle-pw").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.querySelector("i").className = isHidden
        ? "fa-regular fa-eye-slash"
        : "fa-regular fa-eye";
    });
  });

  /* Init */
  loadUser().then((user) => {
    if (user) {
      render(user);
    } else {
      showToast("Could not load profile data.", true);
    }
  });
})();
