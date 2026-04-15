# HR Dashboard - Product Requirements Document

## Data Counting Logic (Sheet-Driven, Exact)
- **Active**: NOT (resume_status~reject OR final_status~reject)
- **Shortlisted**: resume_status~shortlist AND NOT final_status~reject
- **Rejected**: resume_status~reject OR final_status~reject (any phase)
- **Interview Scheduled**: interview_slot present AND date is today/future
- **Selected**: final_status~selected
- **Pipeline "Submitted"**: replaces "New" when submission_date is in the past

## Implemented Features
- [x] Sheet-driven KPI counts with exact field queries
- [x] Vendor filter propagates to ALL modals
- [x] Active popup grouped by submission date
- [x] JD Upload with clickable preview link (PDF/DOCX/TXT)
- [x] Interview feedback: L1 Feedback or Remark
- [x] Stage Drop-off with candidate list drilldown
- [x] Division-grouped Job Openings with nominees
- [x] Analysis vendor drilldown with member list
- [x] HR SPOC normalization
- [x] Google Sheets 1-click sync
- [x] Date + vendor combinable filters
- [x] Scroll lock, sticky headers, profile dropdown

## Key API Endpoints
- GET /api/analytics/kpis, /kpis-filtered (?from_date, ?to_date, ?vendor)
- GET /api/analytics/pipeline (?vendor), /vendors, /vendor-list, /vendor-detail
- GET /api/analytics/dropoff-detail (?stage_from, ?stage_to)
- GET /api/analytics/roles, /interviews
- GET /api/candidates, /contacts, /openings, /openings/nominees
- POST /api/openings/jd, GET /api/openings/jd, GET /api/openings/jd/download
- POST /api/sync-all, /upload-excel, GET /api/export/candidates
