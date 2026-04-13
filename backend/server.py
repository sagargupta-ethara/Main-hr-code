from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Depends
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
    interview_slot_l2: Optional[str] = None
    interview_status_l2: Optional[str] = None
    interviewer_name_l2: Optional[str] = None
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
        f.write(f"- Role: admin\n\n")
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
    except:
        return str(value) if value else None

def normalize_status(status: str) -> str:
    """Normalize status values"""
    if not status:
        return "New"
    status_lower = str(status).lower().strip()
    if "reject" in status_lower:
        return "Rejected"
    elif "shortlist" in status_lower:
        return "Shortlisted"
    elif "select" in status_lower:
        return "Selected"
    elif "hold" in status_lower:
        return "On Hold"
    elif "offer" in status_lower:
        return "Offer Released"
    return "New"

def determine_current_stage(row: dict) -> str:
    """Determine current pipeline stage for a candidate"""
    if row.get("final_status") and "select" in str(row.get("final_status")).lower():
        if row.get("joining_date"):
            return "Joined"
        elif row.get("offer_released"):
            return "Offer Released"
        return "Selected"
    elif row.get("final_status") and "reject" in str(row.get("final_status")).lower():
        return "Rejected"
    elif row.get("interview_status_l2"):
        return "L2 Interview"
    elif row.get("interview_status_l1"):
        return "L1 Interview"
    elif row.get("interview_slot_l1") or row.get("assessment_round"):
        return "Interview Scheduled"
    elif row.get("resume_status") and "shortlist" in str(row.get("resume_status")).lower():
        return "Shortlisted"
    elif row.get("resume_status") and "reject" in str(row.get("resume_status")).lower():
        return "Rejected"
    return "New"

async def parse_and_store_excel(file_content: bytes):
    """Parse Excel file and store candidates in MongoDB"""
    try:
        df = pd.read_excel(io.BytesIO(file_content))
        
        # Map columns
        column_mapping = {
            "S.No": "s_no",
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
            "Job Location": "job_location",
            "Assessment Round": "assessment_round",
            "Interview Slot": "interview_slot_l1",
            "Interview Status (L1)": "interview_status_l1",
            "Interviewer Name (L1)": "interviewer_name_l1",
            "Interview Status (L2)": "interview_status_l2",
            "Interviewer Name (L2)": "interviewer_name_l2",
            "Final Status (Selected/Rejected)": "final_status",
            "Offer Released": "offer_released",
            "Joining Date": "joining_date",
            "Remarks": "remarks",
            "Vendor": "vendor"
        }
        
        # Handle L2 interview slot column (appears twice)
        if len([col for col in df.columns if "Interview Slot" in str(col)]) > 1:
            cols = df.columns.tolist()
            for i, col in enumerate(cols):
                if "Interview Slot" in str(col):
                    if i > 15:  # Second occurrence
                        df.rename(columns={col: "Interview Slot (L2)"}, inplace=True)
        
        df.rename(columns=column_mapping, inplace=True)
        df.rename(columns={"Interview Slot (L2)": "interview_slot_l2"}, inplace=True)
        
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
                "interview_slot_l2": safe_get("interview_slot_l2"),
                "interview_status_l2": safe_get("interview_status_l2"),
                "interviewer_name_l2": safe_get("interviewer_name_l2"),
                "final_status": safe_get("final_status"),
                "offer_released": safe_get("offer_released"),
                "joining_date": parse_excel_date(safe_get("joining_date")),
                "remarks": safe_get("remarks"),
                "vendor": safe_get("vendor"),
            }
            
            candidate["current_stage"] = determine_current_stage(candidate)
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

@api_router.get("/analytics/kpis")
async def get_kpis(user: dict = Depends(get_current_user)):
    total_candidates = await db.candidates.count_documents({})
    
    # Get unique roles (openings)
    pipeline = [{"$group": {"_id": "$role"}}, {"$count": "total"}]
    openings_result = await db.candidates.aggregate(pipeline).to_list(1)
    total_openings = openings_result[0]["total"] if openings_result else 0
    
    active_candidates = await db.candidates.count_documents({
        "current_stage": {"$nin": ["Rejected", "Joined"]}
    })
    
    shortlisted = await db.candidates.count_documents({"current_stage": "Shortlisted"})
    interviews_scheduled = await db.candidates.count_documents({
        "current_stage": {"$in": ["Interview Scheduled", "L1 Interview", "L2 Interview"]}
    })
    rejected = await db.candidates.count_documents({"current_stage": "Rejected"})
    selected = await db.candidates.count_documents({"current_stage": "Selected"})
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
async def get_pipeline_data(user: dict = Depends(get_current_user)):
    pipeline = [
        {"$group": {"_id": "$current_stage", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    result = await db.candidates.aggregate(pipeline).to_list(100)
    return result

@api_router.get("/analytics/vendors")
async def get_vendor_analytics(user: dict = Depends(get_current_user)):
    pipeline = [
        {"$group": {
            "_id": "$vendor",
            "total": {"$sum": 1},
            "shortlisted": {"$sum": {"$cond": [{"$eq": ["$current_stage", "Shortlisted"]}, 1, 0]}},
            "rejected": {"$sum": {"$cond": [{"$eq": ["$current_stage", "Rejected"]}, 1, 0]}},
            "selected": {"$sum": {"$cond": [{"$eq": ["$current_stage", "Selected"]}, 1, 0]}}
        }},
        {"$sort": {"total": -1}}
    ]
    result = await db.candidates.aggregate(pipeline).to_list(100)
    return result

@api_router.get("/analytics/roles")
async def get_role_analytics(user: dict = Depends(get_current_user)):
    pipeline = [
        {"$group": {
            "_id": "$role",
            "total": {"$sum": 1},
            "active": {"$sum": {"$cond": [{"$nin": ["$current_stage", ["Rejected", "Joined"]]}, 1, 0]}},
            "selected": {"$sum": {"$cond": [{"$in": ["$current_stage", ["Selected", "Offer Released", "Joined"]]}, 1, 0]}}
        }},
        {"$sort": {"total": -1}}
    ]
    result = await db.candidates.aggregate(pipeline).to_list(100)
    return result

@api_router.get("/analytics/interviews")
async def get_interview_analytics(user: dict = Depends(get_current_user)):
    candidates = await db.candidates.find({}, {"_id": 0}).to_list(1000)
    
    interviews = []
    for c in candidates:
        if c.get("interview_slot_l1"):
            interviews.append({
                "candidate_name": c.get("candidate_name"),
                "role": c.get("role"),
                "vendor": c.get("vendor"),
                "level": "L1",
                "slot": c.get("interview_slot_l1"),
                "status": c.get("interview_status_l1"),
                "interviewer": c.get("interviewer_name_l1")
            })
        if c.get("interview_slot_l2"):
            interviews.append({
                "candidate_name": c.get("candidate_name"),
                "role": c.get("role"),
                "vendor": c.get("vendor"),
                "level": "L2",
                "slot": c.get("interview_slot_l2"),
                "status": c.get("interview_status_l2"),
                "interviewer": c.get("interviewer_name_l2")
            })
    
    return interviews

# ============ FILE UPLOAD ENDPOINT ============

@api_router.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are allowed")
    
    content = await file.read()
    result = await parse_and_store_excel(content)
    return result

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
