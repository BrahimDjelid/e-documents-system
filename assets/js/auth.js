// auth.js — Login logic
// ---- Grab all elements ----
const identifierInput = document.getElementById("identifier");
const passwordInput = document.getElementById("password");
const toggleBtn = document.getElementById("toggle-password");
const eyeIcon = document.getElementById("eye-icon");
const loginBtn = document.getElementById("login-btn");
const identifierError = document.getElementById("identifier-error");
const passwordError = document.getElementById("password-error");
const generalError = document.getElementById("general-error");

// Helpers
function showError(field, errorEl, message) {
  errorEl.innerHTML = message;
  errorEl.classList.add("visible");
  field.classList.add("input-error");
}

function clearError(field, errorEl) {
  errorEl.innerHTML = "";
  errorEl.classList.remove("visible");
  field.classList.remove("input-error");
}

function showGeneralError(message, type = "error") {
  const icon = generalError.querySelector(".general-error-icon");
  const text = generalError.querySelector(".general-error-text");

  icon.className =
    "general-error-icon " +
    (type === "error"
      ? "fa-solid fa-triangle-exclamation"
      : "fa-solid fa-wifi");
  text.textContent = message;
  generalError.className = "general-error visible " + type;
}

function clearGeneralError() {
  generalError.querySelector(".general-error-text").textContent = "";
  generalError.querySelector(".general-error-icon").className =
    "general-error-icon";
  generalError.className = "general-error";
}

function setLoading(state) {
  loginBtn.disabled = state;
  loginBtn.classList.toggle("loading", state);
}

// Returns error message string, or null if valid
function validateIdentifier(value) {
  if (!value) return "This field is required.";

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const isNif = /^\d{15}$/.test(value);
  const looksLikeNif = /^\d+$/.test(value);

  if (isEmail || isNif) return null;

  if (looksLikeNif) {
    const len = value.length;
    if (len < 15)
      return `NIF is too short &mdash; ${len} of 15 digits entered.`;
    if (len > 15) return "NIF is too long &mdash; maximum 15 digits.";
  }

  return "Enter a valid NIF (15 digits) or admin email address.";
}

function validatePassword(value) {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return null;
}

// Prevent spaces in identifier field
identifierInput.addEventListener("keydown", function (e) {
  if (e.key === " ") e.preventDefault();
});

// Strip spaces on paste
identifierInput.addEventListener("input", function () {
  const pos = this.selectionStart;
  const cleaned = this.value.replace(/\s/g, "");
  if (cleaned !== this.value) {
    this.value = cleaned;
    this.setSelectionRange(pos - 1, pos - 1);
  }
});

// Track touched fields
let identifierTouched = false;
let passwordTouched = false;

identifierInput.addEventListener("input", function () {
  identifierTouched = true;
  clearGeneralError();
  if (!identifierInput.classList.contains("input-error")) return;
  const value = this.value.trim();
  const error = validateIdentifier(value);
  if (!error) clearError(identifierInput, identifierError);
});

passwordInput.addEventListener("input", function () {
  passwordTouched = true;
  clearGeneralError();
  if (!passwordInput.classList.contains("input-error")) return;
  const value = this.value;
  const error = validatePassword(value);
  if (!error) clearError(passwordInput, passwordError);
});

identifierInput.addEventListener("blur", function () {
  if (!identifierTouched) return;
  const value = this.value.trim();
  const error = validateIdentifier(value);
  if (error) showError(identifierInput, identifierError, error);
  else clearError(identifierInput, identifierError);
});

passwordInput.addEventListener("blur", function () {
  if (!passwordTouched) return;
  const value = this.value;
  const error = validatePassword(value);
  if (error) showError(passwordInput, passwordError, error);
  else clearError(passwordInput, passwordError);
});

// Submit
async function handleLogin() {
  const identifier = identifierInput.value.trim();
  const password = passwordInput.value;

  clearGeneralError();

  const idError = validateIdentifier(identifier);
  const pwdError = validatePassword(password);

  if (idError) showError(identifierInput, identifierError, idError);
  if (pwdError) showError(passwordInput, passwordError, pwdError);
  if (idError || pwdError) return;

  setLoading(true);

  try {
    // Uses apiLogin() from api.js
    // api.js must be loaded before auth.js in login.html
    const session = await apiLogin(identifier, password);

    // Save session
    sessionStorage.setItem("role", session.role);
    sessionStorage.setItem("userId", session.userId);
    sessionStorage.setItem("userFirstName", session.userFirstName);
    sessionStorage.setItem("userLastName", session.userLastName);

    // Redirect based on role
    if (session.role === "admin") {
      sessionStorage.setItem("service", session.service || "");
      window.location.href = "admin/dashboard.html";
    } else {
      window.location.href = "user/dashboard.html";
    }
  } catch (err) {
    setLoading(false);

    // apiLogin() throws "Incorrect credentials" on wrong login
    // and any other error means a connection problem
    if (err.message === "Incorrect credentials") {
      showGeneralError("Incorrect NIF / email or password.", "error");
    } else {
      showGeneralError("Could not connect. Please try again.", "warning");
      console.error("Login error:", err);
    }
  }
}

// Events
toggleBtn.addEventListener("click", function () {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  eyeIcon.classList.toggle("fa-eye", !isHidden);
  eyeIcon.classList.toggle("fa-eye-slash", isHidden);
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Enter") handleLogin();
});

loginBtn.addEventListener("click", handleLogin);
