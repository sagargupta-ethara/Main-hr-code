# HR Dashboard - Product Requirements Document

## Original Problem Statement
Build a complete vendor hiring dashboard (HR Dashboard) with dark premium theme, same-page modal popups, and sections: Home, Job Openings, Candidates, Interviews, Contacts, Analysis.

## Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- **Backend**: FastAPI + Motor (async MongoDB) + Pandas + PyMuPDF + python-docx
- **Database**: MongoDB
- **Auth**: JWT (httpOnly cookies)

## Implemented Features (Feb 14, 2026)

### Core
- [x] JWT auth, dark premium theme, Excel upload, Google Sheets sync
- [x] Profile icon dropdown, scroll-locked modals, sticky table headers

### Home Dashboard
- [x] Vendor filter dropdown — updates ALL KPIs, charts, candidates for selected vendor
- [x] Date filters (7d/14d/30d/90d/All + From/To) — combinable with vendor filter
- [x] KPI cards with same-page popups (Active/Shortlisted/Rejected → Openings/Candidates/Interviews/Selected)
- [x] All Candidates scrollable table with search
- [x] Sync Sheets + Upload Data buttons

### Job Openings
- [x] Division-grouped with collapsible sections
- [x] Role detail modal with JD Upload (PDF/DOCX/TXT extraction)
- [x] **Nominated Members** list per role with name, vendor, stage, experience

### Analysis
- [x] Clickable conversion metrics + drop-off with popup insights
- [x] **Vendor Performance drilldown** — click vendor row to see detailed popup with:
  - Summary metrics, stage breakdown, roles contributed
  - Full member list table with name, role, stage, experience
- [x] Cleaner chart colors (soft blue/violet/emerald/red)

### Interviews
- [x] Search + L1/L2 filter, slot normalization
- [x] Feedback: L1 Feedback if available, otherwise Remark

### Contacts & Candidates
- [x] Contacts extracted from data with search/type filters
- [x] Candidates filterable table with export

## Key API Endpoints
- POST /api/auth/login, GET /api/auth/me
- GET /api/analytics/kpis-filtered (?from_date, ?to_date, ?vendor)
- GET /api/analytics/pipeline (?vendor)
- GET /api/analytics/vendors, /api/analytics/vendor-list, /api/analytics/vendor-detail
- GET /api/analytics/roles, /api/analytics/interviews
- GET /api/candidates, /api/contacts, /api/openings
- GET /api/openings/nominees (?role_name)
- POST /api/openings/jd, GET /api/openings/jd
- POST /api/sync-all, /api/upload-excel, GET /api/export/candidates

## DB Collections
- users, candidates, openings, settings, job_descriptions

## Backlog
- P3: Refactor server.py into routes/models
- P3: Scheduled auto-sync
