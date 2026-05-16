// api.js - Centralized API layer (Flask only)
// All requests go to the Flask backend at API_BASE.

"use strict";

const API_BASE = "http://127.0.0.1:5000";

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

// AUTH 

/**
 * Login — accepts NIF (15-digit string) or admin email.
 *
 * POST /api/auth/login
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
 * For users returns:  { auth, profile, taxInfo, eligibility, requests, role }
 * For admins returns: { auth, profile, role, service }
 *
 * GET /api/user/me
 * Headers: Authorization: Bearer {token}
 */
async function apiGetCurrentUser() {
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
 * PATCH /api/user/profile
 * Headers: Authorization: Bearer {token}
 * Body: { email: string, phone: string }
 * Response: { success: true }
 */
async function apiUpdateProfile(email, phone) {
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
 * PUT /api/admin/profile
 * Headers: Authorization: Bearer {token}  (admin only)
 * Body: { firstName: string, lastName: string, email: string }
 * Response: {
 *   success:   true,
 *   newToken?: string   // returned when email changed
 * }
 */
async function apiUpdateAdminProfile({ firstName, lastName, email }) {
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
 * The server stores the image and returns a public URL.
 *
 * Caller workflow (profile.js / admin-profile.js):
 *   1. User picks a file → FileReader → base64 data-URI
 *   2. Call apiUploadAvatar(base64, userId)
 *   3. Use returned { avatarUrl } to set <img src> and update the sidebar avatar
 *
 * POST /api/user/avatar
 * Headers: Authorization: Bearer {token}
 * Body: { userId: string, avatarB64: string }
 * Response: { success: true, avatarUrl: string }
 */
async function apiUploadAvatar(base64, userId) {
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
 * DELETE /api/user/avatar
 * Headers: Authorization: Bearer {token}
 * Body: { userId: string }
 * Response: { success: true }
 */
async function apiRemoveAvatar(userId) {
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
 * POST /api/user/password
 * Headers: Authorization: Bearer {token}
 * Body: { currentPassword: string, newPassword: string }
 * Response: { success: true }
 */
async function apiChangePassword(currentPassword, newPassword) {
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
 * POST /api/requests
 * Headers: Authorization: Bearer {token}
 * Body: {
 *   requestId:    string,
 *   submittedAt:  string,              // ISO-8601 timestamp
 *   status:       "pending",
 *   userId:       string,
 *   documentType: "C20" | "Extrait de rôle",
 *   purpose:      string | null,
 *   taxStatus:    "À jour" | "Non à jour",
 *   applicant:    { fullName, nationalId, dateOfBirth, phone, email },
 *   business:     { mainActivityName, mainActivityCode, businessAddress,
 *                   taxRegime, commercialRegisterNumber },
 *   taxRecords:   Array | undefined    // only for "Extrait de rôle"
 * }
 * Response: { requestId: string, status: "pending" }
 */
async function apiSubmitRequest(payload) {
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
 * GET /api/requests
 * Headers: Authorization: Bearer {token}  (admin only)
 * Response: Array<{
 *   ...requestFields,
 *   _fullName, _nif, _dob, _phone, _email, _taxRegime, _taxRecords
 * }>
 */
async function apiGetRequests() {
  const res = await fetch(`${API_BASE}/api/requests`, {
    headers: _authHeaders(),
  });
  if (!res.ok) throw new Error("Could not load requests");
  return res.json();
}

/**
 * Get dashboard summary data for the logged-in admin.
 *
 * GET /api/admin/dashboard
 * Headers: Authorization: Bearer {token}  (admin only)
 * Response: Array<{ ...requestFields, _fullName, _taxRecords }>
 */
async function apiGetAdminDashboard() {
  const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
    headers: _authHeaders(),
  });
  if (!res.ok) throw new Error("Could not load admin dashboard data");
  return res.json();
}

/**
 * Get global admin statistics for reports KPI cards and initial charts.
 *
 * GET /api/admin/stats
 * Headers: Authorization: Bearer {token}  (admin only)
 */
async function apiGetAdminStats() {
  const res = await fetch(`${API_BASE}/api/admin/stats`, {
    headers: _authHeaders(),
  });
  if (!res.ok) throw new Error("Could not load admin statistics");
  return res.json();
}

/**
 * Build a filtered statistical report.
 *
 * POST /api/admin/reports
 * Headers: Authorization: Bearer {token}  (admin only)
 * Body: { dateFrom, dateTo, status, type }
 */
async function apiGenerateAdminReport(filters) {
  const res = await fetch(`${API_BASE}/api/admin/reports`, {
    method: "POST",
    headers: _authHeaders(),
    body: JSON.stringify(filters || {}),
  });
  if (!res.ok) throw new Error("Could not generate report");
  return res.json();
}

/**
 * Export the current admin report as PDF or CSV and trigger a download.
 *
 * GET /api/admin/reports/export?format=pdf|csv&...
 * Headers: Authorization: Bearer {token}  (admin only)
 */
async function apiExportAdminReport(format, filters) {
  const params = new URLSearchParams({ format });
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const res = await fetch(`${API_BASE}/api/admin/reports/export?${params}`, {
    headers: _authHeaders(),
  });
  if (!res.ok) throw new Error("Report export failed");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const extension = format === "csv" ? "csv" : "pdf";
  a.href = url;
  a.download = `admin_report.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Save an admin's decision on a request.
 *
 * POST /api/requests/{requestId}/decision
 * Headers: Authorization: Bearer {token}  (admin only)
 * Body: { status: "approved"|"rejected"|"pending", processedBy: string, note: string }
 * Response: { requestId: string, status: string }
 */
async function apiSaveDecision(requestId, status, note = "") {
  const adminId = sessionStorage.getItem("userId") || "";

  const res = await fetch(`${API_BASE}/api/requests/${requestId}/decision`, {
    method: "POST",
    headers: _authHeaders(),
    body: JSON.stringify({ status, processedBy: adminId, note: note ?? "" }),
  });
  if (!res.ok) throw new Error("Could not save decision");
  return res.json();
}

// DOCUMENT DOWNLOAD 

/**
 * Download an approved document as a PDF.
 *
 * GET /api/requests/{requestId}/document
 * Headers: Authorization: Bearer {token}
 * Response: PDF blob (Content-Type: application/pdf)
 */
async function apiDownloadDocument(requestId, documentType) {
  const res = await fetch(`${API_BASE}/api/requests/${requestId}/document`, {
    headers: _authHeaders(),
  });
  if (!res.ok) throw new Error("Download failed");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${documentType}_${requestId}.pdf`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// NOTIFICATIONS 
/**
 * Fetch all notifications for the logged-in user or admin.
 * Excludes soft-deleted entries.
 *
 * GET /api/notifications
 * Headers: Authorization: Bearer {token}
 * Response: Array<{ id, type, message, requestId, read, deleted, createdAt }>
 */
async function apiGetNotifications() {
  const res = await fetch(`${API_BASE}/api/notifications`, {
    headers: _authHeaders(),
  });
  if (!res.ok) throw new Error("Could not load notifications");
  return res.json();
}

/**
 * Mark a single notification as read.
 *
 * POST /api/notifications/{id}/read
 * Headers: Authorization: Bearer {token}
 * Response: { success: true }
 */
async function apiMarkNotificationRead(notifId) {
  const res = await fetch(`${API_BASE}/api/notifications/${notifId}/read`, {
    method: "POST",
    headers: _authHeaders(),
  });
  if (!res.ok) throw new Error("Could not mark notification as read");
  return res.json();
}

/**
 * Mark all notifications as read for the current user/admin.
 *
 * POST /api/notifications/read-all
 * Headers: Authorization: Bearer {token}
 * Response: { success: true }
 */
async function apiMarkAllNotificationsRead() {
  const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
    method: "POST",
    headers: _authHeaders(),
  });
  if (!res.ok) throw new Error("Could not mark all notifications as read");
  return res.json();
}

/**
 * Soft-delete a notification.
 * Sets deleted: true — the record is NEVER removed from DB.
 * Deleted notifications are not returned by apiGetNotifications().
 *
 * DELETE /api/notifications/{id}
 * Headers: Authorization: Bearer {token}
 * Response: { success: true }
 */
async function apiDeleteNotification(notifId) {
  const res = await fetch(`${API_BASE}/api/notifications/${notifId}`, {
    method: "DELETE",
    headers: _authHeaders(),
  });
  if (!res.ok) throw new Error("Could not delete notification");
  return res.json();
}
