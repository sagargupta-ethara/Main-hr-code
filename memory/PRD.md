# HR Dashboard - Product Requirements Document

## Original Problem Statement
Build a complete vendor hiring dashboard (HR Dashboard) with dark premium theme, same-page modal popups, and accurate sheet-driven data counting.

## Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- **Backend**: FastAPI + Motor (async MongoDB) + Pandas + PyMuPDF + python-docx
- **Database**: MongoDB
- **Auth**: JWT (httpOnly cookies)

## Data Counting Logic (Sheet-Driven)
- **Active Candidates**: NOT (resume_status~reject OR final_status~reject)
- **Shortlisted**: resume_status contains "shortlisted" 
- **Rejected**: resume_status~reject OR final_status~reject (any phase)
- **Interview Scheduled**: interview_slot_l1 or l2 is present (non-null, non-empty)
- **Selected**: final_status contains "selected"
- **HR SPOC**: Normalized ("Pujita" → "Pujita Bhuyan")

## Implemented Features
- [x] Sheet-driven KPI counts using direct field queries (not current_stage)
- [x] Vendor filter on Home — updates ALL KPIs, charts, candidates, and modal popups
- [x] Active Candidates popup grouped by Profile Submission Date
- [x] Shortlisted popup = resume_status contains shortlist only
- [x] Rejected popup = rejected at any phase
- [x] Interview popup shows L1/L2 status labels
- [x] HR SPOC normalized to full names
- [x] Division-grouped Job Openings with JD Upload + Nominees
- [x] Analysis vendor drilldown with member list
- [x] Clickable analysis metrics with popup insights
- [x] Date filters + vendor filter combinable
- [x] Google Sheets 1-click sync
- [x] Background scroll lock, sticky headers, profile dropdown

## Key API Endpoints
- GET /api/analytics/kpis, /api/analytics/kpis-filtered (?from_date, ?to_date, ?vendor)
- GET /api/analytics/pipeline (?vendor), /api/analytics/vendors, /api/analytics/vendor-list
- GET /api/analytics/vendor-detail, /api/analytics/roles, /api/analytics/interviews
- GET /api/candidates, /api/contacts, /api/openings, /api/openings/nominees
- POST /api/openings/jd, /api/sync-all, /api/upload-excel

## DB Collections
- users, candidates, openings, settings, job_descriptions
