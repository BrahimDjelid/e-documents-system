# PROJECT CONTEXT — Algerian Tax Org E-Document System

## What This Project Is

A full-stack web-based e-document system designed for Algerian tax administration, enabling personne physique (individual taxpayers) to request official fiscal documents online. The system supports a complete workflow where citizens submit document requests and tax administrators review, process, and generate official PDF documents.

The platform is built with a decoupled architecture: a static frontend (HTML, CSS, JavaScript) interacting with a Flask REST API backend, allowing seamless transition from mock data to real server-side processing.

🎯 Core Concept

The system revolves around Algerian taxpayers identified by their NIF (Numéro d’Identification Fiscale). Each user represents a personne physique conducting economic activity without forming a legal entity.

User data is structured into three main domains:

Profile: personal identity (name, date of birth, national ID, contact info)
Tax Information (taxInfo): activity, tax regime, business address, tax records
Requests: document request lifecycle and workflow tracking

This structure ensures consistency with official administrative documents such as C20 certificates and extrait de rôle, which are generated dynamically based on validated user data.

⚙️ System Features
👤 User (Citizen) Side
Secure login using NIF (15 digits) or admin email
Submit requests for:
C20 (tax certificate)
Extrait de rôle (tax record extract)
Pre-filled forms using verified profile and tax data
Eligibility validation:
Identity verification
NIF consistency
Availability of tax records
Real-time request tracking (pending / approved / rejected)
Notifications for request updates
Download generated PDF documents once approved
Profile management (contact info, avatar, password)
🛠️ Admin Side
Role-based access (C20 or Extrait de rôle service)
Dashboard with real-time request statistics
Review and process incoming requests
Access enriched applicant data (profile + tax records)
Decision system (approve / reject / pending) with notes
Automatic notification dispatch to users
🔄 Backend & Workflow

The Flask backend provides a RESTful API handling authentication, user data, requests, and document generation:

Authentication via token-based session (Bearer token)
Request submission with validation rules:
Identity must be verified
NIF must match tax records
Required data must be present
Dynamic compliance computation:
Tax compliance is calculated from taxRecords, never stored or trusted statically
Document generation (server-side):
C20 certificate (structured official layout)
Extrait de rôle (tabular fiscal data with totals)
Generated as PDF using ReportLab
Notification system:
Admin notified on new requests
Users notified on decisions (approved/rejected)
🧠 Key Design Decisions
Single source of truth: tax compliance is always computed from raw tax records (never stored)
Separation of concerns:
Frontend = UI + interaction
Backend = validation, business logic, document generation
Progressive enhancement:
System originally used mock JSON data
Now fully supports real backend without changing frontend logic
Role-based routing and access control implemented at frontend level
🧱 Tech Stack
Frontend: HTML, CSS, JavaScript (vanilla)
Backend: Flask (Python REST API)
Data: JSON-based persistence (users, requests)
PDF Generation: ReportLab
Authentication: Token-based (sessionStorage)
Hosting:
Frontend: GitHub Pages (or static hosting)
Backend: Local / deployable Flask server
📌 Summary

This system evolves from a static prototype into a functional e-government platform, simulating real-world tax administration workflows in Algeria. It integrates identity validation, tax data processing, request lifecycle management, and official document generation into a cohesive, scalable architecture.

---

## Project Structure

```
project/
│
├── index.html
│
├── assets/
│   ├── css/
│   │   ├── all.min.css
│   │   ├── main.css
│   │   ├── auth.css
│   │   ├── dashboard.css
│   │   ├── documents.css
│   │   ├── request.css
│   │   ├── profile.css
│   │   ├── user-dashboard.css
│   │   ├── admin-dashboard.css
│   │   ├── admin-profile.css
│   │   └── requests-management.css
│   │   └── notification.css
│   │
│   └── js/
│      ├── auth.js
│      ├── router.js
│      ├── theme.js
│      ├── components.js
│      ├── api.js
│      │
│      ├── documents.js
│      ├── request.js
│      ├── profile.js
│      ├── user-dashboard.js
│      │
│      ├── admin-dashboard.js
│      ├── admin-profile.js
│      ├── requests-management.js
│      │
│      └── notification.js
│
├── pages/
│   ├── login.html
│   │
│   ├── user/
│   │   ├── dashboard.html
│   │   ├── documents.html
│   │   ├── request.html
│   │   └── profile.html
│   │
│   └── admin/
│       ├── dashboard.html
│       ├── requests-management.html
│       └── profile.html
│
├── components/
│   ├── user-sidebar.html
│   ├── admin-sidebar.html
│   └── topbar.html
│
│
├── backend/
│   ├── app.py
│   │
│   ├── data/
│   │   └── users.json
│   │
│   ├── documents/                      ← Generated PDFs (C20, extrait)
│   │
│   └──  uploads/                        ← User avatars storage
│
└── README.md
```

