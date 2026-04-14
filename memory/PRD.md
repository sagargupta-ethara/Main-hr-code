# HR Dashboard - Product Requirements Document

## Original Problem Statement
Build a complete vendor hiring dashboard (HR Dashboard) from scratch using a vendor hiring sheet as the single source of truth. Features require a dark premium theme (deep navy background, cyan/teal highlights), same-page modal popups for data drill-downs, and specific navigation sections: Home, Job Openings, Candidates, Interviews, Contacts, and Analysis. Needs accurate stage-wise counting and the ability to update data via file upload and 1-click Google Sheets sync.

## Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- **Backend**: FastAPI + Motor (async MongoDB) + Pandas
- **Database**: MongoDB
- **Auth**: JWT (httpOnly cookies)

## Core Pages & Features

### Top Bar
- Compact nav with logo, page links, profile icon
- Profile icon opens dropdown with user name/email + Logout
- No Upload Data button in top bar (moved to dashboard)

### Home (Dashboard Overview)
- Row 1: Active Candidates, Shortlisted, Rejected
- Row 2: Total Openings, Total Candidates, Interviews Scheduled, Selected
- All cards clickable with same-page popup modals (including Total Openings)
- Sync Sheets + Upload Data buttons in header
- Date filters: Quick filter buttons (7d/14d/30d/90d/All) + From/To date pickers
- All Candidates scrollable table with search
- Pipeline & Vendor charts

### Job Openings
- Grouped hierarchically by Division with collapsible sections
- Role cards with positions, nominations, active, selected, vendor tags
- Sync Sheet + Upload Data buttons
- Modal with vendor contributions, key tasks, JD Upload, JD Summary

### Candidates
- Filterable table (vendor, role, stage) + Export to Excel
- Detail sheet with contact info, experience, interview history

### Interviews
- Table with search + L1/L2/All filter
- Normalized interview slots
- Detail modal: shows L1 Feedback if available, otherwise Remark

### Contacts
- Extracted from hiring data (HR SPOCs, Vendors, Interviewers, Candidates)
- Type filters + Search
- Detail modal

### Analysis (Founder-Focused)
- Clickable conversion metrics with popup details: Shortlist Rate, Interview Rate, Selection Rate, Offer Rate, Overall Conversion
- Clickable stage drop-off analysis
- Vendor performance table with detail modals
- Charts: Vendor Breakdown (soft blue/violet/emerald), Pipeline Stages (color-coded)

## Implemented Features (Feb 14, 2026)
- [x] Full scaffolding with JWT auth + dark premium theme
- [x] Excel upload for Candidates + Open Positions
- [x] Google Sheets 1-click sync (combined endpoint)
- [x] Profile icon dropdown (replaced admin info/logout in top bar)
- [x] Upload Data moved to dashboard beside Sync
- [x] Reordered KPI cards (Active/Shortlisted/Rejected first)
- [x] Total Openings opens popup (not redirect)
- [x] All Candidates scrollable table
- [x] Division-grouped Job Openings with collapsible sections
- [x] JD Upload per role with summary display
- [x] Clickable Analysis metrics + drop-offs with popup detail
- [x] Cleaner chart colors
- [x] Interview feedback: L1 Feedback or Remark
- [x] Vendor-to-role mapping
- [x] Interview slot normalization
- [x] Fixed "Selected" logic for cleared/selected/cleared interview rounds
- [x] Contacts page with search, type filters, detail modals
- [x] Date filters (7d/14d/30d/90d/All + From/To)

## Backlog
- P3: Refactor server.py into routes/models
- P3: Scheduled auto-sync for Google Sheets

## Key API Endpoints
- POST /api/auth/login, GET /api/auth/me
- POST /api/upload-excel
- GET /api/analytics/kpis, /api/analytics/kpis-filtered
- GET /api/analytics/pipeline, /api/analytics/vendors, /api/analytics/roles, /api/analytics/interviews
- GET /api/candidates, /api/contacts, /api/openings
- GET /api/export/candidates
- POST /api/sync-all, GET /api/sync/status
- POST /api/openings/jd, GET /api/openings/jd

## DB Collections
- `users`, `candidates`, `openings`, `settings`, `job_descriptions`
