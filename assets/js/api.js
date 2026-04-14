// api.js - Centralized API layer
// USE_MOCK = true  → reads from users.json (no backend needed)
// USE_MOCK = false → calls Flask REST API
//
// When Flask is ready:
//   1. Set USE_MOCK = false
//   2. Set API_BASE to your production server URL
//   3. Done — entire app switches to Flask

"use strict";

const USE_MOCK = true;
const API_BASE = "http://127.0.0.1:5000";
const MOCK_PATH = "../../data/users.json";

// Internal helpers

function _getToken() {
  return sessionStorage.getItem("token") || "";
}

function _authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${_getToken()}`,
    "X-User-Id": sessionStorage.getItem("userId") || "",
  };
}

async function _loadMockUsers() {
  const res = await fetch(MOCK_PATH);
  if (!res.ok) throw new Error("Could not load users.json");
  return res.json();
}

// Mock: merge localStorage status/note overrides into request list
function _applyOverrides(requests) {
  try {
    const overrides = JSON.parse(localStorage.getItem("req_overrides") || "{}");
    return requests.map((req) => {
      const override = overrides[req.requestId];
      if (!override) return req;
      return {
        ...req,
        status: override.status,
        note: override.note || req.note || "",
      };
    });
  } catch {
    return requests;
  }
}

// AUTH

/**
 * Login — accepts NIF (15-digit string) or admin email.
 *
 * Flask: POST /api/auth/login
 * Body:  { id: string, password: string }
 * Response: {
 *   token:         string,
 *   userId:        string,
 *   role:          "user" | "admin",
 *   userFirstName: string,
 *   userLastName:  string,
 *   service:       string | null   // admin only
 * }
 */
async function apiLogin(id, password) {
  if (USE_MOCK) {
    const users = await _loadMockUsers();
    const match = users.find(
      (u) => u.auth.id === id && u.auth.password === password,
    );
    if (!match) throw new Error("Incorrect credentials");
    return {
      userId: match.auth.id,
      role: match.role,
      userFirstName: match.profile?.firstName || "",
      userLastName: match.profile?.lastName || "",
      service: match.service || null,
    };
  }

  // Flask
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, password }),
  });
  if (!res.ok) throw new Error("Incorrect credentials");
  return res.json();
}

// CURRENT USER

/**
 * Get the full object for the currently logged-in user or admin.
 *
 * For users returns:
 *   { auth, profile, taxInfo, eligibility, requests, role }
 * For admins returns:
 *   { auth, profile, role, service }
 *
 * Flask: GET /api/user/me
 * Headers: Authorization: Bearer {token}
 */
async function apiGetCurrentUser() {
  if (USE_MOCK) {
    const userId = sessionStorage.getItem("userId");
    const users = await _loadMockUsers();
    const user = users.find((u) => u.auth.id === userId);
    if (!user) throw new Error("User not found");
    return {
      ...user,
      requests: _applyOverrides(user.requests || []),
    };
  }

  // Flask
  const res = await fetch(`${API_BASE}/api/user/me`, {
    headers: _authHeaders(),
  });
  if (!res.ok) throw new Error("Could not load user data");
  return res.json();
}

// USER — PROFILE UPDATE

/**
 * Update the logged-in citizen's editable contact fields.
 * Read-only fields (name, DOB, address, nationalId, civilStatus) are
 * managed by the tax authority and must NOT be sent here.
 *
 * Flask: PATCH /api/user/profile
 * Headers: Authorization: Bearer {token}
 * Body: {
 *   email: string,   // new contact email
 *   phone: string    // new phone number
 * }
 * Response: { success: true }
 */
async function apiUpdateProfile(email, phone) {
  if (USE_MOCK) {
    console.log("[api.js | MOCK] PATCH /api/user/profile →", { email, phone });
    return { success: true };
  }

  // Flask
  const res = await fetch(`${API_BASE}/api/user/profile`, {
    method: "PATCH",
    headers: _authHeaders(),
    body: JSON.stringify({ email, phone }),
  });
  if (!res.ok) throw new Error("Profile update failed");
  return res.json();
}

// ADMIN — PROFILE UPDATE 

/**
 * Update the logged-in admin's editable profile fields.
 * The email IS the login ID (auth.id). Changing it means the backend
 * must update both the profile AND the auth credential atomically,
 * then return a fresh session token (or invalidate the old one).
 *
 * Flask: PUT /api/admin/profile
 * Headers: Authorization: Bearer {token}  (admin only)
 * Body: {
 *   firstName: string,
 *   lastName:  string,
 *   email:     string   // also updates auth.id / login credential
 * }
 * Response: {
 *   success:   true,
 *   newToken?: string   // returned when email changed; client must
 *                       // refresh sessionStorage.userId + auth header
 * }
 */
async function apiUpdateAdminProfile({ firstName, lastName, email }) {
  if (USE_MOCK) {
    console.log("[api.js | MOCK] PUT /api/admin/profile →", {
      firstName,
      lastName,
      email,
    });
    return { success: true };
  }

  // Flask
  const res = await fetch(`${API_BASE}/api/admin/profile`, {
    method: "PUT",
    headers: _authHeaders(),
    body: JSON.stringify({ firstName, lastName, email }),
  });
  if (!res.ok) throw new Error("Admin profile update failed");
  return res.json();
}

// AVATAR — UPLOAD

/**
 * Persist a user's or admin's avatar photo.
 *
 * In MOCK mode the base64 data-URI is written to localStorage only
 * (browsers cannot write to users.json).
 * When Flask is connected the base64 is sent to the server; the server
 * stores the image and returns a public URL that replaces the cached copy.
 *
 * Caller workflow (profile.js / admin-profile.js):
 *   1. User picks a file → FileReader → base64 data-URI
 *   2. Call apiUploadAvatar(base64, userId)
 *   3. Use returned { avatarUrl } to set <img src> and update the sidebar avatar
 *
 * Flask: POST /api/user/avatar
 * Headers: Authorization: Bearer {token}
 * Body: {
 *   userId:    string,    // owner of the avatar (auth.id)
 *   avatarB64: string     // full data-URI, e.g. "data:image/png;base64,..."
 * }
 * Response: {
 *   success:   true,
 *   avatarUrl: string     // server-hosted URL to use as <img src>
 * }
 */
async function apiUploadAvatar(base64, userId) {
  if (USE_MOCK) {
    localStorage.setItem(`avatar_${userId}`, base64);
    console.log(
      "[api.js | MOCK] POST /api/user/avatar → stored in localStorage",
    );
    return { success: true, avatarUrl: base64 };
  }

  // Flask
  const res = await fetch(`${API_BASE}/api/user/avatar`, {
    method: "POST",
    headers: _authHeaders(),
    body: JSON.stringify({ userId, avatarB64: base64 }),
  });
  if (!res.ok) throw new Error("Avatar upload failed");
  const data = await res.json();
  // Cache the server URL locally so components.js can load it without a round-trip
  if (data.avatarUrl) localStorage.setItem(`avatar_${userId}`, data.avatarUrl);
  return data;
}

// AVATAR — REMOVE

/**
 * Remove a user's or admin's avatar photo, reverting to initials display.
 *
 * In MOCK mode removes the localStorage entry.
 * When Flask is connected the server deletes the stored image file.
 *
 * Flask: DELETE /api/user/avatar
 * Headers: Authorization: Bearer {token}
 * Body: {
 *   userId: string    // owner of the avatar (auth.id)
 * }
 * Response: { success: true }
 */
async function apiRemoveAvatar(userId) {
  if (USE_MOCK) {
    localStorage.removeItem(`avatar_${userId}`);
    console.log(
      "[api.js | MOCK] DELETE /api/user/avatar → removed from localStorage",
    );
    return { success: true };
  }

  // Flask
  const res = await fetch(`${API_BASE}/api/user/avatar`, {
    method: "DELETE",
    headers: _authHeaders(),
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error("Avatar removal failed");
  return res.json();
}

// PASSWORD CHANGE

/**
 * Change the logged-in user's or admin's password.
 * Works for both roles — the server identifies the account via the token.
 *
 * Flask: POST /api/user/password
 * Headers: Authorization: Bearer {token}
 * Body: {
 *   currentPassword: string,
 *   newPassword:     string
 * }
 * Response: { success: true }
 */
async function apiChangePassword(currentPassword, newPassword) {
  if (USE_MOCK) {
    console.log("[api.js | MOCK] POST /api/user/password →", {
      currentPassword: "***",
      newPassword: "***",
    });
    return { success: true };
  }

  // Flask
  const res = await fetch(`${API_BASE}/api/user/password`, {
    method: "POST",
    headers: _authHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) throw new Error("Password update failed");
  return res.json();
}

// REQUESTS — USER SIDE

/**
 * Submit a new document request.
 * Payload is assembled entirely by request.js; taxStatus is always
 * computed client-side from live taxRecords data and must never be
 * taken from a stored/cached field.
 *
 * Flask: POST /api/requests
 * Headers: Authorization: Bearer {token}
 * Body: {
 *   requestId:    string,              // e.g. "REQ-14-26-042"
 *   submittedAt:  string,              // ISO-8601 timestamp
 *   status:       "pending",           // always "pending" on creation
 *   userId:       string,              // auth.id of the submitting citizen
 *   documentType: "C20" | "Extrait de rôle",
 *   purpose:      string | null,
 *   taxStatus:    "À jour" | "Non à jour",  // computed, never stored value
 *   applicant: {
 *     fullName:    string,
 *     nationalId:  string | null,
 *     dateOfBirth: string | null,
 *     phone:       string | null,
 *     email:       string | null
 *   },
 *   business: {
 *     mainActivityName:         string | null,
 *     mainActivityCode:         string | null,
 *     businessAddress:          string | null,
 *     taxRegime:                string | null,
 *     commercialRegisterNumber: string | null
 *   },
 *   taxRecords: Array | undefined      // only present for "Extrait de rôle"
 * }
 * Response: { requestId: string, status: "pending" }
 */
async function apiSubmitRequest(payload) {
  if (USE_MOCK) {
    console.log("[api.js | MOCK] POST /api/requests →", payload);
    return { requestId: payload.requestId, status: "pending" };
  }

  // Flask
  const res = await fetch(`${API_BASE}/api/requests`, {
    method: "POST",
    headers: _authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Submission failed");
  return res.json();
}

// REQUESTS — ADMIN SIDE

/**
 * Get all requests for the logged-in admin's assigned service.
 * Each request is enriched server-side with the applicant's profile
 * and tax records so the admin never has to join data manually.
 *
 * Flask: GET /api/requests
 * Headers: Authorization: Bearer {token}  (admin only)
 *   Backend filters by the admin's assigned service automatically.
 * Response: Array<{
 *   ...requestFields,
 *   _fullName:   string,
 *   _nif:        string,
 *   _dob:        string | null,
 *   _phone:      string | null,
 *   _email:      string | null,
 *   _taxRegime:  string | null,
 *   _taxRecords: Array
 * }>
 */
async function apiGetRequests() {
  const adminService = sessionStorage.getItem("service") || "";

  if (USE_MOCK) {
    const users = await _loadMockUsers();
    const enriched = [];

    users.forEach((user) => {
      if (user.role !== "user") return;
      const requests = _applyOverrides(user.requests || []);
      const profile = user.profile || {};
      const taxInfo = user.taxInfo || {};

      requests.forEach((req) => {
        if (req.documentType !== adminService) return;
        enriched.push({
          ...req,
          _fullName: [profile.firstName, profile.lastName]
            .filter(Boolean)
            .join(" "),
          _nif: user.auth.id,
          _dob: profile.dateOfBirth || null,
          _phone: profile.phone || null,
          _email: profile.email || null,
          _taxRegime: taxInfo.taxRegime || null,
          _taxRecords: taxInfo.taxRecords || [],
        });
      });
    });

    return enriched;
  }

  // Flask
  const res = await fetch(`${API_BASE}/api/requests`, {
    headers: _authHeaders(),
  });
  if (!res.ok) throw new Error("Could not load requests");
  return res.json();
}

/**
 * Get dashboard summary data for the logged-in admin.
 * Returns requests enriched with applicant name + tax records
 * (needed to compute compliance badges on the dashboard).
 *
 * Flask: GET /api/admin/dashboard
 * Headers: Authorization: Bearer {token}  (admin only)
 * Response: Array<{
 *   ...requestFields,
 *   _fullName:   string,
 *   _taxRecords: Array
 * }>
 */
async function apiGetAdminDashboard() {
  const adminService = sessionStorage.getItem("service") || "";

  if (USE_MOCK) {
    const users = await _loadMockUsers();
    const requests = [];

    users.forEach((user) => {
      if (user.role !== "user") return;
      const profile = user.profile || {};
      const taxInfo = user.taxInfo || {};

      _applyOverrides(user.requests || []).forEach((req) => {
        if (req.documentType !== adminService) return;
        requests.push({
          ...req,
          _fullName: [profile.firstName, profile.lastName]
            .filter(Boolean)
            .join(" "),
          _taxRecords: taxInfo.taxRecords || [],
        });
      });
    });

    return requests;
  }

  // Flask
  const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
    headers: _authHeaders(),
  });
  if (!res.ok) throw new Error("Could not load admin dashboard data");
  return res.json();
}

/**
 * Save an admin's decision on a request.
 *
 * Flask: POST /api/requests/{requestId}/decision
 * Headers: Authorization: Bearer {token}  (admin only)
 * Body: {
 *   status:      "approved" | "rejected" | "pending",
 *   processedBy: string,       // admin's userId (auth.id)
 *   note:        string | null
 * }
 * Response: { requestId: string, status: string }
 */
async function apiSaveDecision(requestId, status, note = "") {
  const adminId = sessionStorage.getItem("userId") || "";

  if (USE_MOCK) {
    try {
      const overrides = JSON.parse(
        localStorage.getItem("req_overrides") || "{}",
      );
      overrides[requestId] = { status, note };
      localStorage.setItem("req_overrides", JSON.stringify(overrides));
    } catch (err) {
      console.error("[api.js | MOCK] localStorage error:", err);
    }
    console.log(`[api.js | MOCK] POST /api/requests/${requestId}/decision →`, {
      status,
      processedBy: adminId,
      note,
    });
    return { requestId, status };
  }

  // Flask
  const res = await fetch(`${API_BASE}/api/requests/${requestId}/decision`, {
    method: "POST",
    headers: _authHeaders(),
    body: JSON.stringify({ status, processedBy: adminId, note: note || null }),
  });
  if (!res.ok) throw new Error("Could not save decision");
  return res.json();
}

// DOCUMENT DOWNLOAD

/**
 * Download an approved document as a PDF.
 * In MOCK mode throws "MOCK" so the caller can show an info toast.
 *
 * Flask: GET /api/requests/{requestId}/document
 * Headers: Authorization: Bearer {token}
 * Response: PDF blob (Content-Type: application/pdf)
 */
async function apiDownloadDocument(requestId, documentType) {
  if (USE_MOCK) {
    console.log(`[api.js | MOCK] GET /api/requests/${requestId}/document`);
    throw new Error("MOCK");
  }

  // Flask
  const res = await fetch(`${API_BASE}/api/requests/${requestId}/document`, {
    headers: _authHeaders(),
  });
  if (!res.ok) throw new Error("Download failed");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${documentType}_${requestId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
