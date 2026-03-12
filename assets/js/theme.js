// theme.js — Dark mode toggle
// Used on ALL pages (login + all dashboard pages)

const themeToggleBtn = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");

// Apply saved theme immediately on page load
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
  themeIcon.classList.replace("fa-moon", "fa-sun");
}

// Toggle on click
themeToggleBtn.addEventListener("click", function () {
  const isDark = document.documentElement.classList.toggle("dark");

  if (isDark) {
    themeIcon.classList.replace("fa-moon", "fa-sun");
    localStorage.setItem("theme", "dark");
  } else {
    themeIcon.classList.replace("fa-sun", "fa-moon");
    localStorage.setItem("theme", "light");
  }
});
