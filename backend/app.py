from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import shutil
import uuid

from backend.detection import detect_ppe

app = FastAPI(title="Safeguard AI PPE Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("backend/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/")
def home():
    return {"message": "Safeguard AI Backend is Running"}


@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image")

    extension = Path(file.filename or "").suffix or ".jpg"
    image_path = UPLOAD_DIR / f"{uuid.uuid4()}{extension}"

    try:
        with image_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = detect_ppe(str(image_path))
        return result

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))

    finally:
        await file.close()
        if image_path.exists():
            image_path.unlink()