from pathlib import Path
from ultralytics import YOLO

# Project paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent

# Find trained YOLO model - sab jagah dhoondho
possible_paths = [
    BASE_DIR / "runs/ppe-test/weights/best.pt",
    BASE_DIR / "runs/detect/ppe-test/weights/best.pt",
    PROJECT_DIR / "runs/detect/ppe-test/weights/best.pt",
    PROJECT_DIR / "runs/ppe-test/weights/best.pt",
    BASE_DIR / "best.pt",
    PROJECT_DIR / "best.pt",
    BASE_DIR / "models/best.pt",
    PROJECT_DIR / "models/best.pt",
]

MODEL_PATH = next(
    (path for path in possible_paths if path.exists()),
    None
)

# Agar best.pt nahi mila, to crash mat karo, yolov8n use karo
if MODEL_PATH is None:
    print("WARNING: best.pt nahi mila, yolov8n.pt use kar raha hu (backend chalega)")
    print("Tumhara best.pt inme se kahi hona chahiye tha:")
    for p in possible_paths:
        print(" -", p)
    MODEL_PATH = "yolov8n.pt"
else:
    print(f"YOLO MODEL LOADED: {MODEL_PATH}")

# Load YOLO model
model = YOLO(str(MODEL_PATH))

print("YOLO MODEL LOADED SUCCESSFULLY")

def detect_ppe(image_path):

    results = model.predict(
        source=image_path,
        conf=0.25,
        verbose=False
    )

    detections = []
    violations = []

    for result in results:

        for box in result.boxes:

            class_id = int(box.cls[0])
            confidence = float(box.conf[0])

            class_name = result.names[class_id]

            normalized_name = (
                class_name.lower()
                .replace(" ", "_")
                .replace("-", "_")
            )

            is_violation = normalized_name.startswith("no_")

            detection = {
                "class": class_name,
                "confidence": round(confidence, 3),
                "is_violation": is_violation,
                "box": [
                    round(float(x), 2)
                    for x in box.xyxy[0].tolist()
                ]
            }

            detections.append(detection)

            if is_violation:
                violations.append(detection)

    return {
        "success": True,
        "total_detections": len(detections),
        "detections": detections,
        "violations": violations,
        "violation_count": len(violations),
        "status": (
            "PPE Violation Detected"
            if violations
            else "No PPE Violation Detected"
        )
    }