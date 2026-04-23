// profile.js — User Profile Page
// Handles: avatar upload/remove, profile edit/save, password update
// Uses api.js: apiGetCurrentUser, apiUpdateProfile,
//              apiUploadAvatar, apiRemoveAvatar, apiChangePassword

(() => {
  "use strict";

  /* State */
  let userData = null;
  let editMode = false;
  let originalEmail = "";
  let originalPhone = "";

  /* DOM refs */
  const btnEditProfile = document.getElementById("btn-edit-profile");
  const btnSaveEdit = document.getElementById("btn-save-edit");
  const btnCancelEdit = document.getElementById("btn-cancel-edit");
  const editActions = document.getElementById("edit-actions");
  const infoCard = document.querySelector(".info-card");

  const avatarImg = document.getElementById("avatar-img");
  const avatarInitials = document.getElementById("avatar-initials");
  const avatarUploadLabel = document.getElementById("avatar-upload-label");
  const avatarUploadInput = document.getElementById("avatar-upload-input");
  const avatarRemoveBtn = document.getElementById("avatar-remove-btn");

  const secCurrent = document.getElementById("sec-current");
  const secNew = document.getElementById("sec-new");
  const secConfirm = document.getElementById("sec-confirm");
  const secError = document.getElementById("sec-error");
  const btnUpdatePw = document.getElementById("btn-update-pw");
  const btnEditSecurity = document.getElementById("btn-edit-security");
  const securityEditIcon = document.getElementById("security-edit-icon");

  /* Toast */
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

  /* Helpers */
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

  /* Avatar helpers */
  function showAvatar(src) {
    avatarImg.src = src + "?t=" + Date.now();
    avatarImg.style.display = "block";
    avatarInitials.style.display = "none";
    if (avatarRemoveBtn) avatarRemoveBtn.style.display = "flex";
  }

  function showInitials(initials) {
    avatarImg.src = "";
    avatarImg.style.display = "none";
    avatarInitials.textContent = initials;
    avatarInitials.style.display = "";
    if (avatarRemoveBtn) avatarRemoveBtn.style.display = "none";
  }

  /* Load & render */
  async function loadUser() {
    try {
      return await apiGetCurrentUser();
    } catch (err) {
      console.warn("[profile.js] Could not load user:", err);
      return null;
    }
  }

  function render(user) {
    if (!user) return;
    userData = user;
    const p = user.profile || {};
    const e = user.eligibility || {};
    const requests = user.requests || [];

    const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ");
    const initials = getInitials(p.firstName, p.lastName);

    /* Avatar */
    avatarInitials.textContent = initials;
    document.getElementById("avatar-name").textContent = fullName || "-";

    const savedPhoto = localStorage.getItem(`avatar_${user.auth.id}`);
    if (savedPhoto && savedPhoto !== "null") {
      showAvatar(savedPhoto);
    } else {
      showInitials(initials);
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

  /* Tax info */
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

    const natureMap = {
      personne_physique: "Physical Person",
      personne_morale: "Legal Entity",
    };
    const natureEl = document.getElementById("tax-nature");
    if (natureEl) natureEl.textContent = natureMap[t.nature] || t.nature || "-";

    const estabEl = document.getElementById("tax-estab-date");
    if (estabEl) estabEl.textContent = formatTaxDate(t.establishmentDate);

    const bizAddrEl = document.getElementById("tax-biz-address");
    if (bizAddrEl) bizAddrEl.textContent = t.businessAddress || "-";

    const rcRow = document.getElementById("tax-rc-row");
    const rcEl = document.getElementById("tax-rc");
    if (t.commercialRegisterNumber && t.commercialRegisterNumber.trim()) {
      if (rcEl) rcEl.textContent = t.commercialRegisterNumber;
      if (rcRow) rcRow.style.display = "";
    } else {
      if (rcRow) rcRow.style.display = "none";
    }

    const regimeBadge = document.getElementById("tax-regime-badge");
    if (regimeBadge && t.taxRegime) {
      const cfg = TAX_REGIME_CONFIG[t.taxRegime] || {
        cls: "tax-regime--blue",
        label: t.taxRegime,
      };
      regimeBadge.textContent = cfg.label;
      regimeBadge.className = `tax-regime-badge ${cfg.cls}`;
    }

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

  /* Eligibility */
  function renderEligibility(e) {
    const fields = [
      { id: "elig-tax", value: e.taxCompliance },
      { id: "elig-identity", value: e.identityVerified },
      { id: "elig-address", value: e.addressConfirmed },
    ];

    let verifiedCount = 0;
    fields.forEach((f) => {
      const el = document.getElementById(f.id);
      if (!el) return;
      if (f.value) {
        verifiedCount++;
        el.innerHTML = `<i class="fa-solid fa-circle-check"></i> Verified`;
        el.className = "eligibility-badge eligibility-badge--verified";
      } else {
        el.innerHTML = `<i class="fa-regular fa-clock"></i> Pending`;
        el.className = "eligibility-badge eligibility-badge--pending";
      }
    });

    const scoreEl = document.getElementById("eligibility-score");
    if (scoreEl) {
      scoreEl.textContent = `${verifiedCount}/${fields.length}`;
      if (verifiedCount === fields.length) scoreEl.classList.add("full");
    }
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
      document.getElementById("pf-email").value = originalEmail || "-";
      document.getElementById("pf-phone").value = originalPhone || "-";
    }
  }

  btnCancelEdit.addEventListener("click", () => exitEditMode(false));

  btnSaveEdit.addEventListener("click", async () => {
    const email = document.getElementById("pf-email").value.trim();
    const phone = document.getElementById("pf-phone").value.trim();

    if (!email) {
      showToast("Email address is required.", true);
      return;
    }

    try {
      // apiUpdateProfile(email, phone) — defined in api.js
      await apiUpdateProfile(email, phone);

      originalEmail = email;
      originalPhone = phone;

      exitEditMode(true);
      showToast("Profile updated successfully!");
    } catch (err) {
      showToast("Could not save changes. Please try again.", true);
      console.error("[profile.js] Save error:", err);
    }
  });

  /* Avatar upload */
  avatarUploadInput.addEventListener("change", async (e) => {
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
    reader.onload = async (ev) => {
      const base64 = ev.target.result;

      try {
        // apiUploadAvatar(base64, userId) — defined in api.js
        const result = await apiUploadAvatar(base64, userData?.auth?.id);
        localStorage.setItem(`avatar_${userData.auth.id}`, result.avatarUrl);
        showAvatar(result.avatarUrl);
        showToast("Profile photo updated!");
      } catch (err) {
        showToast("Could not save photo. Please try again.", true);
        console.error("[profile.js] Avatar upload error:", err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // allow re-selecting the same file
  });

  /* Avatar remove */
  if (avatarRemoveBtn) {
    avatarRemoveBtn.addEventListener("click", async () => {
      const userId = userData?.auth?.id;
      if (!userId) return;

      try {
        // apiRemoveAvatar(userId) — defined in api.js
        await apiRemoveAvatar(userId);
        localStorage.removeItem(`avatar_${userId}`);
        const initials = getInitials(
          userData?.profile?.firstName,
          userData?.profile?.lastName,
        );
        showInitials(initials);
        showToast("Profile photo removed.");
      } catch (err) {
        showToast("Could not remove photo. Please try again.", true);
        console.error("[profile.js] Avatar remove error:", err);
      }
    });
  }

  /* Security / Password */
  let securityEditMode = false;

  function lockSecurityFields() {
    securityEditMode = false;
    [secCurrent, secNew, secConfirm].forEach((f) => {
      f.disabled = true;
      f.value = "";
      f.type = "password";
    });
    document.querySelectorAll(".sec-toggle-pw").forEach((btn) => {
      btn.querySelector("i").className = "fa-regular fa-eye";
    });
    btnUpdatePw.disabled = true;
    secError.style.display = "none";
    if (securityEditIcon) securityEditIcon.className = "fa-solid fa-pen";
  }

  function unlockSecurityFields() {
    securityEditMode = true;
    [secCurrent, secNew, secConfirm].forEach((f) => (f.disabled = false));
    btnUpdatePw.disabled = false;
    if (securityEditIcon) securityEditIcon.className = "fa-solid fa-lock";
    secCurrent.focus();
  }

  if (btnEditSecurity) {
    btnEditSecurity.addEventListener("click", () => {
      if (securityEditMode) lockSecurityFields();
      else unlockSecurityFields();
    });
  }

  btnUpdatePw.addEventListener("click", async () => {
    if (btnUpdatePw.disabled) return;

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

    try {
      await apiChangePassword(current, newPw);
      lockSecurityFields();
      showToast("Password updated successfully!");
    } catch (err) {
      showSecError("Could not update password. Try again.");
      console.error("[profile.js] Password update error:", err);
    }
  });

  function showSecError(msg) {
    secError.textContent = msg;
    secError.style.display = "block";
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
