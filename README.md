# 📄 E-Documents Management System

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=for-the-badge&logo=flask&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2020-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![ReportLab](https://img.shields.io/badge/ReportLab-PDF_Engine-red?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![i18n](https://img.shields.io/badge/i18n-3_Languages-blueviolet?style=for-the-badge)
![English](https://img.shields.io/badge/🇬🇧_English-Supported-0052CC?style=for-the-badge)
![French](https://img.shields.io/badge/🇫🇷_French-Supported-003189?style=for-the-badge)
![Arabic](https://img.shields.io/badge/🇩🇿_Arabic_RTL-Supported-006233?style=for-the-badge)

**A production-grade, full-stack tax document management platform enabling citizens to request official government documents online — with automated PDF generation, admin review workflows, statistical reporting, real-time notifications, and full multilingual support (English, French, Arabic/RTL).**

[Features](#-features) · [Architecture](#-system-architecture) · [Reports System](#-admin-reports-system) · [Multilingual Support](#-multilingual-support) · [Installation](#-installation) · [API Docs](#-api-endpoints) · [Demo Accounts](#-demo-accounts)

</div>

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Features](#-features)
3. [Screenshots](#-screenshots)
4. [Tech Stack](#-tech-stack)
5. [System Architecture](#-system-architecture)
6. [Project Structure](#-project-structure)
7. [Database Design](#-database-design)
8. [Authentication & Security](#-authentication--security)
9. [API Endpoints](#-api-endpoints)
10. [Admin Reports System](#-admin-reports-system)
11. [Multilingual Support](#-multilingual-support)
12. [Installation](#-installation)
13. [Dependencies](#-dependencies)
14. [Environment Variables](#-environment-variables)
15. [Running the Backend](#-running-the-backend)
16. [Running the Frontend](#-running-the-frontend)
17. [User Workflow](#-user-workflow)
18. [PDF Generation Engine](#-pdf-generation-engine)
19. [Notification System](#-notification-system)
20. [Admin Assignment System](#-admin-assignment-system)
21. [Demo Accounts](#-demo-accounts)
22. [Future Improvements](#-future-improvements)
23. [Known Limitations](#-known-limitations)
24. [Contributors](#-contributors)
25. [License](#-license)
26. [Acknowledgements](#-acknowledgements)

---

## 🌍 Project Overview

The **E-Documents Management System** is a full-stack web application designed to digitize the process of requesting, reviewing, and delivering official tax documents issued by Algerian tax authorities. The platform bridges the gap between citizens and tax administration by providing a seamless, paperless workflow — from document request submission to official PDF generation and secure download.

The system supports two primary document types:

| Document | Description | Validity |
|---|---|---|
| **Certificate C20** | Official tax clearance and civil status certificate required for administrative procedures | 3 months |
| **Extrait de Rôle** | Tax roll extract confirming the taxpayer's fiscal obligations and payment status | 6 months |

Citizens submit requests through a guided multi-step form pre-filled with their fiscal data. The system automatically assigns each request to the appropriate least-loaded administrator. Upon review, the admin's decision triggers PDF generation in a background thread, stamped with the official seal, the processing agent's signature, and precise approval timestamps. The citizen is notified in real time and can download their document immediately.

Administrators additionally have access to a full statistical reports dashboard that lets them analyze request volumes, approval rates, and monthly trends — with one-click PDF and CSV export for official reporting.

> **Context:** This project was built as a demonstration of a complete government e-services platform, covering user authentication, role-based access control, document lifecycle management, automated PDF generation, statistical reporting, a robust notification system, and full multilingual support with Arabic RTL layout — all delivered through a polished, accessible user interface.

---

## ✨ Features

### Citizen Portal
- 🔐 **Secure Login** — NIF-based login for citizens, email-based for administrators
- 📊 **User Dashboard** — Real-time statistics on submitted, pending, approved, and rejected requests
- 📝 **Multi-Step Request Form** — Guided 3-step form with auto-fill from fiscal profile
- 📁 **My Documents** — Searchable, filterable document history with status tracking
- 📥 **Instant Download** — One-click PDF download for approved documents
- 👤 **Profile Management** — Editable contact info, avatar upload/removal
- 🔒 **Password Management** — Secure password change with current-password verification
- 🌙 **Dark / Light Mode** — System-wide theme toggle with local storage persistence
- 🔔 **Real-Time Notifications** — Status update alerts with unread badge and dropdown panel
- 🌐 **Multilingual Interface** — Full English, French, and Arabic support with dynamic language switching

### Admin Panel
- 🏢 **Service-Scoped Dashboard** — Each admin sees only requests for their assigned document type
- 📋 **Request Management** — Full table with search, filter, and compliance badges
- ✅ **Review & Decision** — Approve or reject requests with optional admin notes
- 🔏 **Immutable Decisions** — Approved/rejected requests are locked and cannot be altered
- 🧾 **Tax Records Viewer** — Inline breakdown of tax obligations and payments for Extrait de Rôle
- 📡 **Admin Notifications** — Instant alerts on new pending requests
- 🌐 **Localized Admin UI** — All management tables, modals, and status labels are fully translated

### Reports & Analytics
- 📈 **Statistical Reports Dashboard** — Dedicated reports page with KPI overview cards
- 🔍 **Dynamic Filtering** — Filter reports by date range and request status
- 📊 **Interactive Charts** — Requests-by-status pie chart and monthly evolution line chart (Chart.js)
- 📋 **Detailed Report Table** — Paginated table of all matching requests with user and NIF data
- 📄 **PDF Export** — Generate and download official-grade statistical reports as PDF (ReportLab)
- 📑 **CSV Export** — Export filtered report data as UTF-8 CSV for spreadsheet analysis
- 🔒 **Scope-Locked Reports** — Each admin's report data is automatically scoped to their assigned requests and document type

### System-Wide
- 🧩 **Component-Based UI** — Sidebar and topbar loaded dynamically for consistent layout
- 📡 **Dual-Mode API Layer** — `api.js` supports both mock (JSON) and live (Flask) modes with a single flag
- 🔄 **Background PDF Generation** — PDFs are generated in daemon threads immediately after approval
- 🗃️ **SQLite Persistence** — Runtime database stored in OS AppData, seeded from `users.json` on first boot
- 🛡️ **Role-Based Access Control** — Router guard enforces correct page access per role
- 🔀 **RTL Layout Engine** — Full right-to-left layout support for Arabic, including mirrored navigation, direction-aware tables, and RTL-compatible notifications

---

## 📸 Screenshots

> Screenshots are representative of the live interface. All UI states are implemented.

| Page | Description |
|---|---|
| **Login** | Split-panel design with hero copy and animated card |
| **User Dashboard** | Stats overview, recent requests, eligibility status, ready-to-download list |
| **Request Form** | 3-step wizard: document selection → pre-filled form → confirmation |
| **My Documents** | Filterable table with modal detail view and timeline tracker |
| **Admin Dashboard** | Pending requests queue with compliance badges |
| **Request Management** | Full admin table with modal decision panel and tax records |
| **Reports** | KPI cards, interactive charts, filter bar, detailed table, PDF/CSV export |
| **Profile** | Avatar, account info, eligibility, tax information, security settings |

### Multilingual UI Screenshots

| Language | Layout Direction | Notes |
|---|---|---|
| **🇬🇧 English** | LTR | Default language; all pages, labels, toasts, and notifications |
| **🇫🇷 French** | LTR | Full translation including validation messages and admin panel |
| **🇩🇿 Arabic** | RTL | Mirrored layout: sidebar, tables, modals, icons, and notifications all flip correctly |

---

## 🛠 Tech Stack

### Frontend

| Technology | Role |
|---|---|
| HTML5 | Page structure and semantic markup |
| CSS3 (custom design system) | Component styling, CSS variables, dark mode, RTL layout, animations |
| Vanilla JavaScript (ES2020) | DOM manipulation, routing, API calls, state management |
| Chart.js | Interactive charts for the reports dashboard (pie chart, line chart) |
| `i18n.js` (custom) | Lightweight internationalization engine — translation lookup, interpolation, language switching, RTL toggling |
| `en.js` / `fr.js` / `ar.js` | Language catalog files — flat key-path objects covering all UI strings |
| Font Awesome 6 | Icon library |
| Google Fonts (Roboto + Noto Sans Arabic) | Typography — Roboto for LTR languages, Noto Sans Arabic for Arabic text rendering |

### Backend

| Technology | Role |
|---|---|
| Python 3.10+ | Server runtime |
| Flask 3.x | REST API framework |
| Flask-CORS | Cross-origin resource sharing |
| SQLite3 | Relational database (via Python stdlib) |
| ReportLab | PDF generation engine — official documents and statistical report export |
| `csv` (Python stdlib) | CSV report generation and export |
| Werkzeug | Password hashing (scrypt/pbkdf2) |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     BROWSER CLIENT                      │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐   │
│  │  Login   │  │  User    │  │  Admin   │  │Shared  │   │
│  │  Page    │  │  Pages   │  │  Pages   │  │Comps   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘   │
│       └─────────────┴─────────────┴────────────┘        │
│                          │                              │
│                    ┌─────▼──────┐                       │
│                    │   api.js   │  ◄── USE_MOCK flag    │
│                    │ API Layer  │                       │
│                    └─────┬──────┘                       │
└──────────────────────────┼──────────────────────────────┘
                           │ HTTP / REST (JSON)
                    ┌──────▼──────┐
                    │   Flask     │
                    │  REST API   │
                    │  (app.py)   │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
     ┌──────▼──────┐  ┌────▼────┐  ┌──────▼───────┐
     │  Database   │  │  CSV    │  │  (uploads,   │
     │  (app.db)   |  │ Engine  │  │  documents)  │
     └─────────────┘  └─────────┘  └──────────────┘
```

### Key Design Decisions

- **Dual-mode API layer:** `api.js` contains both mock (pure JSON) and live (Flask) implementations for every endpoint. Switching between modes requires changing a single constant (`USE_MOCK`). This enabled full frontend development before the backend was ready.
- **Runtime database path:** The SQLite database is stored outside the project directory in the OS AppData folder (`%LOCALAPPDATA%/e-documents-system/app.db`). This prevents accidental overwrites during development and separates runtime state from source code.
- **Background PDF threads:** After an admin approves a request, PDF generation is offloaded to a daemon thread so the HTTP response returns immediately. The PDF is cached on disk and served on the next download request.
- **Compliance computed dynamically:** Tax compliance status is never stored directly. It is always recomputed from raw `taxRecords` data at display time, ensuring administrators always see the current financial picture.
- **Scope-locked reports:** Report data is automatically filtered by each admin's `assigned_to` field and service type. An admin can never view another admin's request data through the reports API.
- **Zero-dependency i18n engine:** Rather than importing an external localization library, the application ships a custom `i18n.js` module. It resolves translations by dot-path key (`"dashboard.goodMorning"`), supports named interpolation (`{count}`, `{name}`), applies `dir="rtl"` and `lang` attributes to `<html>` automatically on language change, and fires a `i18n:change` DOM event so every page module can re-render translated content reactively.

---

## 📁 Project Structure

```
e-documents-system/
│
├── index.html
│
├── assets/
│   ├── css/
│   │   ├── all.min.css
│   │   ├── main.css                    # Global design system, CSS variables, RTL overrides
│   │   ├── auth.css                    # Login page
│   │   ├── dashboard.css               # Shared dashboard layout (sidebar, topbar)
│   │   ├── documents.css               # My Documents page
│   │   ├── request.css                 # Request form page
│   │   ├── profile.css                 # User profile
│   │   ├── user-dashboard.css          # User dashboard
│   │   ├── admin-dashboard.css         # Admin dashboard
│   │   ├── admin-profile.css           # Admin profile
│   │   ├── requests-management.css     # Admin request management
│   │   ├── reports.css                 # Admin statistical reports
│   │   └── notification.css            # Notification dropdown
│   │
│   └── js/
│       ├── auth.js                     # Login form logic
│       ├── router.js                   # Route guard and logout utility
│       ├── theme.js                    # Dark/light mode toggle
│       ├── components.js               # Dynamic sidebar/topbar loader + i18n init
│       ├── api.js                      # Centralized API layer (mock + Flask modes)
│       │
│       ├── documents.js                # My Documents page logic
│       ├── request.js                  # Request form logic
│       ├── profile.js                  # User profile logic
│       ├── user-dashboard.js           # User dashboard logic
│       │
│       ├── admin-dashboard.js          # Admin dashboard logic
│       ├── admin-profile.js            # Admin profile logic
│       ├── requests-management.js      # Admin request management logic
│       ├── reports.js                  # Admin statistical reports logic
│       │
│       └── notification.js             # Notification system
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
│       ├── reports.html
│       └── profile.html
│
├── components/                         # Shared HTML fragments (loaded by components.js)
│   ├── user-sidebar.html
│   ├── admin-sidebar.html
│   └── topbar.html
│
├── backend/
│   ├── app.py                          # Flask REST API — all routes and business logic
│   ├── app.db                          # Legacy/seed database (runtime DB is in AppData)
│   │
│   ├── assets/
│   │   ├── signatures/                 # Admin signature PNG files (named by nationalId)
│   │   ├── line.png                    # Decorative line asset for Extrait de Rôle
│   │   └── stamp.png                   # Official institution stamp
│   │
│   ├── data/
│   │   └── users.json                  # Seed data (used only on first DB initialization)
│   │
│   ├── documents/                      # Generated PDF storage
│   │
│   └── uploads/                        # User avatar storage
│
├── js/
│   └── i18n.js                         # Internationalization engine
│
├── locales/                            # Language catalog files
│   ├── ar.js                           # Arabic translations (window.I18N_AR)
│   ├── en.js                           # English translations (window.I18N_EN)
│   └── fr.js                           # French translations (window.I18N_FR)
│
├── .gitignore
├── db-note.txt                         # Important note on runtime DB location
│
└── README.md
```

---

## 🗄 Database Design

The system uses SQLite with three normalized tables. The database is initialized from `users.json` on first startup and persisted at the runtime path.

### `users`

| Column | Type | Description |
|---|---|---|
| `auth_id` | TEXT (PK) | NIF (15 digits) for citizens, email for admins |
| `id_type` | TEXT | `"nif"` or `"email"` |
| `password` | TEXT | Werkzeug-hashed password (scrypt/pbkdf2) |
| `role` | TEXT | `"user"` or `"admin"` |
| `service` | TEXT | Admin only: `"C20"` or `"Extrait de rôle"` |
| `profile_json` | TEXT | JSON blob: name, DOB, address, phone, email, nationalId |
| `tax_info_json` | TEXT | JSON blob: tax regime, activities, records, financials |
| `eligibility_json` | TEXT | JSON blob: `identityVerified`, `addressConfirmed` |
| `sort_order` | INTEGER | Preserves seed order for deterministic display |

### `requests`

| Column | Type | Description |
|---|---|---|
| `request_id` | TEXT (PK) | e.g., `REQ-14-26-042` |
| `user_id` | TEXT (FK) | References `users.auth_id` |
| `document_type` | TEXT | `"C20"` or `"Extrait de rôle"` |
| `status` | TEXT | `"pending"`, `"approved"`, or `"rejected"` |
| `submitted_at` | TEXT | ISO-8601 timestamp |
| `note` | TEXT | Optional admin note visible to citizen |
| `assigned_to` | TEXT | Admin `auth_id` assigned to review this request |
| `processed_by` | TEXT | Admin `auth_id` who made the final decision |
| `approved_at` | TEXT | ISO-8601 timestamp of approval (null if not approved) |
| `year` | INTEGER | C20 only: fiscal year being certified |

### `notifications`

| Column | Type | Description |
|---|---|---|
| `id` | TEXT (PK) | e.g., `NOTIF-REQUEST-APPROVED-REQ-14-26-042` |
| `user_id` | TEXT (FK) | Recipient's `auth_id` |
| `type` | TEXT | `"request_approved"`, `"request_rejected"`, `"new_request"` |
| `message` | TEXT | Human-readable notification text |
| `request_id` | TEXT | Linked request (used for deep-link navigation) |
| `read` | INTEGER | `0` = unread, `1` = read |
| `deleted` | INTEGER | Soft-delete flag (`0` / `1`) |
| `created_at` | TEXT | ISO-8601 timestamp |

> **Important:** The database is soft-delete only. Notifications are never physically removed — `deleted = 1` excludes them from API responses. This preserves audit history.

---

## 🔐 Authentication & Security

### Login Flow

```
POST /api/auth/login
Body: { id: "123456789012345", password: "..." }

Response: {
  token: "token-123456789012345",
  userId: "...",
  role: "user" | "admin",
  userFirstName: "...",
  userLastName: "...",
  service: null | "C20" | "Extrait de rôle"
}
```

The token is stored in `sessionStorage` and sent as a `Bearer` token on every subsequent request. The backend extracts the user ID from the token (`token-{userId}` → `userId`) to identify the caller without a separate session store.

### Password Security

- All passwords are hashed using **Werkzeug's** `generate_password_hash` (scrypt algorithm by default, pbkdf2 as fallback).
- Legacy plain-text passwords (from `users.json` seed data) are **automatically upgraded** to hashed form on the user's first successful login.
- The `verify_password` function handles both hashed and plain-text fallback during the migration window.

### Route Guard (`router.js`)

Every dashboard page loads `router.js` synchronously. On execution it:
1. Checks `sessionStorage` for a valid `role`.
2. Verifies the current URL path matches the role's allowed folder (`/user/` or `/admin/`).
3. Redirects unauthenticated users to the login page.
4. Redirects authenticated users on the wrong role's pages to their own dashboard.

### Request Validation

- The backend verifies that the submitting user's NIF matches `taxInfo.taxIdentificationNumber` before accepting any request.
- Identity must be verified (`eligibility.identityVerified = true`) for request submission.
- Admin decisions are guarded: only the assigned admin (or a same-service admin for legacy unassigned requests) may update a request.
- **Approved and rejected decisions are permanently immutable** — the backend returns `400 Decision already finalized` if a change is attempted.

---

## 🔌 API Endpoints

All endpoints are prefixed with `/api`. Protected endpoints require `Authorization: Bearer {token}`.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | ❌ | Login with NIF or email + password |

### User

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/user/me` | ✅ | Get full profile, tax info, requests, notifications |
| `PATCH` | `/api/user/profile` | ✅ | Update editable fields (email, phone) |
| `POST` | `/api/user/password` | ✅ | Change password (requires current password) |
| `POST` | `/api/user/avatar` | ✅ | Upload avatar (base64 PNG/JPG, max 2MB) |
| `DELETE` | `/api/user/avatar` | ✅ | Remove avatar |

### Requests

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/requests` | ✅ (citizen) | Submit a new document request |
| `GET` | `/api/requests` | ✅ (admin) | Get all requests scoped to admin's service |
| `POST` | `/api/requests/{id}/decision` | ✅ (admin) | Approve or reject a pending request |
| `GET` | `/api/requests/{id}/document` | ✅ | Download the approved PDF |
| `POST` | `/api/requests/{id}/reassign` | ✅ (admin) | Reassign a request to another admin |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/dashboard` | ✅ (admin) | Get dashboard summary (requests + compliance data) |
| `PUT` | `/api/admin/profile` | ✅ (admin) | Update admin account info (email) |

### Reports

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/stats` | ✅ (admin) | Get KPI summary statistics for the reports dashboard |
| `POST` | `/api/admin/reports` | ✅ (admin) | Generate a filtered statistical report |
| `GET` | `/api/admin/reports/export?format=pdf\|csv` | ✅ (admin) | Export the current report as PDF or CSV |

### Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | ✅ | Get all non-deleted notifications |
| `POST` | `/api/notifications/{id}/read` | ✅ | Mark a notification as read |
| `POST` | `/api/notifications/read-all` | ✅ | Mark all notifications as read |
| `DELETE` | `/api/notifications/{id}` | ✅ | Soft-delete a notification |

### Static Assets

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/uploads/{filename}` | ❌ | Serve user avatar images |

#### Example: Submit a Request

```http
POST /api/requests
Authorization: Bearer token-123456789012345
Content-Type: application/json

{
  "requestId": "REQ-14-26-042",
  "submittedAt": "2026-05-14T10:30:00.000Z",
  "status": "pending",
  "userId": "123456789012345",
  "documentType": "C20",
  "year": 2025,
  "taxStatus": "À jour",
  "applicant": {
    "fullName": "Yacine Benali",
    "nationalId": "123456789",
    "dateOfBirth": "1977-10-24",
    "phone": "+213 555 01 23 45",
    "email": "yacine@email.com"
  },
  "business": {
    "mainActivityName": "Commerce de vêtements",
    "mainActivityCode": "4711",
    "businessAddress": "Zone d'activité, Bouira",
    "taxRegime": "Régime forfaitaire"
  }
}
```

#### Example: Admin Decision

```http
POST /api/requests/REQ-14-26-042/decision
Authorization: Bearer token-admin-c20@dashboard.com
Content-Type: application/json

{
  "status": "approved",
  "processedBy": "admin-c20@dashboard.com",
  "note": ""
}
```

#### Example: Generate a Filtered Report

```http
POST /api/admin/reports
Authorization: Bearer token-admin-c20@dashboard.com
Content-Type: application/json

{
  "dateFrom": "2026-01-01",
  "dateTo": "2026-05-15",
  "status": "approved"
}
```

---

## 📊 Admin Reports System

The Reports module provides administrators with a dedicated analytics dashboard for monitoring request volumes, approval rates, and trends over time. All report data is automatically scoped to the logged-in admin's assigned requests and document type, ensuring data isolation between administrators.

### Accessing Reports

Administrators navigate to the **Reports** page via the admin sidebar. The page initializes by calling `GET /api/admin/stats` for global KPI data, then immediately generates a full unfiltered report.

### KPI Cards

Six summary cards are displayed at the top of the page:

| KPI | Description |
|---|---|
| **Total Requests** | All requests assigned to this admin |
| **Approved** | Count and approval rate percentage |
| **Pending** | Requests still awaiting a decision |
| **Rejected** | Count and rejection rate percentage |
| **Total Users** | Number of registered citizen accounts in the system |
| **Documents Generated** | Count of approved (generated) documents |

### Dynamic Filtering

Administrators can narrow the report using the filter panel:

- **Date From / Date To** — Filter requests by submission date range.
- **Status** — Filter to show only pending, approved, or rejected requests.

Clicking **Generate Report** re-queries the backend with the selected filters and updates all KPI cards, charts, and the detailed table simultaneously. **Reset Filters** clears all filters and regenerates the full report.

### Interactive Charts

The charts section contains two visualizations rendered with **Chart.js**:

- **Requests by Status** — A pie chart showing the distribution of pending, approved, and rejected requests.
- **Monthly Evolution** — A line chart plotting request volume over time, grouped by submission month.

Both charts automatically re-render when the language or theme changes, respecting RTL direction and dark mode color tokens.

### Detailed Report Table

Below the charts, a paginated table lists every request matching the active filters, with the following columns:

| Column | Description |
|---|---|
| Request ID | Unique request identifier |
| User | Citizen's full name |
| NIF | Citizen's tax identification number |
| Status | Current request status with color badge |
| Submitted | Submission date |

### PDF Export

Clicking **Export PDF** sends a `GET /api/admin/reports/export?format=pdf` request (with active filter parameters) to the backend. Flask generates an official-grade A4 PDF report using **ReportLab**, which includes:

- Official header (République Algérienne Démocratique et Populaire)
- Report generation timestamp
- Active filter summary
- KPI summary block
- Full detailed request table with pagination across pages
- Page numbers

The PDF is returned as a binary download and saved to the user's downloads folder.

### CSV Export

Clicking **Export CSV** calls `GET /api/admin/reports/export?format=csv`. The backend generates a UTF-8 encoded CSV file (with BOM for Excel compatibility) containing all columns from the detailed table plus the processed-by and assigned-admin fields. Dates are formatted as `YYYY-MM-DD HH:MM` in the CSV output.

### Reports Module File Reference

| File | Layer | Responsibility |
|---|---|---|
| `pages/admin/reports.html` | Frontend | Page structure — KPI grid, filter form, chart canvases, table, export buttons |
| `assets/js/reports.js` | Frontend | Page logic — API calls, Chart.js rendering, filter state, PDF/CSV export triggers, i18n re-render |
| `assets/css/reports.css` | Frontend | Reports-specific styles — banner, filter form, chart cards, table, responsive layout |
| `backend/app.py` | Backend | `/api/admin/stats`, `/api/admin/reports`, `/api/admin/reports/export` routes; `build_report_data`, `generate_report_pdf`, `generate_report_csv` helpers |

---

## 🌐 Multilingual Support

The platform ships with a fully custom, zero-dependency internationalization (i18n) system covering every visible string in the application. Users and administrators can switch language at any time using the language selector in the topbar or on the login page; the entire UI re-renders instantly without a page reload.

### Supported Languages

| Language | Code | Direction | Font |
|---|---|---|---|
| 🇬🇧 English | `en` | LTR (left-to-right) | Roboto |
| 🇫🇷 French | `fr` | LTR (left-to-right) | Roboto |
| 🇩🇿 Arabic | `ar` | RTL (right-to-left) | Noto Sans Arabic |

The selected language is persisted in `localStorage` under the key `language` and restored automatically on every subsequent page load.

---

### Architecture: `i18n.js`

All localization logic lives in a single self-contained IIFE (`i18n.js`) that exposes two globals:

- **`t(key, params?)`** — the translation function, available everywhere in the application. Resolves a dot-path key (e.g., `"dashboard.goodMorning"`) against the active language catalog, falls back to English if the key is missing, and supports named parameter interpolation: `t("dashboard.pendingRequests", { count: 3, plural: "s" })`.
- **`window.i18n`** — the i18n controller object, providing `setLanguage()`, `getLanguage()`, `applyTranslations()`, and `initLanguageSwitcher()`.

When a language change is triggered:

```javascript
// i18n.js — setLanguage()
function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  applyTranslations(document);
  document.dispatchEvent(new CustomEvent("i18n:change", { detail: { language: lang } }));
}
```

Every page module listens for the `i18n:change` event and re-renders translated dynamic content:

```javascript
// example from user-dashboard.js
document.addEventListener("i18n:change", initDashboard);

// example from reports.js
document.addEventListener("i18n:change", rerenderForLocaleOrTheme);
```

---

### Translation Catalogs

Each language is defined in a standalone catalog file loaded as a `<script>` tag before `i18n.js` on every page:

```html
<script src="../../locales/en.js"></script>
<script src="../../locales/fr.js"></script>
<script src="../../locales/ar.js"></script>
<script src="../../js/i18n.js"></script>
```

The catalogs are plain JavaScript objects assigned to `window.I18N_EN`, `window.I18N_FR`, and `window.I18N_AR`. They share an identical key schema, making it straightforward to add new languages by providing a fourth catalog file.

**Coverage across all three languages:**

| Area | Keys Covered |
|---|---|
| Login page | Hero text, field labels, hints, validation messages, error banners |
| Navigation | All sidebar links, section labels, role labels |
| User dashboard | Greeting, stats, quick actions, eligibility labels, download section |
| Admin dashboard | Greeting, service badge, pending table, compliance badges |
| Request form | All 3 steps — document cards, form labels, declaration text, confirmation |
| My Documents | Filter bar, table headers, status badges, modal timeline, note section |
| Request management | Service banner, table, modal sections (applicant, compliance, tax records, status options) |
| Reports | KPI labels, filter form, chart titles, table headers, export buttons, toast messages |
| Profile pages | All field labels, security section, tax information, eligibility badges |
| Notifications | Dropdown title, empty state, time-ago strings, all notification messages |
| Toast messages | All success and error toasts across every feature |
| Validation | All field-level and form-level validation messages |
| Status badges | Approved, Pending, Rejected, Up to Date, Not Up to Date |

---

### HTML Attribute Conventions

Static text in HTML templates is marked with `data-i18n` attributes. `i18n.js` scans and updates them automatically on language change without any JavaScript in the template:

```html
<!-- Translated text content -->
<span data-i18n="dashboard.totalRequests">Total Requests</span>

<!-- Translated placeholder -->
<input data-i18n-placeholder="requests.searchDocuments" placeholder="Search..." />

<!-- Translated aria-label -->
<button data-i18n-aria-label="topbar.notifications" aria-label="Notifications">

<!-- Translated title attribute -->
<button data-i18n-title="profilePage.changePhoto" title="Change photo">
```

---

### RTL Layout Support (Arabic)

Switching to Arabic applies `dir="rtl"` to the `<html>` element and activates a comprehensive set of CSS overrides defined in `main.css`. These overrides handle every directional detail across the entire interface:

**Layout & Navigation**
- Sidebar active indicator bar (`::before` pseudo-element) flips from left edge to right edge
- Sidebar hover padding shift reverses from `padding-left` to `padding-right`
- All arrow icons (`fa-chevron-right`, `fa-arrow-right`) are mirrored using `transform: scaleX(-1)`
- Language switcher and theme toggle position on the login page shifts from `right` to `left`

**Forms & Inputs**
- Input icons reposition from left to right (`left: auto; right: 14px`)
- Input padding inverts (`padding-left ↔ padding-right`) to accommodate the repositioned icon
- Password toggle buttons and search clear buttons mirror to the opposite inline end
- Select dropdowns flip their chevron background position

**Tables & Data**
- All data tables (`docs-table`, `rm-table`, `admin-table`, `tax-records-table`, `reports-table`) apply `direction: rtl`
- Column headers and cell text align to `start` (right in RTL)
- Numeric and identifier fields (NIF, request IDs, emails, phone numbers, monetary values) are individually preserved in LTR using `direction: ltr; unicode-bidi: isolate` to ensure correct rendering of mixed-direction content

**Notifications**
- Notification dropdown origin flips from `top right` to `top left`
- Unread dot indicator repositions from `inset-inline-start` to `inset-inline-end`
- Notification items and action buttons reverse their flex direction

**Toast Messages**
- All toast elements shift from the right side of the viewport to the left

**Typography**
- When `lang="ar"` is active, the `<body>` font family switches to `"Noto Sans Arabic"` for correct Arabic glyph rendering

```css
/* main.css — RTL typography switch */
html[lang="ar"] body {
  font-family: "Noto Sans Arabic", var(--font-main);
}
```

---

### Adding a New Language

The i18n system is designed for straightforward extensibility:

1. Create a new catalog file, e.g., `locales/de.js`, exposing `window.I18N_DE` with the same key structure as `en.js`.
2. Add `"de"` to the `SUPPORTED_LANGUAGES` array in `i18n.js`.
3. Add the catalog `<script>` tag to every HTML page before `i18n.js`.
4. Add a `<option value="de">` entry to `renderLanguageOptions()` in `i18n.js`.
5. If the language is RTL, add it to the `RTL_LANGUAGES` array in `i18n.js`.

No changes to any page logic, CSS, or backend are required.

---

## 🚀 Installation

### Prerequisites

- Python 3.10 or higher
- pip (Python package manager)
- A modern web browser (Chrome, Firefox, Edge)
- A static file server or VS Code Live Server (for the frontend)

### Clone the Repository

```bash
git clone https://github.com/your-username/e-documents-system.git
cd e-documents-system
```

---

## 📦 Dependencies

Install all Python dependencies:

```bash
pip install flask flask-cors reportlab werkzeug
```

Or using a `requirements.txt`:

```bash
pip install -r requirements.txt
```

**`requirements.txt`:**

```
flask>=3.0.0
flask-cors>=4.0.0
reportlab>=4.0.0
werkzeug>=3.0.0
```

> **Note:** `sqlite3` and `csv` are included in Python's standard library and require no additional installation. Chart.js is loaded from CDN on the reports page and requires no npm install.

---

## ⚙️ Environment Variables

The application uses the following environment variables for path configuration. All have sensible defaults for local development.

| Variable | Default | Description |
|---|---|---|
| `EDOCS_RUNTIME_DIR` | `%LOCALAPPDATA%/e-documents-system` (Windows) / `~/e-documents-system` (Unix) | Root directory for all runtime data |
| `EDOCS_DB_PATH` | `{RUNTIME_DIR}/app.db` | SQLite database file path |
| `EDOCS_DOCUMENTS_DIR` | `{RUNTIME_DIR}/documents` | Generated PDF storage directory |
| `EDOCS_UPLOADS_DIR` | `{RUNTIME_DIR}/uploads` | User avatar storage directory |

You can override these in your shell before starting the server:

```bash
# Windows (PowerShell)
$env:EDOCS_RUNTIME_DIR = "C:\MyData\e-documents"
python app.py

# Linux / macOS
export EDOCS_RUNTIME_DIR="/home/user/e-documents"
python app.py
```

> **Important:** See `db-note.txt` for a full explanation of the runtime database path. When connecting with a DB browser (e.g., DB Browser for SQLite), always open the runtime `app.db`, not the project root copy.

---

## 🖥 Running the Backend

```bash
# Navigate to the project root
cd e-documents-system

# Start the Flask development server
python app.py
```

The API will be available at: **`http://127.0.0.1:5000`**

On first startup, the server will:
1. Create the runtime directory if it does not exist.
2. Initialize the SQLite database schema.
3. Seed the database from `users.json` if the `users` table is empty.
4. Start accepting requests.

```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

> **For production**, use a WSGI server such as Gunicorn:
> ```bash
> pip install gunicorn
> gunicorn -w 4 -b 0.0.0.0:5000 app:app
> ```

---

## 🌐 Running the Frontend

The frontend is a static multi-page application. It requires a local HTTP server to correctly resolve relative paths and fetch HTML component files.

### Option 1: VS Code Live Server (recommended)

1. Install the **Live Server** extension in VS Code.
2. Right-click `index.html` → **Open with Live Server**.
3. The browser will open at `http://127.0.0.1:5500`.

### Option 2: Python HTTP Server

```bash
cd e-documents-system
python -m http.server 5500
```

Then open: **`http://localhost:5500`**

### Switching Between Mock and Live Modes

Open `assets/js/api.js` and change the `USE_MOCK` constant:

```javascript
// Mock mode — reads from users.json, no backend needed
const USE_MOCK = true;

// Live mode — connects to Flask at API_BASE
const USE_MOCK = false;
const API_BASE = "http://127.0.0.1:5000";
```

> **Note:** The reports feature (`/api/admin/stats`, `/api/admin/reports`, `/api/admin/reports/export`) requires Flask to be running and `USE_MOCK` set to `false`. These endpoints are not available in mock mode.

---

## 👤 User Workflow

```
┌───────────────────────────────────────────────────────────┐
│  CITIZEN WORKFLOW                                         │
│                                                           │
│  1. Login          →  Enter NIF + password                │
│  2. Dashboard      →  View stats and quick actions        │
│  3. New Request    →  Select document type                │
│                    →  Review pre-filled form              │
│                    →  Accept declaration + Submit         │
│  4. Notification   →  Receive status update alert         │
│  5. My Documents   →  View decision and admin note        │
│  6. Download       →  Download signed official PDF        │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  ADMIN WORKFLOW                                           │
│                                                           │
│  1. Login          →  Enter admin email + password        │
│  2. Dashboard      →  View pending queue (service-scoped) │
│  3. Review         →  Open request modal                  │
│                    →  Check tax compliance + records      │
│  4. Decision       →  Select Approved / Rejected          │
│                    →  Add optional note                   │
│                    →  Save (decision becomes immutable)   │
│  5. Background     →  PDF generated in daemon thread      │
│  6. Notification   →  Citizen receives status alert       │
│  7. Reports        →  Navigate to Reports page            │
│                    →  Apply date/status filters           │
│                    →  Review KPIs, charts, and table      │
│                    →  Export PDF or CSV as needed         │
└───────────────────────────────────────────────────────────┘
```

---

## 🧾 PDF Generation Engine

PDF generation is handled by **ReportLab** and is implemented for three document types: the Certificate C20, the Extrait de Rôle, and the statistical report export.

### Certificate C20

The C20 PDF is generated by `generate_c20()` and includes:

- Official letterhead: République Algérienne Démocratique et Populaire, Ministère des Finances, Direction Générale des Impôts
- NIF rendered digit-by-digit in individual bordered boxes
- Taxpayer full name and address
- Declared financial data for the requested fiscal year (chiffre d'affaires and bénéfice)
- Approval location and timestamp in Algeria local time (UTC+1)
- Processing agent signature image (loaded from `assets/signatures/{nationalId}.png`)
- Official institution stamp (loaded from `assets/stamp.png`) rotated at −8°

### Extrait de Rôle

The Extrait de Rôle PDF is generated by `generate_extrait_role()` and includes:

- Official header: CDI Bouira, Direction Générale des Impôts
- Taxpayer identification block (NIF, name, address, activity)
- Full tax records table: type, year, principal, penalties, paid amounts, remaining balance
- Totals row
- Legal disclaimer (N.B. section)
- Approval timestamp in Algeria local time
- Processing agent name and signature image
- Official stamp with rotation

### Statistical Report PDF

The report PDF is generated by `generate_report_pdf()` and includes:

- Official header (République Algérienne Démocratique et Populaire, Ministère des Finances)
- Report generation timestamp and active filter summary
- KPI summary block (totals, rates)
- Full detailed request table with automatic page breaks and repeated headers
- Page numbers

### Background Generation

After an admin approves a request, PDF generation is immediately offloaded:

```python
threading.Thread(
    target=_generate_pdf_background,
    args=(user_snapshot, req_snapshot, request_id, admin_snapshot),
    daemon=True
).start()
```

The HTTP response returns immediately. If the PDF does not exist when a citizen requests download, it is generated on demand as a fallback.

### Signature and Stamp Assets

Place the following files in the `assets/` directory:

| File | Description |
|---|---|
| `assets/stamp.png` | Official institution stamp (transparent background recommended) |
| `assets/signatures/{nationalId}.png` | One PNG per admin, named by their national ID |
| `assets/line.png` | Decorative underline element used in Extrait de Rôle |

---

## 🔔 Notification System

Notifications are generated server-side on key events and consumed by `notification.js` on the frontend.

### Generation Events

| Event | Recipient | Type |
|---|---|---|
| New request submitted | Assigned admin | `new_request` |
| Request approved | Submitting citizen | `request_approved` |
| Request rejected | Submitting citizen | `request_rejected` |

> **Localized messages:** Notification messages are stored in English on the server (e.g., `"Your C20 request has been approved."`). On the frontend, `notification.js` parses the document type and any admin note out of the raw message string, then reconstructs it using the active language catalog key (e.g., `notifications.requestApproved`). This means switching language updates existing notification text without any server round-trip.

### Frontend Behavior

`notification.js` runs in an IIFE and is initialized by `components.js` after the topbar mounts. It:

1. Fetches all non-deleted notifications via `GET /api/notifications`.
2. Renders an unread badge on the bell icon.
3. Opens a dropdown panel on bell click showing a sorted list (unread first).
4. Supports per-item read marking, bulk mark-all-read, and soft deletion.
5. On notification click, navigates to the relevant page and opens the request modal directly using a polling mechanism (`_openModalWhenReady`) that waits for `openModal()` to become available rather than relying on a fixed timeout.
6. Re-renders all notification messages and time strings reactively on `i18n:change`, so switching language updates the open notification panel instantly.

### Deep-Link Navigation

When a notification click triggers a page change, the target request ID is stored in `sessionStorage` under `openRequestId`. On the destination page, `notification.js` reads and clears this key, then polls until the page's `openModal()` function is ready before invoking it.

---

## 🤖 Admin Assignment System

When a citizen submits a request, the backend automatically assigns it to the most available administrator for that document type.

### Algorithm

```python
def pick_admin_for_service(users, service):
    eligible = [
        u for u in users
        if u.get("role") == "admin" and u.get("service") == service
    ]

    def pending_count(admin):
        # Count currently pending requests assigned to this admin
        ...

    min_load = min(pending_count(a) for a in eligible)
    least_loaded = [a for a in eligible if pending_count(a) == min_load]
    return random.choice(least_loaded)  # Random tie-breaking for fairness
```

- All admins of the required service type are considered.
- The admin with the fewest currently pending assigned requests is selected.
- If multiple admins are tied for the minimum load, one is selected at random to distribute work fairly.
- The assigned admin's ID is stored in `requests.assigned_to`.
- Only the assigned admin sees the request in their queue. Legacy requests without an `assignedTo` value fall back to service-level matching for backward compatibility.

---

## 🧪 Demo Accounts

### Citizen Accounts

| Name | NIF (login) | Password | Tax Status |
|---|---|---|---|
| Yacine Benali | `123456789012345` | `yacine1234` | ✅ Up to date |
| Amine Haddad | `987654321098765` | `amine1234` | ⚠️ Partial arrears (2024–2025) |
| Sidali Sait | `555444333222111` | `sidali2024` | ❌ Significant arrears |

### Administrator Accounts

| Name | Email (login) | Password | Service |
|---|---|---|---|
| Admin C20 | `admin-c20@dashboard.com` | `admin1234` | Certificate C20 |
| Brahim Djelid | `brahimDj@dashboard.com` | `admin1234` | Extrait de Rôle |
| Mekid Raouf | `mekid.raouf@dashboard.com` | `admin1234` | Extrait de Rôle |

> **Note:** Passwords in `users.json` are plain text and will be automatically hashed by the backend on first login. After migration, the original plain-text values will no longer work in direct database queries.

---

## 🔭 Future Improvements

- [ ] **JWT-based authentication** — Replace the simple `token-{userId}` scheme with signed JWTs including expiry and refresh token rotation.
- [ ] **Email notifications** — Send transactional emails via SMTP (Flask-Mail or SendGrid) in addition to in-app notifications.
- [ ] **Request cancellation** — Allow citizens to cancel pending requests before admin review.
- [ ] **Multi-document support** — Extend the document type registry with additional certificate types (Déclaration d'Existence, Attestation de non-redevance, etc.).
- [ ] **Admin user management** — A super-admin panel for creating, deactivating, and reassigning admin accounts.
- [ ] **Audit log** — Append-only log of all decisions with timestamps and actor identities.
- [ ] **File-based document templates** — Replace hardcoded ReportLab drawing calls with editable template files (Jinja2 + WeasyPrint or similar).
- [ ] **Search across all users (super-admin)** — Cross-user request search for oversight roles.
- [ ] **PostgreSQL migration** — Replace SQLite with PostgreSQL for multi-instance deployments.
- [ ] **Rate limiting** — Protect login and submission endpoints from brute force and abuse.
- [ ] **Reports in mock mode** — Provide a mock implementation of the reports endpoints so the reports dashboard is usable without a running Flask server.
- [ ] **Additional language support** — The i18n architecture is designed for easy extensibility; adding a fourth language (e.g., Tamazight/Berber) requires only a new catalog file and a one-line addition to `SUPPORTED_LANGUAGES` in `i18n.js`.
- [ ] **Server-side locale for notifications** — Store notification messages as template keys rather than English strings, enabling purely server-driven localization without client-side message parsing.
- [ ] **Locale-aware PDF generation** — Generate C20 and Extrait de Rôle PDFs in the citizen's preferred language rather than the current fixed French template.
- [ ] **E2E tests** — Playwright or Cypress test suite covering the full citizen and admin workflows in all three languages, including RTL layout assertions.

---

## ⚠️ Known Limitations

- **Single-server only:** SQLite does not support concurrent write access from multiple processes. The application must run on a single server instance. Use PostgreSQL for horizontal scaling.
- **Token scheme:** The current `token-{userId}` scheme does not expire and contains the user ID in plain text. It is suitable for development and demonstration but should be replaced with signed JWTs before any production deployment.
- **PDF asset dependency:** Signature images and the stamp file must be placed manually in `assets/`. If these files are absent, PDFs are generated without signatures or stamps but do not fail.
- **No HTTPS enforcement:** The Flask dev server does not enforce HTTPS. A reverse proxy (nginx, Caddy) with TLS termination is required for production.
- **Avatar storage:** User avatars are stored as files on the local filesystem. This is not compatible with horizontally scaled or containerized deployments without a shared volume or object storage (e.g., S3).
- **Reports require Flask:** The reports, statistics, and export endpoints are not implemented in mock mode. The reports dashboard is only functional with `USE_MOCK = false` and a running Flask server.
- **Seed data format:** Changing the structure of `users.json` after the database has been initialized requires either manually migrating the SQLite database or deleting the runtime `app.db` to trigger a re-seed.

---

## 👥 Contributors

| Role | Contributor |
|---|---|
| Full-Stack Development | Project Author |
| System Design | Project Author |
| PDF Generation Engine | Project Author |
| Reports & Analytics System | Project Author |
| UI/UX Design | Project Author |
| Internationalization & RTL System | Project Author |

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgements

- **[Flask](https://flask.palletsprojects.com/)** — Lightweight and flexible Python web framework.
- **[ReportLab](https://www.reportlab.com/)** — The industry-standard PDF generation library for Python, used for both official document PDFs and statistical report exports.
- **[Chart.js](https://www.chartjs.org/)** — Simple yet flexible JavaScript charting library, powering the reports dashboard visualizations.
- **[Werkzeug](https://werkzeug.palletsprojects.com/)** — Comprehensive WSGI utility library providing the security primitives used for password hashing.
- **[Font Awesome](https://fontawesome.com/)** — The icon library powering the entire UI icon set.
- **[Google Fonts](https://fonts.google.com/)** — Roboto typeface for LTR content and Noto Sans Arabic for correct Arabic glyph rendering in RTL mode.
- **[DB Browser for SQLite](https://sqlitebrowser.org/)** — Recommended tool for inspecting and managing the runtime database during development.

---

<div align="center">

Built with care for the purpose of digitizing government document services.

**[⬆ Back to top](#-e-documents-management-system)**

</div>