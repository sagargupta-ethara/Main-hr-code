# HR Dashboard - Product Requirements Document

## Original Problem Statement
Build a complete vendor hiring dashboard (HR Dashboard) with dark premium theme, same-page modal popups for data drill-downs, and sections: Home, Job Openings, Candidates, Interviews, Contacts, and Analysis. Needs accurate stage-wise counting, file upload, and Google Sheets sync.

## Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- **Backend**: FastAPI + Motor (async MongoDB) + Pandas + PyMuPDF + python-docx
- **Database**: MongoDB
- **Auth**: JWT (httpOnly cookies)

## Implemented Features (Feb 14, 2026)
- [x] JWT auth with profile icon dropdown (no Upload Data/logout in top bar)
- [x] Dark premium theme across all pages
- [x] KPI cards with same-page modal popups (including Total Openings)
- [x] Card order: Row 1 (Active/Shortlisted/Rejected), Row 2 (Openings/Candidates/Interviews/Selected)
- [x] All Candidates scrollable table with sticky header + search
- [x] Sync Sheets + Upload Data buttons on dashboard
- [x] Date filters (7d/14d/30d/90d/All + From/To)
- [x] Division-grouped Job Openings with collapsible sections
- [x] JD Upload per role with PDF/DOCX/TXT text extraction + summary display
- [x] Clickable Analysis metrics + drop-offs with popup detail
- [x] Cleaner chart colors (soft blue/violet/emerald/red)
- [x] Vendor-to-role mapping with progress bars
- [x] Interview slot normalization + feedback (L1 Feedback or Remark)
- [x] Contacts page with search, type filters, detail modals
- [x] Background scroll lock on all modal popups
- [x] Google Sheets 1-click sync (combined endpoint)
- [x] Excel upload for Candidates + Open Positions
- [x] Export to Excel
- [x] Fixed "Selected" logic for cleared/selected/cleared interview rounds

## Key API Endpoints
- POST /api/auth/login, GET /api/auth/me
- POST /api/upload-excel, GET /api/export/candidates
- GET /api/analytics/kpis, /kpis-filtered, /pipeline, /vendors, /roles, /interviews
- GET /api/candidates, /contacts, /openings
- POST /api/sync-all, GET /api/sync/status
- POST /api/openings/jd, GET /api/openings/jd

## DB Collections
- users, candidates, openings, settings, job_descriptions

## Backlog
- P3: Refactor server.py into routes/models
- P3: Scheduled auto-sync for Google Sheets
