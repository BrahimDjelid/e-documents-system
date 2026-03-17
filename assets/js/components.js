// components.js - Loads sidebar + topbar into page
// and wires up: active link, user info, avatar

(async function loadComponents() {
  const role = sessionStorage.getItem("role");
  const userId = sessionStorage.getItem("userId");
  const userName = sessionStorage.getItem("userFirstName");
  const currentPage = document.body.dataset.page || "";

  // Decide which sidebar to load
  const sidebarFile =
    role === "admin"
      ? "../../components/admin-sidebar.html"
      : "../../components/user-sidebar.html";

  const topbarFile = "../../components/topbar.html";

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
      const res = await fetch(topbarFile);
      const html = await res.text();
      topbarMount.innerHTML = html;
    } catch (err) {
      console.error("Could not load topbar:", err);
    }
  }

  // Set active link in sidebar
  document.querySelectorAll(".sidebar-link").forEach(function (link) {
    if (link.dataset.page === currentPage) {
      link.classList.add("active");
    }
  });

  // Fill user name + avatar initial
  // Get first letter of userId for avatar
  const initial = userName ? userName.charAt(0).toUpperCase() : "?";

  const sidebarAvatar = document.getElementById("sidebar-avatar");
  const sidebarUserName = document.getElementById("sidebar-user-name");
  const topbarAvatar = document.getElementById("topbar-avatar");

  if (sidebarAvatar) sidebarAvatar.textContent = initial;
  if (topbarAvatar) topbarAvatar.textContent = initial;

  // Show email for admin, NIF truncated for user/org
  if (sidebarUserName) {
    if (role === "admin") {
      sidebarUserName.textContent = userId || "Admin";
    } else {
      sidebarUserName.textContent = userId ? userId.slice(0, 6) + "•••" : "—";
    }
  }

  // theme.js runs before components.js, but the button didn't exist yet.
  // Re-init it now that the topbar is in the DOM.
  const themeBtn = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");

  if (themeBtn && themeIcon) {
    // Apply saved theme to icon
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      themeIcon.classList.replace("fa-moon", "fa-sun");
    }

    themeBtn.addEventListener("click", function () {
      const nowDark = document.documentElement.classList.toggle("dark");
      themeIcon.classList.toggle("fa-sun", nowDark);
      themeIcon.classList.toggle("fa-moon", !nowDark);
      localStorage.setItem("theme", nowDark ? "dark" : "light");
    });
  }
})();
