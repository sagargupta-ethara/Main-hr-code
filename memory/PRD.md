# HR Dashboard - PRD

## UI: Dark Enterprise Theme, Manrope font, left sidebar, CSS vars
## KPI Card Order: Total Candidates > Openings > Active > Screening Passed > Interviews > Selected > Rejected
## Resume links shown in all candidate modal/detail views
## Interviews: Calendar view. Interview events driven EXCLUSIVELY by Interview Slot (L1/L2) fields; Profile Submission Date is shown ONLY as submission-event data (never as an interview date). Slot parser supports "dd/mm/yy at h:mm PM", "dd/mm/yy, h:mm PM", "dd/mm/yyyy ...", and ISO. Date click → popup with candidate/member info, interview date + time (from slot), L-level status/interviewer/feedback (L1 Feedback / L2 Feedback columns), remarks, and resume link.
## Sheet → DB column mapping: two "Interview Slot" columns in the sheet are handled by renaming pandas' auto-deduped "Interview Slot.1" → interview_slot_l2. Added mappings: "L1 Feedback" → interview_feedback_l1, "L2 Feedback" → interview_feedback_l2, "S.No." alias, " Current Location" (leading-space) alias.

## Terminology: When Resume Screening Status = Shortlisted, we display/store current_stage as "Screening Passed" (sheet raw value stays unchanged). Rejected remains "Rejected". Applied across KPI card title, metric label ("Screening Pass Rate"), stage drop-off ("Submission → Screening Pass", "Screening Pass → Interview"), vendor table column, vendor chart legend, and badges.

## Interview Scheduled KPI: counts ANY candidate whose Interview Slot (L1 or L2) has a non-empty value (not future-only). Subtitle: "Has valid interview slot".

## Candidates page (title "Candidates Progress Update"):
### - Default Role-wise view: candidates grouped by Job Role; each role is an expandable card showing per-stage counts and a candidate list.
### - List view toggle available for flat table view.
### - Each candidate row is clickable → opens a Sheet drawer with the FULL STAGE JOURNEY timeline (Submitted → Screening Passed → L1 → L2 → Selected → Offer → Joined) showing green/red/gray status per stage + vendor, interviewer (L1/L2), L1/L2 feedback, remarks, final outcome, and resume link.
