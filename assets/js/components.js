// components.js - Loads sidebar + topbar into page
// Wires up: active link, user info, avatar,
// page title, dark mode toggle, notifications

(async function loadComponents() {
  const role = sessionStorage.getItem("role");
  const currentPage = document.body.dataset.page || "";
  const pageTitle = document.body.dataset.title || "";

  // Decide which sidebar to load
  const sidebarFile =
    role === "admin"
      ? "../../components/admin-sidebar.html"
      : "../../components/user-sidebar.html";

  // Load sidebar
  const sidebarMount = document.getElementById("sidebar-mount");
  if (sidebarMount) {
    try {
      const res = await fetch(sidebarFile);
      const html = await res.text();
      sidebarMount.innerHTML = html;
    } catch (err) {
      console.error("Could not load sidebar:", err);
    }
  }

  // Load topbar
  const topbarMount = document.getElementById("topbar-mount");
  if (topbarMount) {
    try {
      const res = await fetch("../../components/topbar.html");
      const html = await res.text();
      topbarMount.innerHTML = html;
    } catch (err) {
      console.error("Could not load topbar:", err);
    }
  }

  // Set page title
  const pageTitleEl = document.getElementById("page-title");
  if (pageTitleEl && pageTitle) pageTitleEl.textContent = pageTitle;

  // Set active sidebar link
  document.querySelectorAll(".sidebar-link").forEach(function (link) {
    if (link.dataset.page === currentPage) {
      link.classList.add("active");
    }
  });

  // Fill user name + avatar
  const firstName = sessionStorage.getItem("userFirstName") || "";
  const lastName = sessionStorage.getItem("userLastName") || "";
  const fullName =
    firstName && lastName ? `${firstName} ${lastName}` : firstName || "-";
  const initial = firstName ? firstName.charAt(0).toUpperCase() : "?";

  const sidebarAvatar = document.getElementById("sidebar-avatar");
  const sidebarUserName = document.getElementById("sidebar-user-name");
  const topbarAvatar = document.getElementById("topbar-avatar");

  const userId = sessionStorage.getItem("userId");
  const avatar = localStorage.getItem(`avatar_${userId}`);

  function applyAvatar(el, initial) {
    if (!el) return;

    if (avatar && avatar !== "null") {
      el.innerHTML = `
      <img src="${avatar}?t=${Date.now()}" 
           alt="avatar"
           style="width:100%;height:100%;border-radius:50%;object-fit:cover;"
           onerror="this.parentElement.textContent='${initial}'" />
    `;
    } else {
      el.textContent = initial;
    }
  }

  applyAvatar(sidebarAvatar, initial);
  applyAvatar(topbarAvatar, initial);

  if (sidebarUserName) sidebarUserName.textContent = fullName;

  if (topbarAvatar) {
    topbarAvatar.addEventListener("click", () => {
      const role = sessionStorage.getItem("role");

      if (role === "admin") {
        window.location.href = "../admin/profile.html";
      } else {
        window.location.href = "../user/profile.html";
      }
    });
  }

  // Re-init dark mode toggle
  const themeBtn = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");

  if (themeBtn && themeIcon) {
    // Sync icon with current theme state
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) themeIcon.classList.replace("fa-moon", "fa-sun");

    themeBtn.addEventListener("click", function () {
      const nowDark = document.documentElement.classList.toggle("dark");
      themeIcon.classList.toggle("fa-sun", nowDark);
      themeIcon.classList.toggle("fa-moon", !nowDark);
      localStorage.setItem("theme", nowDark ? "dark" : "light");
    });
  }

  // Initialize notification system
  // initNotifications() is defined in notifications.js (loaded on every page)
  if (typeof initNotifications === "function") {
    initNotifications();
  }
})();
