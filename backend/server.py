from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Depends
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
import openpyxl
import pandas as pd
import io
import xlsxwriter
import requests

# Google Sheets Configuration
OPENINGS_SHEET_ID = "1yk8dclxEhe2NlDvkUnuRFYkIW4H3rLVUAfh8-v5SfmE"
MAIN_SHEET_ID = "1WY2IDKF7H7mUXNJ3ryDIZqavB3p1dcLKmVfydl7E7b4"
GOOGLE_CREDENTIALS_PATH = "/app/backend/google_credentials.json"

# ============ GOOGLE SHEETS SYNC ============

async def fetch_google_sheet_as_df(sheet_id: str, gid: int = 0):
    """Fetch Google Sheet as pandas DataFrame (public sheets via CSV export)"""
    csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
    try:
        response = requests.get(csv_url, timeout=15, allow_redirects=True)
        if response.status_code == 200 and "text/csv" in response.headers.get("Content-Type", ""):
            return pd.read_csv(io.StringIO(response.text))
        elif response.status_code == 200:
            # Google may return HTML login page for private sheets
            if "<html" in response.text[:200].lower():
                raise Exception("Sheet appears to be private. Please make it publicly accessible (View-only) via Share settings.")
            return pd.read_csv(io.StringIO(response.text))
        elif response.status_code == 401 or response.status_code == 403:
            raise Exception("Sheet is private (HTTP 401/403). Please go to Google Sheets > Share > Change to 'Anyone with the link' > Viewer.")
        else:
            raise Exception(f"Failed to fetch sheet (HTTP {response.status_code})")
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=408, detail="Google Sheets request timed out. Please try again.")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=502, detail="Could not connect to Google Sheets. Check internet connectivity.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Google Sheet {sheet_id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

async def sync_openings_from_google():
    """Sync openings from Google Sheets"""
    try:
        df = await fetch_google_sheet_as_df(OPENINGS_SHEET_ID, 0)
        
        # Clear existing openings
        await db.openings.delete_many({})
        
        openings = []
        for _, row in df.iterrows():
            try:
                if pd.isna(row.get("Team / Role")) and pd.isna(row.get("Division")):
                    continue
            except (KeyError, TypeError):
                continue
            
            def safe_get(key, convert_func=str):
                try:
                    val = row.get(key) if hasattr(row, 'get') else row[key]
                    if pd.notna(val):
                        return convert_func(val)
                except (KeyError, TypeError, ValueError):
                    pass
                return None
            
            opening = {
                "id": str(ObjectId()),
                "s_no": safe_get("S.No.", int),
                "division": safe_get("Division"),
                "team_role": safe_get("Team / Role"),
                "key_tasks": safe_get("Key Tasks"),
                "core_objectives": safe_get("Core Objectives"),
                "key_kras": safe_get("Key KRAs"),
                "salary_band": safe_get("Salary Band"),
                "min_exp": safe_get("Min. Exp"),
                "no_of_open_positions": safe_get("No. of Open Positions", int) or 1,
            }
            
            openings.append(opening)
        
        if openings:
            await db.openings.insert_many(openings)
        
        return {"success": True, "count": len(openings)}
    except Exception as e:
        logger.error(f"Error syncing openings from Google: {str(e)}")
        return {"success": False, "error": str(e)}

async def sync_candidates_from_google():
    """Sync main candidate data from Google Sheets"""
    try:
        df = await fetch_google_sheet_as_df(MAIN_SHEET_ID, 0)
        
        # Map columns (same as Excel parsing)
        column_mapping = {
            "S.No": "s_no",
            "S.No.": "s_no",
            "Role/Position": "role",
            "Profile Submission Date": "submission_date",
            "Candidate Name": "candidate_name",
            "Contact Number": "contact_number",
            "Mail ID": "email",
            "Resume Link": "resume_link",
            "Resume Screening Status (To be filled by Hiring Manager)": "resume_status",
            "HR SPOC": "hr_spoc",
            "Work experience": "work_experience",
            "Rel Experience": "rel_experience",
            "CTC": "ctc",
            "ECTC": "ectc",
            "Notice Period": "notice_period",
            "Current Location": "current_location",
            " Current Location": "current_location",
            "Job Location": "job_location",
            "Assessment Round": "assessment_round",
            "Interview Slot": "interview_slot_l1",
            "Interview Status (L1)": "interview_status_l1",
            "Interviewer Name (L1)": "interviewer_name_l1",
            "L1 Feedback": "interview_feedback_l1",
            "Interview Status (L2)": "interview_status_l2",
            "Interviewer Name (L2)": "interviewer_name_l2",
            "L2 Feedback": "interview_feedback_l2",
            "Final Status (Selected/Rejected)": "final_status",
            "Offer Released": "offer_released",
            "Joining Date": "joining_date",
            "Remarks": "remarks",
            "Vendor": "vendor"
        }

        # Rename pandas-auto-deduped duplicate column "Interview Slot.1" to L2 BEFORE broad mapping.
        # Google Sheets / Excel has two columns both titled "Interview Slot"; pandas suffixes the
        # second occurrence with ".1". We must rename it explicitly, otherwise the index-based
        # heuristic below would clobber BOTH columns and lose interview_slot_l1 entirely.
        if "Interview Slot.1" in df.columns:
            df.rename(columns={"Interview Slot.1": "interview_slot_l2"}, inplace=True)
        else:
            # Fallback: if the source exposes two identical "Interview Slot" columns (rare),
            # treat the later-positioned one (index > 17) as L2.
            slot_cols = [c for c in df.columns if str(c).strip() == "Interview Slot"]
            if len(slot_cols) > 1:
                cols = df.columns.tolist()
                second_idx = [i for i, c in enumerate(cols) if str(c).strip() == "Interview Slot"][1]
                # Rename by positional label using a unique temp name to avoid collision
                new_cols = cols.copy()
                new_cols[second_idx] = "interview_slot_l2"
                df.columns = new_cols

        df.rename(columns=column_mapping, inplace=True)
        
        # Clear existing candidates
        await db.candidates.delete_many({})
        
        candidates = []
        for _, row in df.iterrows():
            if pd.isna(row.get("candidate_name")):
                continue
            
            def safe_get(key, convert_func=str):
                try:
                    val = row.get(key) if hasattr(row, 'get') else row[key]
                    if pd.notna(val):
                        return convert_func(val)
                except (KeyError, TypeError, ValueError):
                    pass
                return None
            
            candidate = {
                "id": str(ObjectId()),
                "s_no": safe_get("s_no", int),
                "role": safe_get("role"),
                "submission_date": parse_excel_date(safe_get("submission_date")),
                "candidate_name": safe_get("candidate_name"),
                "contact_number": safe_get("contact_number"),
                "email": safe_get("email"),
                "resume_link": safe_get("resume_link"),
                "resume_status": safe_get("resume_status"),
                "hr_spoc": safe_get("hr_spoc"),
                "work_experience": safe_get("work_experience"),
                "rel_experience": safe_get("rel_experience"),
                "ctc": safe_get("ctc"),
                "ectc": safe_get("ectc"),
                "notice_period": safe_get("notice_period"),
                "current_location": safe_get("current_location"),
                "job_location": safe_get("job_location"),
                "assessment_round": safe_get("assessment_round"),
                "interview_slot_l1": safe_get("interview_slot_l1"),
                "interview_status_l1": safe_get("interview_status_l1"),
                "interviewer_name_l1": safe_get("interviewer_name_l1"),
                "interview_feedback_l1": safe_get("interview_feedback_l1"),
                "interview_slot_l2": safe_get("interview_slot_l2"),
                "interview_status_l2": safe_get("interview_status_l2"),
                "interviewer_name_l2": safe_get("interviewer_name_l2"),
                "interview_feedback_l2": safe_get("interview_feedback_l2"),
                "final_status": safe_get("final_status"),
                "offer_released": safe_get("offer_released"),
                "joining_date": parse_excel_date(safe_get("joining_date")),
                "remarks": safe_get("remarks"),
                "vendor": safe_get("vendor"),
            }
            
            candidate["hr_spoc"] = normalize_hr_spoc(candidate.get("hr_spoc"))
            candidate["current_stage"] = determine_current_stage(candidate)
            candidates.append(candidate)
        
        if candidates:
            await db.candidates.insert_many(candidates)
        
        return {"success": True, "count": len(candidates)}
    except Exception as e:
        logger.error(f"Error syncing candidates from Google: {str(e)}")
        return {"success": False, "error": str(e)}

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

