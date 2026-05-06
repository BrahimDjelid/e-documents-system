// admin-profile.js — Admin Profile Page
// Handles: avatar upload/remove, account info edit/save, password update
// Uses api.js: apiGetCurrentUser, apiUpdateAdminProfile,
//              apiUploadAvatar, apiRemoveAvatar, apiChangePassword

(() => {
  "use strict";

  /* State */
  let userData = null;
  let editMode = false;
  let originalFirstName = "";
  let originalLastName = "";
  let originalEmail = "";

  /* DOM refs */
  const btnEditProfile = document.getElementById("btn-edit-profile");
  const btnSaveEdit = document.getElementById("btn-save-edit");
  const btnCancelEdit = document.getElementById("btn-cancel-edit");
  const editActions = document.getElementById("edit-actions");
  const infoCard = document.getElementById("info-card");

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
  let toastTimer = null;

  function showToast(msg, isError = false) {
    const toast = document.getElementById("ap-toast");
    const msgEl = document.getElementById("ap-toast-msg");
    const iconEl = document.getElementById("ap-toast-icon");
    msgEl.textContent = msg;
    iconEl.className = isError
      ? "fa-solid fa-circle-exclamation ap-toast-icon"
      : "fa-solid fa-circle-check ap-toast-icon";
    iconEl.style.color = isError
      ? "var(--status-rejected)"
      : "var(--status-approved)";
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  /* Helpers  */
  function getInitials(firstName, lastName) {
    const f = (firstName || "").trim();
    const l = (lastName || "").trim();
    return ((f[0] || "") + (l[0] || "")).toUpperCase() || "?";
  }

  function setField(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  }

  /* Avatar helpers  */
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
      console.warn("[admin-profile.js] Could not load user:", err);
      return null;
    }
  }

  function render(user) {
    if (!user) return;
    userData = user;

    const p = user.profile || {};
    const service = user.service || "—";
    const userId = user.auth?.id || "";

    const firstName = p.firstName || "";
    const lastName = p.lastName || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const initials = getInitials(firstName, lastName);

    /* Avatar */
    avatarInitials.textContent = initials;
    document.getElementById("avatar-name").textContent = fullName || "—";

    const savedPhoto = localStorage.getItem(`avatar_${userId}`);
    if (savedPhoto && savedPhoto !== "null") {
      showAvatar(savedPhoto);
    } else {
      showInitials(initials);
    }

    /* Service badge in avatar card */
    const badgeIcon =
      service === "C20" ? "fa-regular fa-file-lines" : "fa-solid fa-receipt";
    const serviceBadge = document.getElementById("service-badge");
    if (serviceBadge) {
      serviceBadge.innerHTML = `<i class="${badgeIcon}"></i> ${service}`;
    }

    /* Account info fields */
    setField("pf-firstname", firstName);
    setField("pf-lastname", lastName);
    setField("pf-email", userId); // auth.id IS the login email

    originalFirstName = firstName;
    originalLastName = lastName;
    originalEmail = userId;

    /* Service Assignment card */
    const svcService = document.getElementById("svc-service");
    if (svcService) svcService.textContent = service;

    const svcNationalId = document.getElementById("svc-nationalid");
    if (svcNationalId) svcNationalId.textContent = p.nationalId || "—";
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
    document.getElementById("pf-email").focus();
  }

  function exitEditMode(save) {
    editMode = false;
    infoCard.classList.remove("edit-mode");
    editActions.style.display = "none";
    btnEditProfile.style.display = "";
    avatarUploadLabel.style.display = "none";

    document.getElementById("pf-email").setAttribute("readonly", true);

    if (!save) {
      setField("pf-email", originalEmail);
    }
  }

  btnCancelEdit.addEventListener("click", () => exitEditMode(false));

  btnSaveEdit.addEventListener("click", async () => {
    const email = document.getElementById("pf-email").value.trim();

    if (!email) {
      showToast("Email address is required.", true);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("Please enter a valid email address.", true);
      return;
    }

    try {
      const result = await apiUpdateAdminProfile({
        firstName: originalFirstName,
        lastName: originalLastName,
        email,
      });

      originalEmail = email;

      if (result?.newToken) {
        sessionStorage.setItem("token", result.newToken);
        sessionStorage.setItem("userId", email);
      }

      exitEditMode(true);
      showToast("Email updated successfully!");
    } catch (err) {
      showToast("Could not save changes. Please try again.", true);
      console.error("[admin-profile.js] Save error:", err);
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
        console.error("[admin-profile.js] Avatar upload error:", err);
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
        console.error("[admin-profile.js] Avatar remove error:", err);
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
      btn.disabled = true;
    });
    btnUpdatePw.disabled = true;
    secError.style.display = "none";
    if (securityEditIcon) securityEditIcon.className = "fa-solid fa-pen";
  }

  function unlockSecurityFields() {
    securityEditMode = true;
    [secCurrent, secNew, secConfirm].forEach((f) => (f.disabled = false));
    document.querySelectorAll(".sec-toggle-pw").forEach((btn) => {
      btn.disabled = false;
    });
    btnUpdatePw.disabled = false;
    if (securityEditIcon) securityEditIcon.className = "fa-solid fa-lock";
    secCurrent.focus();
  }

  btnEditSecurity.addEventListener("click", () => {
    if (securityEditMode) lockSecurityFields();
    else unlockSecurityFields();
  });

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
      showSecError("Could not update password. Please try again.");
      console.error("[admin-profile.js] Password error:", err);
    }
  });

  function showSecError(msg) {
    secError.textContent = msg;
    secError.style.display = "flex";
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

  /* Init — ensure the security section starts fully locked */
  lockSecurityFields();

  loadUser().then((user) => {
    if (user) {
      render(user);
    } else {
      showToast("Could not load profile data.", true);
    }
  });
})();
