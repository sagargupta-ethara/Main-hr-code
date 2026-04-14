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
- Google Sheets 1-click Sync button (combined sync of candidates + openings)
- Total Openings card navigates to Job Openings tab
- Other KPI cards open same-page modal popups
- Pipeline by Stage chart + Vendor Contributions pie chart

### Job Openings
- Cards showing role details (division, positions, nominations, active, selected)
- **Vendor-to-role mapping**: Each card shows vendor tags with candidate counts
- Upload Data button for Excel import
- Click card opens detail modal with vendor contribution progress bars, key tasks, objectives, KRAs, salary band

### Candidates
- Filterable table (vendor, role, stage dropdowns)
- Export to Excel button
- Click row opens detail sheet with contact info, experience, interview history, remarks

### Interviews
- Table showing all interviews with candidate, role, vendor, level, normalized slot, interviewer, status
- Search bar and L1/L2/All level filter buttons
- **Interview slot normalization**: Handles various date formats from Excel
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

### Google Sheets Sync
- Combined /api/sync-all endpoint syncs both candidates and openings
- Last sync timestamp tracking via /api/sync/status
- Clear error messages for private sheets

## What's Been Implemented
- [x] Full React + FastAPI + MongoDB scaffolding with JWT auth
- [x] Dark Premium Theme across all tabs
- [x] Excel upload for both Candidates and Open Positions sheets
- [x] KPI cards with same-page modal popups
- [x] Date filters (7d/14d/30d/90d/All + From/To date pickers) on Home
- [x] Search bar on Home page
- [x] Google Sheets 1-click Sync (working - sheets are public)
- [x] Combined sync endpoint with last-sync tracking
- [x] Total Openings card navigates to Job Openings tab
- [x] Analysis page with founder-focused metrics
- [x] Contacts page with extracted contacts, search, type filters
- [x] Vendor-to-role mapping on Job Openings cards and modals
- [x] Interview slot normalization
- [x] Interviews page search and L1/L2 filter
- [x] Fixed "Selected" logic for "cleared"/"cleared interview rounds"
- [x] Fixed vendor analytics to exclude null vendors

## Backlog
- P3: File cleanup/refactoring (split server.py into routes/models)

## Key API Endpoints
- POST /api/auth/login, GET /api/auth/me
- POST /api/upload-excel
- GET /api/analytics/kpis, GET /api/analytics/kpis-filtered
- GET /api/analytics/pipeline, /api/analytics/vendors, /api/analytics/roles, /api/analytics/interviews
- GET /api/candidates, /api/contacts, /api/openings
- GET /api/export/candidates
- POST /api/sync-all, GET /api/sync/status

## DB Schema
- `users`: {email, password_hash, role, name, created_at}
- `candidates`: {id, s_no, role, submission_date, candidate_name, contact_number, email, resume_link, resume_status, hr_spoc, work_experience, rel_experience, ctc, ectc, notice_period, current_location, job_location, assessment_round, interview_slot_l1, interview_status_l1, interviewer_name_l1, interview_slot_l2, interview_status_l2, interviewer_name_l2, final_status, offer_released, joining_date, remarks, vendor, current_stage}
- `openings`: {id, s_no, division, team_role, key_tasks, core_objectives, key_kras, salary_band, min_exp, no_of_open_positions}
- `settings`: {key, timestamp, candidates, openings} (for sync tracking)