JWT_ALGORITHM = "HS256"

# ============ AUTH UTILITIES ============

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ PYDANTIC MODELS ============

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str = Field(alias="_id")
    email: str
    name: str
    role: str
    created_at: datetime

    model_config = ConfigDict(populate_by_name=True)

class CandidateResponse(BaseModel):
    id: str
    s_no: Optional[int] = None
    role: Optional[str] = None
    submission_date: Optional[str] = None
    candidate_name: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    resume_link: Optional[str] = None
    resume_status: Optional[str] = None
    hr_spoc: Optional[str] = None
    work_experience: Optional[str] = None
    rel_experience: Optional[str] = None
    ctc: Optional[str] = None
    ectc: Optional[str] = None
    notice_period: Optional[str] = None
    current_location: Optional[str] = None
    job_location: Optional[str] = None
    assessment_round: Optional[str] = None
    interview_slot_l1: Optional[str] = None
    interview_status_l1: Optional[str] = None
    interviewer_name_l1: Optional[str] = None
    interview_feedback_l1: Optional[str] = None
    interview_slot_l2: Optional[str] = None
    interview_status_l2: Optional[str] = None
    interviewer_name_l2: Optional[str] = None
    interview_feedback_l2: Optional[str] = None
    final_status: Optional[str] = None
    offer_released: Optional[str] = None
    joining_date: Optional[str] = None
    remarks: Optional[str] = None
    vendor: Optional[str] = None
    current_stage: Optional[str] = None

# ============ ADMIN SEEDING ============

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@vendorhiring.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info(f"Admin password updated: {admin_email}")
    
    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Admin Account\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write("- Role: admin\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/register\n")
        f.write("- POST /api/auth/login\n")
        f.write("- POST /api/auth/logout\n")
        f.write("- GET /api/auth/me\n")

# ============ DATA PARSING UTILITIES ============

def parse_excel_date(value):
    """Parse Excel serial date to readable format"""
    if pd.isna(value) or value == "":
        return None
    try:
        if isinstance(value, (int, float)):
            # Excel serial date (days since 1900-01-01)
            base_date = datetime(1899, 12, 30)
            date_obj = base_date + timedelta(days=value)
            return date_obj.strftime("%Y-%m-%d")
        return str(value)
    except (ValueError, TypeError, OverflowError):
        return str(value) if value else None

def normalize_status(status: str) -> str:
    """Normalize status values"""
    if not status:
        return "New"
    status_lower = str(status).lower().strip()
    if "reject" in status_lower:
        return "Rejected"
    elif "shortlist" in status_lower:
        return "Screening Passed"
    elif "select" in status_lower:
        return "Selected"
    elif "hold" in status_lower:
        return "On Hold"
    elif "offer" in status_lower:
        return "Offer Released"
    return "New"

def normalize_hr_spoc(name):
    """Normalize HR SPOC names to their full form"""
    if not name:
        return name
    spoc_map = {"pujita": "Pujita Bhuyan", "muskan": "Muskan"}
    return spoc_map.get(name.strip().lower(), name.strip())