## Authentication & Routing System

- `auth.js` validates login, detects role (`user` / `admin`), stores session in `sessionStorage`
- `router.js` runs as IIFE on every protected page — wrong role or no session → redirect to `index.html`
- `logout()` is defined in `router.js`, usable anywhere with `onclick="logout()"`


---
# CSS Design Tokens Reference

> Generated from `main.css` — use these tokens consistently across all components.
## Backgrounds

| Token               | Value     | When to use                                     |
| ------------------- | --------- | ----------------------------------------------- |
| `var(--background)` | `#f8fafc` | Main page background                            |
| `var(--surface-1)`  | `#ffffff` | Cards, modals, dropdowns, sidebars              |
| `var(--surface-2)`  | `#f9fafb` | Input fields, table rows, secondary backgrounds |

---

## Text Colors

|Token|Value|When to use|
|---|---|---|
|`var(--text-primary)`|`#1f2937`|Main headings, important text|
|`var(--text-muted)`|`#6b7280`|Secondary text, hints, labels|

---

## Brand Colors

| Token                     | Value     | When to use                             |
| ------------------------- | --------- | --------------------------------------- |
| `var(--primary-blue)`     | `#035e7b` | Primary buttons, links, active states   |
| `var(--primary-dark)`     | `#034b63` | Hover states for primary elements       |
| `var(--secondary-accent)` | `#f59e0b` | Secondary actions, highlights           |
| `var(--info-blue)`        | `#3b82f6` | Informational elements, badges          |
| `var(--purple-accent)`    | `#8b5cf6` | Special highlights, downloadable states |
| `var(--teal-accent)`      | `#14b8a6` | Accent elements, tags                   |

---

## Form Elements

|Token|Value|When to use|
|---|---|---|
|`var(--input-bg)`|`#f9fafb`|Default input background|
|`var(--input-bg-focus)`|`#ffffff`|Input background when focused|
|`var(--input-border)`|`#e5e7eb`|Input borders|
|`var(--input-placeholder)`|`#d1d5db`|Placeholder text|
|`var(--input-focus-ring)`|`rgba(3, 94, 123, 0.1)`|Focus glow / ring effect|

---

## Status Indicators

|Token|Value|When to use|
|---|---|---|
|`var(--status-pending)`|`#f59e0b`|Pending status text / icon|
|`var(--status-pending-bg)`|`#fef3c7`|Pending status background|
|`var(--status-approved)`|`#10b981`|Approved status text / icon|
|`var(--status-approved-bg)`|`#d1fae5`|Approved status background|
|`var(--status-rejected)`|`#ef4444`|Rejected status text / icon|
|`var(--status-rejected-bg)`|`#fee2e2`|Rejected status background|
|`var(--status-ready)`|`#3b82f6`|Ready status text / icon|
|`var(--status-ready-bg)`|`#dbeafe`|Ready status background|
|`var(--status-download)`|`#8b5cf6`|Download status text / icon|
|`var(--status-download-bg)`|`#ede9fe`|Download status background|

---

## Feedback Colors

|Token|Value|When to use|
|---|---|---|
|`var(--error)`|`#e53935`|Error messages, destructive actions|
|`var(--success)`|`#16a34a`|Success messages, confirmations|

---

## Borders & Shadows

