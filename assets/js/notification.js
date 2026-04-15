// notifications.js — Notification System
// Works in MOCK mode (derives from users.json + localStorage)
// Ready for Flask backend with zero refactor (just flip USE_MOCK in api.js)
//
// Loaded by components.js after sidebar/topbar mount.
// Exposes: initNotifications()

"use strict";

(function () {
  //  State
  let _notifications = [];
  let _dropdownOpen = false;
  let _role = sessionStorage.getItem("role") || "user";
  let _userId = sessionStorage.getItem("userId") || "";
  let _service = sessionStorage.getItem("service") || "";

  // DOM refs (resolved after topbar mounts)
  function dom(id) {
    return document.getElementById(id);
  }

  //  Public init 
  async function initNotifications() {
    const btn = dom("notif-btn");
    const dropdown = dom("notif-dropdown");
    const wrapper = dom("notif-wrapper");

    if (!btn || !dropdown) return; // topbar not loaded yet

    // Load + render
    await _loadAndRender();

    // Toggle dropdown on bell click
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      _toggleDropdown();
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (_dropdownOpen && wrapper && !wrapper.contains(e.target)) {
        _closeDropdown();
      }
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && _dropdownOpen) _closeDropdown();
    });

    // Mark-all button
    const markAllBtn = dom("notif-mark-all-btn");
    if (markAllBtn) {
      markAllBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await apiMarkAllNotificationsRead();
        _notifications = _notifications.map((n) => ({ ...n, read: true }));
        _render();
      });
    }

    // Check for deep-link: open modal if openRequestId is in sessionStorage
    _handleDeepLink();
  }

  // Load & render
  async function _loadAndRender() {
    try {
      _notifications = await apiGetNotifications();
      _render();
    } catch (err) {
      console.warn("[notifications.js] Could not load notifications:", err);
    }
  }

  // Render
  function _render() {
    _renderBadge();
    _renderList();
  }

  function _renderBadge() {
    const badge = dom("notif-badge");
    const pill = dom("notif-unread-pill");
    if (!badge) return;

    const unread = _notifications.filter((n) => !n.read && !n.deleted).length;

    if (unread > 0) {
      const label = unread > 99 ? "99+" : String(unread);
      badge.textContent = label;
      badge.style.display = "flex";
      if (pill) {
        pill.textContent = label;
        pill.style.display = "inline-flex";
      }
    } else {
      badge.style.display = "none";
      if (pill) pill.style.display = "none";
    }
  }

  function _renderList() {
    const list = dom("notif-list");
    const emptyState = dom("notif-empty-state");
    if (!list) return;

    const visible = _notifications.filter((n) => !n.deleted);

    if (visible.length === 0) {
      if (emptyState) emptyState.style.display = "flex";
      // Remove all item nodes, keep empty state
      Array.from(list.children).forEach((c) => {
        if (c.id !== "notif-empty-state") c.remove();
      });
      return;
    }

    if (emptyState) emptyState.style.display = "none";

    // Sort: unread first, then by date desc
    const sorted = [...visible].sort((a, b) => {
      if (!a.read && b.read) return -1;
      if (a.read && !b.read) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Remove old item nodes (keep empty-state)
    Array.from(list.children).forEach((c) => {
      if (c.id !== "notif-empty-state") c.remove();
    });

    // Render items
    sorted.forEach((notif) => {
      const item = _buildItem(notif);
      list.appendChild(item);
    });
  }

  function _buildItem(notif) {
    const item = document.createElement("div");
    item.className = "notif-item" + (notif.read ? "" : " notif-item--unread");
    item.dataset.id = notif.id;

    const iconClass = _iconForType(notif.type);
    const iconColor = _colorForType(notif.type);
    const timeStr = _formatTime(notif.createdAt);

    item.innerHTML = `
      <div class="notif-item-icon notif-icon--${iconColor}">
        <i class="${iconClass}"></i>
      </div>
      <div class="notif-item-body">
        <p class="notif-item-msg">${_escapeHtml(notif.message)}</p>
        <span class="notif-item-time">
          <i class="fa-regular fa-clock"></i>
          ${timeStr}
        </span>
      </div>
      <div class="notif-item-actions">
        ${
          !notif.read
            ? `<button class="notif-action-btn notif-read-btn" data-id="${notif.id}" title="Mark as read">
          <i class="fa-solid fa-check"></i>
        </button>`
            : ""
        }
        <button class="notif-action-btn notif-delete-btn" data-id="${notif.id}" title="Delete">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
      ${!notif.read ? '<span class="notif-unread-dot"></span>' : ""}
    `;

    // Click body → navigate + mark read
    const body = item.querySelector(".notif-item-body");
    body.addEventListener("click", () => _handleNotifClick(notif));

    // Mark-read button
    const readBtn = item.querySelector(".notif-read-btn");
    if (readBtn) {
      readBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await apiMarkNotificationRead(notif.id);
        _notifications = _notifications.map((n) =>
          n.id === notif.id ? { ...n, read: true } : n,
        );
        _render();
      });
    }

    // Delete button
    const delBtn = item.querySelector(".notif-delete-btn");
    if (delBtn) {
      delBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        item.classList.add("notif-item--removing");
        setTimeout(async () => {
          await apiDeleteNotification(notif.id);
          _notifications = _notifications.map((n) =>
            n.id === notif.id ? { ...n, deleted: true } : n,
          );
          _render();
        }, 300);
      });
    }

    return item;
  }

  // Click navigation
  async function _handleNotifClick(notif) {
    // Mark as read first
    if (!notif.read) {
      await apiMarkNotificationRead(notif.id);
      _notifications = _notifications.map((n) =>
        n.id === notif.id ? { ...n, read: true } : n,
      );
      _render();
    }

    _closeDropdown();

    if (!notif.requestId) return;

    // Store requestId for auto-open modal on target page
    sessionStorage.setItem("openRequestId", notif.requestId);

    const currentPath = window.location.pathname;

    if (_role === "admin") {
      const target = "requests-management.html";
      if (currentPath.includes("requests-management")) {
        // Already there — open modal directly
        if (typeof openModal === "function") openModal(notif.requestId);
      } else {
        window.location.href = target;
      }
    } else {
      const target = "documents.html";
      if (currentPath.includes("documents")) {
        if (typeof openModal === "function") openModal(notif.requestId);
      } else {
        window.location.href = target;
      }
    }
  }

  // Deep-link handler
  function _handleDeepLink() {
    const id = sessionStorage.getItem("openRequestId");
    if (!id) return;
    sessionStorage.removeItem("openRequestId");

    // Give the page JS time to load data and wire openModal
    setTimeout(() => {
      if (typeof openModal === "function") {
        openModal(id);
      }
    }, 400);
  }

  // Dropdown toggle 
  function _toggleDropdown() {
    if (_dropdownOpen) _closeDropdown();
    else _openDropdown();
  }

  function _openDropdown() {
    const dropdown = dom("notif-dropdown");
    const btn = dom("notif-btn");
    if (!dropdown) return;
    _dropdownOpen = true;
    dropdown.classList.add("open");
    if (btn) btn.setAttribute("aria-expanded", "true");
  }

  function _closeDropdown() {
    const dropdown = dom("notif-dropdown");
    const btn = dom("notif-btn");
    if (!dropdown) return;
    _dropdownOpen = false;
    dropdown.classList.remove("open");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  // Helpers
  function _iconForType(type) {
    const map = {
      request_approved: "fa-solid fa-circle-check",
      request_rejected: "fa-solid fa-circle-xmark",
      new_request: "fa-regular fa-file-lines",
    };
    return map[type] || "fa-regular fa-bell";
  }

  function _colorForType(type) {
    const map = {
      request_approved: "green",
      request_rejected: "red",
      new_request: "blue",
    };
    return map[type] || "blue";
  }

  function _formatTime(iso) {
    if (!iso) return "—";
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now - date;
    const diffM = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);

    if (diffM < 1) return "Just now";
    if (diffM < 60) return `${diffM}m ago`;
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD < 7) return `${diffD}d ago`;

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function _escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Expose
  window.initNotifications = initNotifications;
})();
