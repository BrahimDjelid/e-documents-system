// theme.js — Dark mode toggle
// Used on ALL pages (login + all dashboard pages)

// Apply saved theme immediately
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
}

// Wire toggle button (login page only)
// On dashboard pages the button doesn't exist yet
const themeToggleBtn = document.getElementById("theme-toggle");
const themeIcon      = document.getElementById("theme-icon");

if (themeToggleBtn && themeIcon) {
  // Sync icon with current theme state
  const isDark = document.documentElement.classList.contains("dark");
  if (isDark) {
    themeIcon.classList.replace("fa-moon", "fa-sun");
  }

  themeToggleBtn.addEventListener("click", function () {
    const nowDark = document.documentElement.classList.toggle("dark");
    themeIcon.classList.toggle("fa-sun",  nowDark);
    themeIcon.classList.toggle("fa-moon", !nowDark);
    localStorage.setItem("theme", nowDark ? "dark" : "light");
  });
}