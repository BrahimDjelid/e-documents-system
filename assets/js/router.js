// router.js - Route Guard
// Role -> allowed path segment & dashboard
const ROLE_CONFIG = {
  user: {
    folder: "/user/",
    dashboard: "dashboard.html",
  },
  admin: {
    folder: "/admin/",
    dashboard: "dashboard.html",
  },
};

// How many levels deep is this page from root?
const ROOT = "../../index.html";

// Build path to own dashboard from current location
function getDashboardPath(role) {
  return "../" + role + "/dashboard.html";
}

// Main guard - runs immediately
(function guard() {
  const role = sessionStorage.getItem("role");

  // If Not logged in
  if (!role) {
    window.location.replace(ROOT);
    return;
  }

  // If Role not recognized
  const config = ROLE_CONFIG[role];
  if (!config) {
    sessionStorage.clear();
    window.location.replace(ROOT);
    return;
  }

  // Check if current page belongs to this role
  const currentPath = window.location.pathname;
  const isOnCorrectFolder = currentPath.includes(config.folder);

  if (!isOnCorrectFolder) {
    // Logged in but on wrong role's pages -> go to own dashboard
    const target = getDashboardPath(role);
    if (!window.location.pathname.includes(target)) {
      window.location.replace(target);
    }
    return;
  }

  // All good - user is logged in and on the right pages
})();

// Logout helper - call this from any page
// Usage: logout()
function logout() {
  sessionStorage.clear();
  window.location.replace(ROOT);
}
