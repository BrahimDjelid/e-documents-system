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

    if (!btn || !dropdown) return;

    await _loadAndRender();

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      _toggleDropdown();
    });

    document.addEventListener("click", (e) => {
      if (_dropdownOpen && wrapper && !wrapper.contains(e.target)) {
        _closeDropdown();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && _dropdownOpen) _closeDropdown();
    });

    const markAllBtn = dom("notif-mark-all-btn");
    if (markAllBtn) {
      markAllBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        // FIX 2.1: Update local state FIRST, render immediately, then call API
        _notifications = _notifications.map((n) => ({ ...n, read: true }));
        _render();
        try {
          await apiMarkAllNotificationsRead();
        } catch (err) {
          console.warn("[notifications.js] markAll error:", err);
        }
      });
    }

    // FIX 2.2: Deep-link runs after data is loaded (not on a fragile fixed timer)
    _handleDeepLink();
  }

  async function _loadAndRender() {
    try {
      _notifications = await apiGetNotifications();
      _render();
    } catch (err) {
      console.warn("[notifications.js] Could not load notifications:", err);
    }
  }

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
      Array.from(list.children).forEach((c) => {
        if (c.id !== "notif-empty-state") c.remove();
      });
      return;
    }

    if (emptyState) emptyState.style.display = "none";

    const sorted = [...visible].sort((a, b) => {
      if (!a.read && b.read) return -1;
      if (a.read && !b.read) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    Array.from(list.children).forEach((c) => {
      if (c.id !== "notif-empty-state") c.remove();
    });

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

    const body = item.querySelector(".notif-item-body");
    body.addEventListener("click", () => _handleNotifClick(notif));

    // FIX 2.1: Optimistic update — state + render BEFORE API call
    const readBtn = item.querySelector(".notif-read-btn");
    if (readBtn) {
      readBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        _notifications = _notifications.map((n) =>
          n.id === notif.id ? { ...n, read: true } : n,
        );
        _render();
        try {
          await apiMarkNotificationRead(notif.id);
        } catch (err) {
          console.warn("[notifications.js] markRead error:", err);
        }
      });
    }

    const delBtn = item.querySelector(".notif-delete-btn");
    if (delBtn) {
      delBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        // Optimistic delete
        _notifications = _notifications.map((n) =>
          n.id === notif.id ? { ...n, deleted: true } : n,
        );
        item.classList.add("notif-item--removing");
        setTimeout(async () => {
          _render();
          try {
            await apiDeleteNotification(notif.id);
          } catch (err) {
            console.warn("[notifications.js] delete error:", err);
          }
        }, 300);
      });
    }

    return item;
  }

  // FIX 2.1 + 2.2 + 2.3: Reliable click handler — always navigates, first click always works
  async function _handleNotifClick(notif) {
    // Optimistic read BEFORE navigation so badge updates immediately
    if (!notif.read) {
      _notifications = _notifications.map((n) =>
        n.id === notif.id ? { ...n, read: true } : n,
      );
      _render();
      try {
        await apiMarkNotificationRead(notif.id);
      } catch (err) {
        console.warn("[notifications.js] markRead on click error:", err);
      }
    }

    _closeDropdown();

    if (!notif.requestId) return;

    const currentPath = window.location.pathname;

    if (_role === "admin") {
      if (currentPath.includes("requests-management")) {
        // Already on target page — open modal now using polling (no race condition)
        _openModalWhenReady(notif.requestId);
      } else {
        // FIX 2.3: Always set sessionStorage then navigate — guaranteed to trigger
        sessionStorage.setItem("openRequestId", notif.requestId);
        window.location.href = "requests-management.html";
      }
    } else {
      if (currentPath.includes("documents")) {
        _openModalWhenReady(notif.requestId);
      } else {
        sessionStorage.setItem("openRequestId", notif.requestId);
        window.location.href = "documents.html";
      }
    }
  }

  // FIX 2.2: Polls until openModal is available — eliminates the fixed-delay race condition
  function _openModalWhenReady(requestId, maxWait = 4000) {
    const interval = 50;
    let elapsed = 0;

    const poll = setInterval(() => {
      if (typeof openModal === "function") {
        clearInterval(poll);
        openModal(requestId);
      } else {
        elapsed += interval;
        if (elapsed >= maxWait) {
          clearInterval(poll);
          console.warn(
            "[notifications.js] openModal not available after",
            maxWait,
            "ms",
          );
        }
      }
    }, interval);
  }

  // FIX 2.2: Deep-link handler — called after _loadAndRender(), uses polling not fixed delay
  function _handleDeepLink() {
    const id = sessionStorage.getItem("openRequestId");
    if (!id) return;
    sessionStorage.removeItem("openRequestId");
    _openModalWhenReady(id);
  }

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

  window.initNotifications = initNotifications;
})();