def parse_date_flexible(date_str):
    """Parse various date formats and return a datetime object or None"""
    if not date_str:
        return None
    s = str(date_str).strip()
    if not s:
        return None
    formats = [
        "%d/%m/%y, %I:%M %p", "%d/%m/%y, %H:%M",
        "%d/%m/%Y, %I:%M %p", "%d/%m/%Y, %H:%M",
        "%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d", "%d-%m-%Y", "%d-%m-%y",
        "%m/%d/%Y", "%m/%d/%y", "%d %b %Y", "%d %b %y", "%b %d, %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None

def is_future_or_today(date_str):
    """Check if a date string is today or in the future"""
    dt = parse_date_flexible(date_str)
    if not dt:
        return False
    return dt.date() >= datetime.now().date()

def determine_current_stage(row: dict) -> str:
    """Determine current pipeline stage for a candidate based on sheet fields"""
    final_status = str(row.get("final_status", "")).lower().strip() if row.get("final_status") else ""
    resume_status = str(row.get("resume_status", "")).lower().strip() if row.get("resume_status") else ""

    # Final Status takes highest priority
    if final_status and "reject" in final_status:
        return "Rejected"
    selected_keywords = ["selected", "select", "cleared interview", "cleared", "clear"]
    if final_status and any(kw in final_status for kw in selected_keywords):
        if row.get("joining_date"):
            return "Joined"
        elif row.get("offer_released"):
            return "Offer Released"
        return "Selected"

    # Interview stages (has been interviewed)
    interview_status_l2 = str(row.get("interview_status_l2", "")).strip() if row.get("interview_status_l2") else ""
    interview_status_l1 = str(row.get("interview_status_l1", "")).strip() if row.get("interview_status_l1") else ""
    if interview_status_l2:
        return "L2 Interview"
    if interview_status_l1:
        return "L1 Interview"

    # Has interview slot → scheduled (only if slot date is valid)
    slot_l1 = str(row.get("interview_slot_l1", "")).strip() if row.get("interview_slot_l1") else ""
    slot_l2 = str(row.get("interview_slot_l2", "")).strip() if row.get("interview_slot_l2") else ""
    if slot_l1 or slot_l2:
        return "Interview Scheduled"

    # Resume screening status
    if resume_status and "reject" in resume_status:
        return "Rejected"
    if resume_status and "shortlist" in resume_status:
        return "Screening Passed"

    # If submission_date is in the past, mark as Submitted (not New)
    sub_date = row.get("submission_date")
    if sub_date:
        dt = parse_date_flexible(sub_date)
        if dt and dt.date() < datetime.now().date():
            return "Submitted"

    return "New"

async def parse_and_store_openings(file_content: bytes):
    """Parse Open Positions sheet and store in MongoDB"""
    try:
        df = pd.read_excel(io.BytesIO(file_content), sheet_name='Open Positions')
        
        # Clear existing openings
        await db.openings.delete_many({})
        
        openings = []
        for _, row in df.iterrows():
            # Skip empty rows
            try:
                if pd.isna(row.get("Team / Role")) and pd.isna(row.get("Division")):
                    continue
            except (KeyError, TypeError):
                continue
            
            def safe_get(key, convert_func=str):
                try:
                    val = row.get(key) if hasattr(row, 'get') else row[key]
                    if pd.notna(val):
                        return convert_func(val)
                except (KeyError, TypeError, ValueError):
                    pass
                return None
            
            opening = {
                "id": str(ObjectId()),
                "s_no": safe_get("S.No.", int),
                "division": safe_get("Division"),
                "team_role": safe_get("Team / Role"),
                "key_tasks": safe_get("Key Tasks"),
                "core_objectives": safe_get("Core Objectives"),
                "key_kras": safe_get("Key KRAs"),
                "salary_band": safe_get("Salary Band"),
                "min_exp": safe_get("Min. Exp"),
                "no_of_open_positions": safe_get("No. of Open Positions", int) or 1,
            }
            
            openings.append(opening)
        
        if openings:
            await db.openings.insert_many(openings)
        
        return {"success": True, "count": len(openings)}
    except Exception as e:
        logger.error(f"Error parsing Open Positions sheet: {str(e)}")
        # If sheet doesn't exist, return success with 0 count
        return {"success": True, "count": 0, "note": "No Open Positions sheet found"}

async def parse_and_store_excel(file_content: bytes):
    """Parse Excel file and store candidates in MongoDB"""
    try:
        df = pd.read_excel(io.BytesIO(file_content))
        
        # Map columns
        column_mapping = {
            "S.No": "s_no",
            "S.No.": "s_no",
            "Role/Position": "role",
            "Profile Submission Date": "submission_date",
            "Candidate Name": "candidate_name",
            "Contact Number": "contact_number",
            "Mail ID": "email",
            "Resume Link": "resume_link",
            "Resume Screening Status (To be filled by Hiring Manager)": "resume_status",
            "HR SPOC": "hr_spoc",
            "Work experience": "work_experience",
            "Rel Experience": "rel_experience",
            "CTC": "ctc",
            "ECTC": "ectc",
            "Notice Period": "notice_period",
            "Current Location": "current_location",
            " Current Location": "current_location",
            "Job Location": "job_location",
            "Assessment Round": "assessment_round",
            "Interview Slot": "interview_slot_l1",
            "Interview Status (L1)": "interview_status_l1",
            "Interviewer Name (L1)": "interviewer_name_l1",
            "L1 Feedback": "interview_feedback_l1",
            "Interview Status (L2)": "interview_status_l2",
            "Interviewer Name (L2)": "interviewer_name_l2",
            "L2 Feedback": "interview_feedback_l2",
            "Final Status (Selected/Rejected)": "final_status",
            "Offer Released": "offer_released",
            "Joining Date": "joining_date",
            "Remarks": "remarks",
            "Vendor": "vendor"
        }

        # Rename pandas-auto-deduped "Interview Slot.1" (L2) before broad mapping — same
        # reasoning as Google Sheets sync; see sync_candidates_from_google().
        if "Interview Slot.1" in df.columns:
            df.rename(columns={"Interview Slot.1": "interview_slot_l2"}, inplace=True)
        else:
            slot_cols = [c for c in df.columns if str(c).strip() == "Interview Slot"]
            if len(slot_cols) > 1:
                cols = df.columns.tolist()
                second_idx = [i for i, c in enumerate(cols) if str(c).strip() == "Interview Slot"][1]
                new_cols = cols.copy()
                new_cols[second_idx] = "interview_slot_l2"
                df.columns = new_cols

        df.rename(columns=column_mapping, inplace=True)
        
        # Clear existing candidates
        await db.candidates.delete_many({})
        
        candidates = []
        for _, row in df.iterrows():
            # Skip empty rows - use proper pandas Series access
            try:
                if pd.isna(row["candidate_name"]):
                    continue
            except (KeyError, TypeError):
                continue
            
            # Safe get function for Series
            def safe_get(key, convert_func=str):
                try:
                    val = row.get(key) if hasattr(row, 'get') else row[key]
                    if pd.notna(val):
                        return convert_func(val)
                except (KeyError, TypeError, ValueError):
                    pass
                return None
            
            candidate = {
                "id": str(ObjectId()),
                "s_no": safe_get("s_no", int),
                "role": safe_get("role"),
                "submission_date": parse_excel_date(safe_get("submission_date")),
                "candidate_name": safe_get("candidate_name"),
                "contact_number": safe_get("contact_number"),
                "email": safe_get("email"),
                "resume_link": safe_get("resume_link"),
                "resume_status": safe_get("resume_status"),
                "hr_spoc": safe_get("hr_spoc"),
                "work_experience": safe_get("work_experience"),
                "rel_experience": safe_get("rel_experience"),
                "ctc": safe_get("ctc"),
                "ectc": safe_get("ectc"),
                "notice_period": safe_get("notice_period"),
                "current_location": safe_get("current_location"),
                "job_location": safe_get("job_location"),
                "assessment_round": safe_get("assessment_round"),
                "interview_slot_l1": safe_get("interview_slot_l1"),
                "interview_status_l1": safe_get("interview_status_l1"),
                "interviewer_name_l1": safe_get("interviewer_name_l1"),
                "interview_feedback_l1": safe_get("interview_feedback_l1"),
                "interview_slot_l2": safe_get("interview_slot_l2"),
                "interview_status_l2": safe_get("interview_status_l2"),
                "interviewer_name_l2": safe_get("interviewer_name_l2"),
                "interview_feedback_l2": safe_get("interview_feedback_l2"),
                "final_status": safe_get("final_status"),
                "offer_released": safe_get("offer_released"),
                "joining_date": parse_excel_date(safe_get("joining_date")),
                "remarks": safe_get("remarks"),
                "vendor": safe_get("vendor"),
            }
            
            candidate["current_stage"] = determine_current_stage(candidate)
            candidate["hr_spoc"] = normalize_hr_spoc(candidate.get("hr_spoc"))
            candidates.append(candidate)
        
        if candidates:
            await db.candidates.insert_many(candidates)
        
        return {"success": True, "count": len(candidates)}
    except Exception as e:
        logger.error(f"Error parsing Excel: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error parsing Excel file: {str(e)}")

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(req.password)
    user_doc = {
        "email": email,
        "password_hash": hashed,
        "name": req.name,
        "role": "user",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=900,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=604800,
        path="/"
    )
    
    return {
        "_id": user_id,
        "email": email,
        "name": req.name,
        "role": "user",
        "created_at": user_doc["created_at"]
    }

@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=900,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=604800,
        path="/"
    )
    
    return {
        "_id": user_id,
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "created_at": user["created_at"]
    }