|Token|Value|When to use|
|---|---|---|
|`var(--border-light)`|`#e5e7eb`|Subtle borders, dividers|
|`var(--shadow-default)`|`0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)`|Card shadows, default elevation|
|`var(--shadow-hover)`|`0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)`|Hover state shadows|
|`var(--shadow-elevated)`|`0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)`|Modals, dropdowns, popovers|
|`var(--shadow-button)`|`0 4px 6px rgba(3, 94, 123, 0.25)`|Primary button shadow|

---

## Spacing Scale

|Token|Value|When to use|
|---|---|---|
|`var(--space-xs)`|`4px`|Icon gaps, tight internal padding|
|`var(--space-sm)`|`8px`|Small gaps, button icon spacing|
|`var(--space-md)`|`16px`|Component padding, form gaps|
|`var(--space-lg)`|`24px`|Section spacing, card padding|
|`var(--space-xl)`|`32px`|Large section gaps|
|`var(--space-2xl)`|`48px`|Page-level vertical rhythm|

---

## Border Radius

|Token|Value|When to use|
|---|---|---|
|`var(--radius-sm)`|`6px`|Badges, small tags, inner elements|
|`var(--radius-md)`|`10px`|Buttons, inputs, dropdowns|
|`var(--radius-lg)`|`16px`|Cards, modals, panels|
|`var(--radius-full)`|`9999px`|Pills, avatars, toggle buttons|

---

## Gray Scale

|Token|Value|When to use|
|---|---|---|
|`var(--gray-50)`|`#f9fafb`|Hover backgrounds, lightest fills|
|`var(--gray-100)`|`#f3f4f6`|Subtle fills, skeleton loaders|
|`var(--gray-300)`|`#d1d5db`|Disabled states, dividers|
|`var(--gray-900)`|`#111827`|High-contrast text, dark UI elements|

---

## Typography

| Token              | Value                  | When to use                     |
| ------------------ | ---------------------- | ------------------------------- |
| `var(--font-main)` | `"Roboto", sans-serif` | All text across the application |

---

## Dark Mode Notes

All tokens above automatically adapt when `<html class="dark">` is set. Key dark overrides:

|Token|Light value|Dark value|
|---|---|---|
|`--background`|`#f8fafc`|`#0f172a`|
|`--surface-1`|`#ffffff`|`#1e293b`|
|`--surface-2`|`#f9fafb`|`#0f172a`|
|`--text-primary`|`#1f2937`|`#f1f5f9`|
|`--text-muted`|`#6b7280`|`#94a3b8`|
|`--border-light`|`#e5e7eb`|`#1e293b`|
|`--input-bg`|`#f9fafb`|`#0f172a`|
|`--input-border`|`#e5e7eb`|`#334155`|
### CSS File Rules
| File | Used On |
|------|---------|
| `main.css` | Every page |
| `auth.css` | `login.html` only |
| `dashboard.css` | All dashboard pages |
| `components.css` | All dashboard pages |

### Component Class Pattern
```html
<div class="card card--sm card--accent">...</div>
```

---

## Dark Mode

- Toggled by adding/removing `class="dark"` on `<html>`
- All CSS variables have dark mode overrides under `.dark { }` in `main.css`
- `theme.js` handles persistence and toggle button behavior
- Toggle button: `<button class="theme-toggle">` (use `theme-toggle--fixed` on login page)

---

## Flask Migration Notes

When Flask backend is ready, replace JSON file reads in `api.js` with real endpoints:

```javascript
// Current (mock)
const users = await fetch("../../data/users.json").then(r => r.json());

// Future (Flask)
const users = await fetch("/api/users", {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());
```

All API calls are centralized in `api.js` — only that file needs updating, not individual pages.

---

## Important Rules / Decisions

- Components (sidebar, topbar) load dynamically via JS fetch — never copy-paste HTML across pages
- All colors and spacing come from CSS variables — never hardcode values
- `sessionStorage` used for auth (not `localStorage`) — clears on tab close
- Path from dashboard pages to assets: `../../assets/`
- Path from dashboard pages to components: `../../components/`
- Dark mode class goes on `<html>` tag, not `<body>`
- Font: Roboto (Google Fonts)