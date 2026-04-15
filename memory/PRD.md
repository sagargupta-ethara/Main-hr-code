# HR Dashboard - PRD

## UI Theme
- **Layout**: Left sidebar (220px, dark slate-900) + light main content (#F1F5F9)
- **Font**: DM Sans (sans-serif) consistently across all pages
- **Cards**: White backgrounds with color-coded tints (blue=active, purple=shortlisted, red=rejected, green=selected, amber=interviews)
- **KPI Cards**: Explanative with title + value + subtitle + description

## Pages
- **Home**: KPIs + Conversion Metrics + Drop-off + Pipeline/Vendor charts + Vendor Performance table
- **Job Openings**: Division-grouped, JD upload/preview, nominees
- **Candidates**: Filterable table + export
- **Interviews**: Search/filter, L1/L2, feedback/remark
- **Contacts**: Type filters, search, detail modals

## Data Counting (Sheet-Driven)
- Active: NOT (resume_status~reject OR final_status~reject)
- Shortlisted: resume_status~shortlist AND NOT final_status~reject
- Rejected: any phase | Interview Scheduled: future/today slots | Selected: final_status~selected