@api_router.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

# ============ CANDIDATE ENDPOINTS ============

@api_router.get("/candidates")
async def get_candidates(
    user: dict = Depends(get_current_user),
    vendor: Optional[str] = None,
    role: Optional[str] = None,
    stage: Optional[str] = None,
    status: Optional[str] = None
):
    query = {}
    if vendor:
        query["vendor"] = {"$regex": vendor, "$options": "i"}
    if role:
        query["role"] = {"$regex": role, "$options": "i"}
    if stage:
        query["current_stage"] = stage
    if status:
        query["final_status"] = {"$regex": status, "$options": "i"}
    
    candidates = await db.candidates.find(query, {"_id": 0}).to_list(1000)
    return candidates

@api_router.get("/candidates/{candidate_id}")
async def get_candidate(candidate_id: str, user: dict = Depends(get_current_user)):
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate

# ============ ANALYTICS ENDPOINTS ============

# Reusable query fragments for sheet-driven counting
REJECTED_AT_RESUME = {"resume_status": {"$regex": "reject", "$options": "i"}}
REJECTED_AT_FINAL = {"final_status": {"$regex": "reject", "$options": "i"}}
REJECTED_ANYWHERE = {"$or": [REJECTED_AT_RESUME, REJECTED_AT_FINAL]}
NOT_REJECTED = {"$nor": [REJECTED_AT_RESUME, REJECTED_AT_FINAL]}
# Shortlisted = resume_status~shortlist AND NOT final_status~reject
SHORTLISTED_QUERY = {"$and": [
    {"resume_status": {"$regex": "shortlist", "$options": "i"}},
    {"$nor": [REJECTED_AT_FINAL]}
]}
HAS_INTERVIEW_SLOT = {"$or": [
    {"interview_slot_l1": {"$ne": None, "$nin": ["", "None"]}},
    {"interview_slot_l2": {"$ne": None, "$nin": ["", "None"]}},
]}
SELECTED_QUERY = {"final_status": {"$regex": "select", "$options": "i"}}

async def count_future_interviews(extra_query=None):
    """Count candidates with interview slots that are today or future"""
    q = {**HAS_INTERVIEW_SLOT}
    if extra_query:
        q = {"$and": [extra_query, HAS_INTERVIEW_SLOT]}
    candidates = await db.candidates.find(q, {"_id": 0, "interview_slot_l1": 1, "interview_slot_l2": 1}).to_list(1000)
    count = 0
    for c in candidates:
        slot = c.get("interview_slot_l1") or c.get("interview_slot_l2")
        if is_future_or_today(slot):
            count += 1
    return count

@api_router.get("/analytics/kpis")
async def get_kpis(user: dict = Depends(get_current_user)):
    total_candidates = await db.candidates.count_documents({})
    
    openings_count = await db.openings.count_documents({})
    if openings_count > 0:
        total_openings = openings_count
    else:
        pipeline = [{"$group": {"_id": "$role"}}, {"$count": "total"}]
        openings_result = await db.candidates.aggregate(pipeline).to_list(1)
        total_openings = openings_result[0]["total"] if openings_result else 0
    
    # Active = not rejected at any stage
    active_candidates = await db.candidates.count_documents(NOT_REJECTED)
    # Shortlisted = Resume Screening Status contains "shortlisted"
    shortlisted = await db.candidates.count_documents(SHORTLISTED_QUERY)
    # Rejected = rejected at resume screening OR final status
    rejected = await db.candidates.count_documents(REJECTED_ANYWHERE)
    # Interview Scheduled = has any valid Interview Slot value (L1 or L2) — sheet-driven.
    interviews_scheduled = await db.candidates.count_documents(HAS_INTERVIEW_SLOT)
    # Selected = Final Status contains "selected"
    selected = await db.candidates.count_documents(SELECTED_QUERY)
    offer_released = await db.candidates.count_documents({"current_stage": "Offer Released"})
    joined = await db.candidates.count_documents({"current_stage": "Joined"})
    
    vendors_pipeline = [{"$group": {"_id": "$vendor"}}, {"$count": "total"}]
    vendors_result = await db.candidates.aggregate(vendors_pipeline).to_list(1)
    total_vendors = vendors_result[0]["total"] if vendors_result else 0
    
    return {
        "total_openings": total_openings,
        "total_candidates": total_candidates,
        "active_candidates": active_candidates,
        "shortlisted": shortlisted,
        "interviews_scheduled": interviews_scheduled,
        "rejected": rejected,
        "selected": selected,
        "offer_released": offer_released,
        "joined": joined,
        "total_vendors": total_vendors
    }

