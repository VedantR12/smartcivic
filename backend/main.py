from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import complaints, admin, auth
from supabase_client import supabase

app = FastAPI(title="SmartCivic API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(admin.router)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/keepalive")
def keepalive():
    supabase.table("users").select("id").limit(1).execute()
    return {"status": "db pinged"}