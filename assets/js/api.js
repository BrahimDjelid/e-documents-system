// ================================================
// api.js — Centralized API layer
//
// USE_MOCK = true  → reads from users.json (no backend needed)
// USE_MOCK = false → calls Flask REST API
//
// When Flask is ready:
//   1. Set USE_MOCK = false
//   2. Set API_BASE to your production server URL
//   3. Done — entire app switches to Flask
//
// Load this file BEFORE any page-specific JS:
//   <script src="../../assets/js/api.js"></script>
// ================================================

const USE_MOCK = true;
const API_BASE = "http://localhost:5000";
const MOCK_PATH = "../../data/users.json";

// Internal helpers

function _getToken() {
  return sessionStorage.getItem("token") || "";
}

function _authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${_getToken()}`,
  };
}

async function _loadMockUsers() {
  const res = await fetch(MOCK_PATH);
  if (!res.ok) throw new Error("Could not load users.json");
  return res.json();
}

// Mock: status overrides (requests-management)
// Decisions saved to localStorage are merged at read time
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

// ================================================
// AUTH
// ================================================

/**
 * Login — detect role from input format.
 * Returns user object on success, throws on failure.
 *
 * Flask replacement:
 *   POST /api/login
 *   Body: { id, password }
 *   Response: { token, userId, role, userFirstName, userLastName, service }
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
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, password }),
  });
  if (!res.ok) throw new Error("Incorrect credentials");
  return res.json();
}

// ================================================
// USER
// ================================================

/**
 * Get the full object for the currently logged-in user.
 * Returns: { auth, profile, taxInfo, eligibility, requests, role }
 *
 * Flask replacement:
 *   GET /api/user/me
 *   Headers: Authorization: Bearer {token}
 */
async function apiGetCurrentUser() {
  if (USE_MOCK) {
    const userId = sessionStorage.getItem("userId");
    const users = await _loadMockUsers();
    const user = users.find((u) => u.auth.id === userId);
    if (!user) throw new Error("User not found");
    // Apply any admin-saved status overrides to requests
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

// ================================================
// REQUESTS — User side
// ================================================

/**
 * Submit a new document request.
 * Payload shape (built by request.js):
 *   { requestId, submittedAt, status, userId, documentType,
 *     purpose, taxStatus, applicant, business, taxRecords? }
 *
 * Flask replacement:
 *   POST /api/requests
 *   Headers: Authorization: Bearer {token}
 *   Body: payload
 */
async function apiSubmitRequest(payload) {
  if (USE_MOCK) {
    // Mock: just log — cannot write to users.json from browser
    console.log("[api.js | MOCK] POST /api/requests →", payload);
    // Return a fake success response matching Flask shape
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

// ================================================
// REQUESTS — Admin side
// ================================================

/**
 * Get all requests assigned to the logged-in admin's service.
 * Each request is enriched with the user's profile + taxInfo.
 *
 * Flask replacement:
 *   GET /api/requests
 *   Headers: Authorization: Bearer {token}  (admin only)
 *   Backend filters by admin.service automatically
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
          // Enrich with user data — mirrors what Flask will return
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
 * Save admin decision on a request (approve / reject / pending).
 *
 * Flask replacement:
 *   POST /api/requests/{requestId}/decision
 *   Headers: Authorization: Bearer {token}  (admin only)
 *   Body: { status, processedBy, note }
 */
async function apiSaveDecision(requestId, status, note = "") {
  const adminId = sessionStorage.getItem("userId") || "";

  if (USE_MOCK) {
    // Mock: persist to localStorage so the UI reflects the change on re-render
    try {
      const overrides = JSON.parse(
        localStorage.getItem("req_overrides") || "{}",
      );
      overrides[requestId] = { status, note };
      localStorage.setItem("req_overrides", JSON.stringify(overrides));
    } catch (err) {
      console.error("[api.js | MOCK] localStorage error:", err);
    }
    console.log(
      "[api.js | MOCK] POST /api/requests/" + requestId + "/decision →",
      { status, processedBy: adminId, note },
    );
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