@api_router.get("/analytics/pipeline")
async def get_pipeline_data(user: dict = Depends(get_current_user), vendor: Optional[str] = None):
    match_stage = {}
    if vendor:
        match_stage["vendor"] = {"$regex": f"^{vendor}$", "$options": "i"}
    pipeline = [
        *([{"$match": match_stage}] if match_stage else []),
        {"$group": {"_id": "$current_stage", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    result = await db.candidates.aggregate(pipeline).to_list(100)
    return result

@api_router.get("/analytics/vendors")
async def get_vendor_analytics(user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"vendor": {"$ne": None}}},
        {"$group": {
            "_id": "$vendor",
            "total": {"$sum": 1},
            "shortlisted": {"$sum": {"$cond": [{"$in": ["$current_stage", ["Screening Passed", "Shortlisted"]]}, 1, 0]}},
            "rejected": {"$sum": {"$cond": [{"$eq": ["$current_stage", "Rejected"]}, 1, 0]}},
            "selected": {"$sum": {"$cond": [{"$eq": ["$current_stage", "Selected"]}, 1, 0]}}
        }},
        {"$sort": {"total": -1}}
    ]
    result = await db.candidates.aggregate(pipeline).to_list(100)
    return result

@api_router.get("/analytics/vendor-list")
async def get_vendor_list(user: dict = Depends(get_current_user)):
    """Get list of all unique vendor names"""
    pipeline = [
        {"$match": {"vendor": {"$ne": None}}},
        {"$group": {"_id": "$vendor"}},
        {"$sort": {"_id": 1}}
    ]
    result = await db.candidates.aggregate(pipeline).to_list(100)
    return [r["_id"] for r in result if r["_id"]]

@api_router.get("/analytics/role-distribution")
async def get_role_distribution(user: dict = Depends(get_current_user), vendor: Optional[str] = None):
    """Get role-wise candidate count. If vendor specified, role distribution for that vendor."""
    match = {}
    if vendor:
        match["vendor"] = {"$regex": f"^{vendor}$", "$options": "i"}
    pipeline = [
        *([{"$match": match}] if match else []),
        {"$match": {"role": {"$ne": None}}},
        {"$group": {"_id": "$role", "total": {"$sum": 1}}},
        {"$sort": {"total": -1}}
    ]
    return await db.candidates.aggregate(pipeline).to_list(100)


@api_router.get("/analytics/vendor-detail")
async def get_vendor_detail(vendor_name: str, user: dict = Depends(get_current_user)):
    """Detailed vendor performance with member list"""
    query = {"vendor": {"$regex": f"^{vendor_name}$", "$options": "i"}}
    members = await db.candidates.find(query, {"_id": 0}).to_list(1000)
    
    total = len(members)
    stages = {}
    roles = {}
    for m in members:
        s = m.get("current_stage", "New")
        stages[s] = stages.get(s, 0) + 1
        r = m.get("role")
        if r:
            roles[r] = roles.get(r, 0) + 1
    
    shortlisted = sum(1 for m in members if m.get("resume_status") and "shortlist" in m["resume_status"].lower())
    selected = stages.get("Selected", 0) + stages.get("Offer Released", 0) + stages.get("Joined", 0)
    rejected = stages.get("Rejected", 0)
    
    return {
        "vendor": vendor_name,
        "total": total,
        "shortlisted": shortlisted,
        "selected": selected,
        "rejected": rejected,
        "shortlist_rate": round((shortlisted / total * 100), 1) if total else 0,
        "selection_rate": round((selected / total * 100), 1) if total else 0,
        "stages": [{"stage": k, "count": v} for k, v in sorted(stages.items(), key=lambda x: -x[1])],
        "roles": [{"role": k, "count": v} for k, v in sorted(roles.items(), key=lambda x: -x[1])],
        "members": [{
            "candidate_name": m.get("candidate_name"),
            "role": m.get("role"),
            "current_stage": m.get("current_stage"),
            "resume_status": m.get("resume_status"),
            "work_experience": m.get("work_experience"),
            "submission_date": m.get("submission_date"),
            "interview_status_l1": m.get("interview_status_l1"),
            "final_status": m.get("final_status"),
        } for m in members]
    }

@api_router.get("/analytics/dropoff-detail")
async def get_dropoff_detail(stage_from: str, stage_to: str, user: dict = Depends(get_current_user)):
    """Get candidates that dropped off between two stages"""
    all_candidates = await db.candidates.find({}, {"_id": 0}).to_list(1000)
    
    def in_stage(c, stage):
        rs = (c.get("resume_status") or "").lower()
        fs = (c.get("final_status") or "").lower()
        cs = c.get("current_stage", "")
        if stage == "submission":
            return True
        elif stage == "shortlist":
            return "shortlist" in rs
        elif stage == "interview":
            return bool(c.get("interview_status_l1") or c.get("interview_slot_l1") or c.get("interview_slot_l2"))
        elif stage == "selected":
            return "select" in fs or cs in ["Selected", "Offer Released", "Joined"]
        elif stage == "offer":
            return cs in ["Offer Released", "Joined"]
        return False
    
    reached_from = [c for c in all_candidates if in_stage(c, stage_from)]
    reached_to = [c for c in all_candidates if in_stage(c, stage_to)]
    to_names = {c.get("candidate_name") for c in reached_to}
    dropped = [c for c in reached_from if c.get("candidate_name") not in to_names]
    
    return {
        "stage_from": stage_from,
        "stage_to": stage_to,
        "from_count": len(reached_from),
        "to_count": len(reached_to),
        "dropped_count": len(dropped),
        "dropped_candidates": [{
            "candidate_name": c.get("candidate_name"),
            "role": c.get("role"),
            "vendor": c.get("vendor"),
            "current_stage": c.get("current_stage"),
            "resume_status": c.get("resume_status"),
            "final_status": c.get("final_status"),
        } for c in dropped]
    }


@api_router.get("/analytics/roles")
async def get_role_analytics(user: dict = Depends(get_current_user)):
    # Check if we have openings from the Open Positions sheet
    openings_count = await db.openings.count_documents({})
    
    if openings_count > 0:
        # Use openings from the dedicated sheet
        openings = await db.openings.find({}, {"_id": 0}).to_list(100)
        
        # Enrich with candidate data + vendor mapping
        result = []
        for opening in openings:
            role_name = opening.get("team_role") or opening.get("role")
            candidates = await db.candidates.find({"role": {"$regex": role_name, "$options": "i"}}, {"_id": 0}).to_list(1000)
            
            total = len(candidates)
            active = len([c for c in candidates if c.get("current_stage") not in ["Rejected", "Joined"]])
            selected = len([c for c in candidates if c.get("current_stage") in ["Selected", "Offer Released", "Joined"]])
            
            # Vendor-to-role mapping
            vendor_counts = {}
            for c in candidates:
                v = c.get("vendor")
                if v:
                    vendor_counts[v] = vendor_counts.get(v, 0) + 1
            vendors = [{"name": k, "count": v} for k, v in sorted(vendor_counts.items(), key=lambda x: -x[1])]
            
            result.append({
                "_id": role_name,
                "opening_data": opening,
                "total": total,
                "active": active,
                "selected": selected,
                "positions": opening.get("no_of_open_positions", 1),
                "vendors": vendors
            })
        
        return result
    else:
        # Fallback to candidate-derived roles with vendor mapping
        all_candidates = await db.candidates.find({}, {"_id": 0, "role": 1, "vendor": 1, "current_stage": 1}).to_list(1000)
        
        role_map = {}
        for c in all_candidates:
            role = c.get("role")
            if not role:
                continue
            if role not in role_map:
                role_map[role] = {"total": 0, "active": 0, "selected": 0, "vendor_counts": {}}
            role_map[role]["total"] += 1
            if c.get("current_stage") not in ["Rejected", "Joined"]:
                role_map[role]["active"] += 1
            if c.get("current_stage") in ["Selected", "Offer Released", "Joined"]:
                role_map[role]["selected"] += 1
            v = c.get("vendor")
            if v:
                role_map[role]["vendor_counts"][v] = role_map[role]["vendor_counts"].get(v, 0) + 1
        
        result = []
        for role, data in sorted(role_map.items(), key=lambda x: -x[1]["total"]):
            vendors = [{"name": k, "count": v} for k, v in sorted(data["vendor_counts"].items(), key=lambda x: -x[1])]
            result.append({
                "_id": role,
                "total": data["total"],
                "active": data["active"],
                "selected": data["selected"],
                "vendors": vendors
            })
        
        return result

@api_router.get("/openings")
async def get_openings(user: dict = Depends(get_current_user)):
    openings = await db.openings.find({}, {"_id": 0}).to_list(100)
    return openings

@api_router.get("/openings/nominees")
async def get_role_nominees(role_name: str, user: dict = Depends(get_current_user)):
    """Get all nominated candidates for a specific role"""
    candidates = await db.candidates.find(
        {"role": {"$regex": role_name, "$options": "i"}},
        {"_id": 0}
    ).to_list(1000)
    return candidates

# ============ JD UPLOAD ============

@api_router.post("/openings/jd")
async def upload_jd(
    role_name: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload a Job Description file for a specific role"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can upload JDs")
    
    content = await file.read()
    
    # Extract text summary from the file
    summary = ""
    fname = (file.filename or "").lower()
    if fname.endswith(('.txt', '.md')):
        summary = content.decode('utf-8', errors='ignore')[:2000]
    elif fname.endswith('.pdf'):
        import fitz
        doc = fitz.open(stream=content, filetype="pdf")
        for page in doc:
            summary += page.get_text()
        doc.close()
        summary = summary[:2000]
    elif fname.endswith('.docx'):
        from docx import Document as DocxDocument
        doc = DocxDocument(io.BytesIO(content))
        summary = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])[:2000]
    else:
        summary = f"File uploaded: {file.filename}"
    
    # Save to uploads dir
    safe_name = role_name.replace("/", "_").replace(" ", "_")
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "txt"
    save_path = f"/app/backend/uploads/jd_{safe_name}.{ext}"
    with open(save_path, "wb") as f:
        f.write(content)
    
    # Store JD info in MongoDB
    await db.job_descriptions.update_one(
        {"role_name": role_name},
        {"$set": {
            "role_name": role_name,
            "filename": file.filename,
            "file_path": save_path,
            "summary": summary.strip(),
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "uploaded_by": user.get("email")
        }},
        upsert=True
    )
    
    return {"success": True, "filename": file.filename, "summary": summary.strip()[:500]}

