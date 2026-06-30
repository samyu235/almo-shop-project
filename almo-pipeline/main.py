from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import products
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.product_service import sync_from_file

app = FastAPI(title="Almo Pipeline API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(products.router, prefix="/api/products")

scheduler = BackgroundScheduler()

scheduler.add_job(
    sync_from_file,
    trigger="cron",
    hour=8,
    minute=0
)

@app.on_event("startup")
def start_scheduler():
    scheduler.start()
    print("Scheduler started — sync will run at 8 AM daily")

@app.on_event("shutdown")
def stop_scheduler():
    scheduler.shutdown()
    print("Scheduler stopped")