from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, constr
from typing import Literal
import nmap       # pip install python-nmap
import re, ipaddress
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware 
app = FastAPI(title="Nmap Backend API")

# ADD THESE LINES RIGHT AFTER app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Allowed scan types (limit options to prevent abuse)
ScanType = Literal["quick", "tcp", "udp", "version", "ping"]

# Mapping of scan types to nmap arguments
SCAN_ARGS = {
    "quick": "-T4 -Pn",           # Fast scan
    "tcp": "-sT -T4 -Pn",            # TCP connect scan
    "udp": "-sU -T4 -Pn",            # UDP scan
    "version": "-sV -sC -O -Pn",     # Service & version detection
    "ping": "-sn",                   # Ping only
}

# Request model for validation
class ScanRequest(BaseModel):
    target: constr(min_length=1, max_length=255)
    scan_type: ScanType = "quick"
    ports: str | None = None  # Example: "22,80,443" or "1-1024"

# Helper to validate target
def validate_target(target: str) -> None:
    try:
        ipaddress.ip_address(target)
        return
    except ValueError:
        pass
    if not re.fullmatch(r"^[a-zA-Z0-9\.\-]+$", target):
        raise ValueError("Invalid target. Use a valid IP or hostname.")

@app.get("/")
def home():
    return {"message": "Nmap Backend is running!"}

@app.post("/scan")
def run_scan(req: ScanRequest):
    """Run Nmap scan based on user's request"""
    # Validate target
    try:
        validate_target(req.target)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Build nmap arguments
    args = SCAN_ARGS.get(req.scan_type, SCAN_ARGS["quick"])
    if req.ports:
        if not re.fullmatch(r"^[0-9,\-]+$", req.ports):
            raise HTTPException(status_code=400, detail="Invalid port format.")
        args += f" -p {req.ports}"

    # Run the scan
    nm = nmap.PortScanner()
    try:
        result = nm.scan(hosts=req.target, arguments=args)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scan failed: {e}")

    # Return result as JSON
    return {
        "target": req.target,
        "scan_type": req.scan_type,
        "args": args,
        "result": result
    }