@api_router.get("/openings/jd")
async def get_jd(role_name: str, user: dict = Depends(get_current_user)):
    """Get JD info for a specific role"""
    jd = await db.job_descriptions.find_one({"role_name": role_name}, {"_id": 0})
    return jd or {"role_name": role_name, "filename": None, "summary": None}

@api_router.get("/openings/jd/download")
async def download_jd(role_name: str, user: dict = Depends(get_current_user)):
    """Download/preview the JD file for a specific role"""
    jd = await db.job_descriptions.find_one({"role_name": role_name}, {"_id": 0})
    if not jd or not jd.get("file_path"):
        raise HTTPException(status_code=404, detail="No JD file found for this role")
    import os
    fp = jd["file_path"]
    if not os.path.exists(fp):
        raise HTTPException(status_code=404, detail="JD file missing from disk")
    fname = jd.get("filename", "jd.pdf")
    # Determine media type
    ext = fname.rsplit(".", 1)[-1].lower() if "." in fname else ""
    media_types = {"pdf": "application/pdf", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "txt": "text/plain", "md": "text/markdown"}
    media = media_types.get(ext, "application/octet-stream")
    return FileResponse(fp, filename=fname, media_type=media)

def normalize_interview_slot(slot_value):
    """Normalize interview slot to a readable date/time format"""
    if not slot_value:
        return None
    slot = str(slot_value).strip()
    if not slot:
        return None
    
    # Try parsing common date formats
    date_formats = [
        # dd/mm/yy, h:mm PM (IST) - e.g., "09/04/26, 4:00 PM"
        ("%d/%m/%y, %I:%M %p", True),
        ("%d/%m/%y, %H:%M", True),
        ("%d/%m/%Y, %I:%M %p", True),
        ("%d/%m/%Y, %H:%M", True),
        ("%Y-%m-%d %H:%M:%S", False), ("%Y-%m-%d %H:%M", False), ("%Y-%m-%d", False),
        ("%d-%m-%Y %H:%M", False), ("%d-%m-%Y", False),
        ("%d/%m/%Y %H:%M", False), ("%d/%m/%Y", False),
        ("%m/%d/%Y %H:%M", False), ("%m/%d/%Y", False),
        ("%d %b %Y %H:%M", False), ("%d %b %Y", False),
        ("%b %d, %Y %H:%M", False), ("%b %d, %Y", False),
        ("%d-%b-%Y", False), ("%d %B %Y", False),
    ]
    for item in date_formats:
        fmt, ist = item
        try:
            dt = datetime.strptime(slot, fmt)
            suffix = " IST" if ist else ""
            return (dt.strftime("%b %d, %Y %I:%M %p") + suffix) if dt.hour or dt.minute else dt.strftime("%b %d, %Y")
        except ValueError:
            continue
    
    # Try Excel serial date
    try:
        num = float(slot)
        if 40000 < num < 50000:  # Reasonable Excel date range
            base_date = datetime(1899, 12, 30)
            dt = base_date + timedelta(days=num)
            frac = num - int(num)
            if frac > 0:
                hours = int(frac * 24)
                minutes = int((frac * 24 - hours) * 60)
                dt = dt.replace(hour=hours, minute=minutes)
                return dt.strftime("%b %d, %Y %I:%M %p")
            return dt.strftime("%b %d, %Y")
    except (ValueError, TypeError):
        pass
    
    return slot  # Return as-is if no format matches

