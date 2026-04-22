# HR Dashboard - PRD

## UI: Dark Enterprise Theme, Manrope font, left sidebar, CSS vars
## KPI Card Order: Total Candidates > Openings > Active > Shortlisted > Interviews > Selected > Rejected
## Resume links shown in all candidate modal/detail views
## Interviews: Calendar view. Interview events driven EXCLUSIVELY by Interview Slot (L1/L2) fields; Profile Submission Date is shown ONLY as submission-event data (never as an interview date). Slot parser supports "dd/mm/yy at h:mm PM", "dd/mm/yy, h:mm PM", "dd/mm/yyyy …", and ISO. Date click → popup with candidate/member info, interview date + time (from slot), L-level status/interviewer/feedback (L1 Feedback / L2 Feedback columns), remarks, and resume link.
## Sheet → DB column mapping: two "Interview Slot" columns in the sheet are handled by renaming pandas' auto-deduped "Interview Slot.1" → interview_slot_l2. Added mappings: "L1 Feedback" → interview_feedback_l1, "L2 Feedback" → interview_feedback_l2, "S.No." alias, " Current Location" (leading-space) alias.
## Data Counting: Sheet-driven (Active, Shortlisted excl final-reject, Rejected any phase, Interview Scheduled future only, Selected)
