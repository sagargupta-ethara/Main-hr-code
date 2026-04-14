# HR Dashboard - Product Requirements Document

## Original Problem Statement
Build a complete vendor hiring dashboard (HR Dashboard) from scratch using a vendor hiring sheet as the single source of truth. Features require a dark premium theme (deep navy background, cyan/teal highlights), same-page modal popups for data drill-downs, and specific navigation sections: Home, Job Openings, Candidates, Interviews, Contacts, and Analysis. Needs accurate stage-wise counting and the ability to update data via file upload and 1-click Google Sheets sync.

## Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- **Backend**: FastAPI + Motor (async MongoDB) + Pandas
- **Database**: MongoDB
- **Auth**: JWT (httpOnly cookies)

## Core Pages & Features

### Home (Dashboard Overview)
- KPI cards: Total Openings, Total Candidates, Interviews Scheduled, Selected, Active, Shortlisted, Rejected
- Date filters: Quick filter buttons (7d, 14d, 30d, 90d, All) + From/To date pickers
- Search bar for recent candidates table
- Google Sheets Sync button (1-click)
- Total Openings card navigates to Job Openings tab
- Other KPI cards open same-page modal popups
- Pipeline by Stage chart + Vendor Contributions pie chart

### Job Openings
- Cards showing role details (division, positions, nominations, active, selected)
- Upload Data button for Excel import
- Click card opens detail modal with key tasks, objectives, KRAs, salary band

### Candidates
- Filterable table (vendor, role, stage dropdowns)
- Export to Excel button
- Click row opens detail sheet with contact info, experience, interview history, remarks

### Interviews
- Table showing all interviews with candidate, role, vendor, level, slot, interviewer, status
- Click row opens detail modal with feedback section

### Contacts
- Extracted from hiring data: HR SPOCs, Vendors, Interviewers, Candidates with contact info
- Type summary cards + type filter buttons
- Search by name/vendor/email
- Click contact opens detail modal

### Analysis (Founder-Focused)
- Conversion metrics: Shortlist Rate, Interview Rate, Selection Rate, Offer Rate, Overall Conversion
- Stage drop-off analysis with progress bars
- Vendor performance table with Shortlist% and Selection%
- Vendor detail modal on click
- Charts: Vendor Contributions, Pipeline Stage Distribution

## What's Been Implemented (Feb 14, 2026)
- [x] Full React + FastAPI + MongoDB scaffolding with JWT auth
- [x] Dark Premium Theme across all tabs (slate-950 bg, cyan/teal highlights)
- [x] Excel upload for both Candidates and Open Positions sheets
- [x] KPI cards with same-page modal popups
- [x] Date filters (7d/14d/30d/90d/All + From/To date pickers) on Home
- [x] Search bar on Home page
- [x] Google Sheets Sync button (requires public sheets)
- [x] Total Openings card navigates to Job Openings tab
- [x] Analysis page with founder-focused metrics (shortlist rate, conversion, stage drop-off)
- [x] Contacts page with extracted contacts, search, type filters, detail modals
- [x] Fixed "Selected" logic in determine_current_stage (handles cleared/selected/cleared interview rounds)
- [x] Fixed vendor analytics to exclude null vendors
- [x] Backend contacts endpoint (/api/contacts)
- [x] Backend date-filtered KPIs endpoint (/api/analytics/kpis-filtered)
- [x] Comprehensive test suite (backend + frontend: 100% pass)

## Pending / Backlog
- P1: Google Sheets sync - user needs to make sheets publicly accessible (View-only)
- P1: Vendor-to-role mapping display in Job Openings tab
- P2: Interview slot normalization (display formatting)
- P2: Additional data upload to populate empty fields (contacts, interview slots)
- P3: File cleanup/refactoring (split server.py into routes/models)

## Key API Endpoints
- POST /api/auth/login
- GET /api/auth/me
- POST /api/upload-excel
- GET /api/analytics/kpis
- GET /api/analytics/kpis-filtered?from_date=&to_date=
- GET /api/analytics/pipeline
- GET /api/analytics/vendors
- GET /api/analytics/roles
- GET /api/analytics/interviews
- GET /api/candidates
- GET /api/contacts
- GET /api/openings
- GET /api/export/candidates
- POST /api/sync-google-sheets
- POST /api/sync-google-openings

## DB Schema
- `users`: {email, password_hash, role, name, created_at}
- `candidates`: {id, s_no, role, submission_date, candidate_name, contact_number, email, resume_link, resume_status, hr_spoc, work_experience, rel_experience, ctc, ectc, notice_period, current_location, job_location, assessment_round, interview_slot_l1, interview_status_l1, interviewer_name_l1, interview_slot_l2, interview_status_l2, interviewer_name_l2, final_status, offer_released, joining_date, remarks, vendor, current_stage}
- `openings`: {id, s_no, division, team_role, key_tasks, core_objectives, key_kras, salary_band, min_exp, no_of_open_positions}