@api_router.get("/analytics/interviews")
async def get_interview_analytics(user: dict = Depends(get_current_user)):
    candidates = await db.candidates.find({}, {"_id": 0}).to_list(1000)
    
    interviews = []
    for c in candidates:
        if c.get("interview_slot_l1") or c.get("interview_status_l1"):
            interviews.append({
                "candidate_name": c.get("candidate_name"),
                "role": c.get("role"),
                "vendor": c.get("vendor"),
                "level": "L1",
                "slot": normalize_interview_slot(c.get("interview_slot_l1")) or c.get("interview_slot_l1"),
                "slot_raw": c.get("interview_slot_l1"),
                "status": c.get("interview_status_l1"),
                "interviewer": c.get("interviewer_name_l1"),
                "current_stage": c.get("current_stage"),
                "feedback": c.get("interview_feedback_l1") or c.get("remarks"),
                "remarks": c.get("remarks")
            })
        if c.get("interview_slot_l2") or c.get("interview_status_l2"):
            interviews.append({
                "candidate_name": c.get("candidate_name"),
                "role": c.get("role"),
                "vendor": c.get("vendor"),
                "level": "L2",
                "slot": normalize_interview_slot(c.get("interview_slot_l2")) or c.get("interview_slot_l2"),
                "slot_raw": c.get("interview_slot_l2"),
                "status": c.get("interview_status_l2"),
                "interviewer": c.get("interviewer_name_l2"),
                "current_stage": c.get("current_stage"),
                "feedback": c.get("interview_feedback_l2") or c.get("remarks"),
                "remarks": c.get("remarks")
            })
    
    return interviews

# ============ FILE UPLOAD ENDPOINT ============

@api_router.post("/sync-google-sheets")
async def sync_from_google_sheets(user: dict = Depends(get_current_user)):
    """Sync main candidate data from Google Sheets"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can sync data")
    result = await sync_candidates_from_google()
    if result.get("success"):
        await db.settings.update_one(
            {"key": "last_sync"},
            {"$set": {"key": "last_sync", "timestamp": datetime.now(timezone.utc).isoformat(), "type": "candidates", "count": result.get("count", 0)}},
            upsert=True
        )
    return result

@api_router.post("/sync-google-openings")
async def sync_openings_from_google_endpoint(user: dict = Depends(get_current_user)):
    """Sync openings from Google Sheets"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can sync data")
    result = await sync_openings_from_google()
    return result

