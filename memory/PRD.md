# HR Dashboard - PRD

## Architecture
- React 18 + Tailwind + Recharts | FastAPI + MongoDB | JWT auth

## Pages
- **Home**: KPIs + Conversion Metrics + Drop-off + Pipeline/Vendor charts + Vendor Performance table (all interactive, filter-aware)
- **Job Openings**: Division-grouped, JD upload/preview, nominees
- **Candidates**: Filterable table + export
- **Interviews**: Search/filter, L1/L2, feedback/remark
- **Contacts**: Type filters, search, detail modals
- ~~Analysis~~ (merged into Home)

## Data Counting (Sheet-Driven)
- Active: NOT (resume_status~reject OR final_status~reject)
- Shortlisted: resume_status~shortlist AND NOT final_status~reject
- Rejected: any phase
- Interview Scheduled: future/today slots only
- Selected: final_status~selected
- Pipeline: "Submitted" replaces "New" for past dates

## Key Endpoints
- GET /api/analytics/kpis, /kpis-filtered, /pipeline, /vendors, /vendor-list, /vendor-detail, /dropoff-detail, /roles, /interviews
- GET /api/candidates, /contacts, /openings, /openings/nominees, /openings/jd, /openings/jd/download
- POST /api/sync-all, /upload-excel, /openings/jd