@api_router.post("/sync-all")
async def sync_all_from_google(user: dict = Depends(get_current_user)):
    """Combined sync: candidates + openings from Google Sheets"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can sync data")
    
    errors = []
    cand_count = 0
    open_count = 0
    
    try:
        cand_result = await sync_candidates_from_google()
        cand_count = cand_result.get("count", 0)
    except Exception as e:
        errors.append(f"Candidates: {str(e)}")
    
    try:
        open_result = await sync_openings_from_google()
        open_count = open_result.get("count", 0)
    except Exception as e:
        errors.append(f"Openings: {str(e)}")
    
    timestamp = datetime.now(timezone.utc).isoformat()
    await db.settings.update_one(
        {"key": "last_sync"},
        {"$set": {"key": "last_sync", "timestamp": timestamp, "candidates": cand_count, "openings": open_count}},
        upsert=True
    )
    
    if errors and cand_count == 0 and open_count == 0:
        raise HTTPException(status_code=400, detail="; ".join(errors))
    
    return {
        "success": True,
        "candidates_count": cand_count,
        "openings_count": open_count,
        "timestamp": timestamp,
        "warnings": errors if errors else None
    }

@api_router.get("/sync/status")
async def get_sync_status(user: dict = Depends(get_current_user)):
    """Get last sync timestamp"""
    setting = await db.settings.find_one({"key": "last_sync"}, {"_id": 0})
    return setting or {"key": "last_sync", "timestamp": None}

@api_router.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    # Only admin users can upload data
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can upload data")
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are allowed")
    
    content = await file.read()
    
    # Parse both sheets
    candidates_result = await parse_and_store_excel(content)
    openings_result = await parse_and_store_openings(content)
    
    return {
        "success": True,
        "candidates_count": candidates_result.get("count", 0),
        "openings_count": openings_result.get("count", 0)
    }

# ============ CONTACTS ENDPOINT ============

@api_router.get("/contacts")
async def get_contacts(user: dict = Depends(get_current_user), search: Optional[str] = None):
    """Extract unique contacts from candidates data - HR SPOCs, vendors, interviewers"""
    candidates = await db.candidates.find({}, {"_id": 0}).to_list(1000)
    
    contacts = []
    seen = set()
    
    # Extract HR SPOCs
    for c in candidates:
        if c.get("hr_spoc"):
            key = f"spoc-{c['hr_spoc']}"
            if key not in seen:
                seen.add(key)
                contacts.append({
                    "name": c["hr_spoc"],
                    "type": "HR SPOC",
                    "vendor": c.get("vendor"),
                    "email": None,
                    "phone": None,
                    "roles": []
                })
    
    # Extract unique vendors with contact info
    vendor_map = {}
    for c in candidates:
        vendor = c.get("vendor")
        if vendor and vendor not in vendor_map:
            vendor_map[vendor] = {
                "name": vendor,
                "type": "Vendor",
                "vendor": vendor,
                "email": None,
                "phone": None,
                "roles": [],
                "candidate_count": 0
            }
        if vendor:
            role = c.get("role")
            if role and role not in vendor_map[vendor]["roles"]:
                vendor_map[vendor]["roles"].append(role)
            vendor_map[vendor]["candidate_count"] += 1
    
    for v in vendor_map.values():
        contacts.append(v)
    
    # Extract interviewers
    for c in candidates:
        for level in ["l1", "l2"]:
            interviewer = c.get(f"interviewer_name_{level}")
            if interviewer:
                key = f"interviewer-{interviewer}"
                if key not in seen:
                    seen.add(key)
                    contacts.append({
                        "name": interviewer,
                        "type": f"Interviewer ({level.upper()})",
                        "vendor": None,
                        "email": None,
                        "phone": None,
                        "roles": [c.get("role")] if c.get("role") else []
                    })
    
    # Extract candidates with contact info
    for c in candidates:
        if c.get("email") or c.get("contact_number"):
            contacts.append({
                "name": c.get("candidate_name"),
                "type": "Candidate",
                "vendor": c.get("vendor"),
                "email": c.get("email"),
                "phone": c.get("contact_number"),
                "roles": [c.get("role")] if c.get("role") else [],
                "stage": c.get("current_stage")
            })
    
    # Apply search filter
    if search:
        search_lower = search.lower()
        contacts = [ct for ct in contacts if 
                    (ct.get("name") and search_lower in ct["name"].lower()) or
                    (ct.get("vendor") and search_lower in ct["vendor"].lower()) or
                    (ct.get("type") and search_lower in ct["type"].lower()) or
                    (ct.get("email") and search_lower in ct["email"].lower())]
    
    return contacts

# ============ DATE-FILTERED STATS ============

@api_router.get("/analytics/kpis-filtered")
async def get_kpis_filtered(
    user: dict = Depends(get_current_user),
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    vendor: Optional[str] = None
):
    """Get KPIs with optional date and vendor filtering - sheet-driven counts"""
    base = {}
    if from_date or to_date:
        date_filter = {}
        if from_date:
            date_filter["$gte"] = from_date
        if to_date:
            date_filter["$lte"] = to_date
        base["submission_date"] = date_filter
    if vendor:
        base["vendor"] = {"$regex": f"^{vendor}$", "$options": "i"}

    def q(extra=None):
        if extra:
            return {"$and": [base, extra]} if base else extra
        return base

    total_candidates = await db.candidates.count_documents(q())

    # Active = not rejected at resume OR final level
    active_candidates = await db.candidates.count_documents(
        {"$and": [base, NOT_REJECTED]} if base else NOT_REJECTED
    )
    # Shortlisted = resume_status contains "shortlist"
    shortlisted = await db.candidates.count_documents(q(SHORTLISTED_QUERY))
    # Rejected = rejected at any level
    rejected = await db.candidates.count_documents(q(REJECTED_ANYWHERE))
    # Interview Scheduled = has any valid Interview Slot value (L1 or L2) — sheet-driven.
    interviews_scheduled = await db.candidates.count_documents(
        {"$and": [base, HAS_INTERVIEW_SLOT]} if base else HAS_INTERVIEW_SLOT
    )
    # Selected = final_status contains "selected"
    selected = await db.candidates.count_documents(q(SELECTED_QUERY))
    offer_released = await db.candidates.count_documents(q({"current_stage": "Offer Released"}))
    joined = await db.candidates.count_documents(q({"current_stage": "Joined"}))

    openings_count = await db.openings.count_documents({})
    if vendor or openings_count == 0:
        pipeline = [{"$match": q()}, {"$group": {"_id": "$role"}}, {"$count": "total"}]
        openings_result = await db.candidates.aggregate(pipeline).to_list(1)
        total_openings = openings_result[0]["total"] if openings_result else 0
    else:
        total_openings = openings_count

    vendors_pipeline = [{"$match": q()}, {"$group": {"_id": "$vendor"}}, {"$count": "total"}]
    vendors_result = await db.candidates.aggregate(vendors_pipeline).to_list(1)
    total_vendors = vendors_result[0]["total"] if vendors_result else 0

    return {
        "total_openings": total_openings,
        "total_candidates": total_candidates,
        "active_candidates": active_candidates,
        "shortlisted": shortlisted,
        "interviews_scheduled": interviews_scheduled,
        "rejected": rejected,
        "selected": selected,
        "offer_released": offer_released,
        "joined": joined,
        "total_vendors": total_vendors
    }

# ============ EXPORT ENDPOINT ============

@api_router.get("/export/candidates")
async def export_candidates(user: dict = Depends(get_current_user)):
    from fastapi.responses import StreamingResponse
    
    candidates = await db.candidates.find({}, {"_id": 0}).to_list(1000)
    
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet("Candidates")
    
    headers = [
        "S.No", "Role", "Submission Date", "Candidate Name", "Contact", "Email",
        "Resume Status", "HR SPOC", "Work Exp", "CTC", "ECTC", "Notice Period",
        "Current Location", "Job Location", "Interview L1 Slot", "Interview L1 Status",
        "Interviewer L1", "Interview L2 Slot", "Interview L2 Status", "Interviewer L2",
        "Final Status", "Current Stage", "Vendor", "Remarks"
    ]
    
    for col, header in enumerate(headers):
        worksheet.write(0, col, header)
    
    for row_idx, candidate in enumerate(candidates, start=1):
        worksheet.write(row_idx, 0, candidate.get("s_no", ""))
        worksheet.write(row_idx, 1, candidate.get("role", ""))
        worksheet.write(row_idx, 2, candidate.get("submission_date", ""))
        worksheet.write(row_idx, 3, candidate.get("candidate_name", ""))
        worksheet.write(row_idx, 4, candidate.get("contact_number", ""))
        worksheet.write(row_idx, 5, candidate.get("email", ""))
        worksheet.write(row_idx, 6, candidate.get("resume_status", ""))
        worksheet.write(row_idx, 7, candidate.get("hr_spoc", ""))
        worksheet.write(row_idx, 8, candidate.get("work_experience", ""))
        worksheet.write(row_idx, 9, candidate.get("ctc", ""))
        worksheet.write(row_idx, 10, candidate.get("ectc", ""))
        worksheet.write(row_idx, 11, candidate.get("notice_period", ""))
        worksheet.write(row_idx, 12, candidate.get("current_location", ""))
        worksheet.write(row_idx, 13, candidate.get("job_location", ""))
        worksheet.write(row_idx, 14, candidate.get("interview_slot_l1", ""))
        worksheet.write(row_idx, 15, candidate.get("interview_status_l1", ""))
        worksheet.write(row_idx, 16, candidate.get("interviewer_name_l1", ""))
        worksheet.write(row_idx, 17, candidate.get("interview_slot_l2", ""))
        worksheet.write(row_idx, 18, candidate.get("interview_status_l2", ""))
        worksheet.write(row_idx, 19, candidate.get("interviewer_name_l2", ""))
        worksheet.write(row_idx, 20, candidate.get("final_status", ""))
        worksheet.write(row_idx, 21, candidate.get("current_stage", ""))
        worksheet.write(row_idx, 22, candidate.get("vendor", ""))
        worksheet.write(row_idx, 23, candidate.get("remarks", ""))
    
    workbook.close()
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=candidates_export.xlsx"}
    )

# ============ STARTUP & MIDDLEWARE ============

@app.on_event("startup")
async def startup_event():
    await seed_admin()
    await db.users.create_index("email", unique=True)
    await db.candidates.create_index("id", unique=True)
    logger.info("Server started and indexes created")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
