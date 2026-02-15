"""
OpenCV-based Gait Analysis Microservice
Uses MediaPipe Pose + custom gait parameter extraction
"""

# Dormant: service disabled — never run
raise RuntimeError("OpenCV Gait Analysis Service is disabled (dormant).")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cv2
import numpy as np
import mediapipe as mp
import base64
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import math

app = FastAPI(title="OpenCV Gait Analysis Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MediaPipe initialization
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=True,
    model_complexity=2,
    enable_segmentation=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)


# ---------------------------------------------------------------------------
# Data Models
# ---------------------------------------------------------------------------

class GaitAnalysisRequest(BaseModel):
    frames: List[str]  # base64 encoded images
    timestamps: List[float]
    duration: float


class KeypointData(BaseModel):
    x: float
    y: float
    confidence: float


class FrameKeypointData(BaseModel):
    frame_number: int
    timestamp: float
    keypoints: Dict[str, KeypointData]


class GaitParameters(BaseModel):
    stride_length_left: float
    stride_length_right: float
    step_width: float
    cadence: float
    velocity: float
    double_support_time: float


class Observations(BaseModel):
    asymmetry: Optional[str]
    pelvic_tilt: Optional[str]
    knee_hyperextension: Optional[str]
    foot_drop: Optional[str]
    shortened_stride: Optional[str]
    circumduction: Optional[str]
    trunk_lean: Optional[str]
    arm_swing: Optional[str]


class GaitAnalysisResponse(BaseModel):
    gait_type: str
    confidence: float
    observations: Observations
    keypoint_data: List[FrameKeypointData]
    gait_parameters: GaitParameters


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

def base64_to_image(base64_str: str) -> np.ndarray:
    """Convert base64 string to OpenCV image"""
    img_data = base64.b64decode(base64_str)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


def extract_pose_keypoints(image: np.ndarray) -> Optional[Dict[str, Tuple[float, float, float]]]:
    """Extract pose keypoints using MediaPipe"""
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = pose.process(image_rgb)
    
    if not results.pose_landmarks:
        return None
    
    h, w = image.shape[:2]
    keypoints = {}
    
    landmark_names = {
        0: "nose",
        11: "left_shoulder",
        12: "right_shoulder",
        23: "left_hip",
        24: "right_hip",
        25: "left_knee",
        26: "right_knee",
        27: "left_ankle",
        28: "right_ankle",
        31: "left_heel",
        32: "right_heel",
        29: "left_foot_index",
        30: "right_foot_index",
    }
    
    for idx, name in landmark_names.items():
        landmark = results.pose_landmarks.landmark[idx]
        keypoints[name] = (
            landmark.x * w,
            landmark.y * h,
            landmark.visibility
        )
    
    return keypoints


def calculate_angle(p1: Tuple[float, float], p2: Tuple[float, float], p3: Tuple[float, float]) -> float:
    """Calculate angle between three points"""
    v1 = np.array([p1[0] - p2[0], p1[1] - p2[1]])
    v2 = np.array([p3[0] - p2[0], p3[1] - p2[1]])
    
    cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
    angle = np.arccos(np.clip(cos_angle, -1.0, 1.0))
    return np.degrees(angle)


def calculate_distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """Calculate Euclidean distance between two points"""
    return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)


def detect_gait_phase(keypoints: Dict[str, Tuple[float, float, float]]) -> str:
    """Detect current gait phase (heel strike, stance, toe off, swing)"""
    left_heel_y = keypoints["left_heel"][1]
    right_heel_y = keypoints["right_heel"][1]
    left_toe_y = keypoints["left_foot_index"][1]
    right_toe_y = keypoints["right_foot_index"][1]
    
    # Simple heuristic based on vertical positions
    if left_heel_y > left_toe_y and right_heel_y < right_toe_y:
        return "left_heel_strike"
    elif right_heel_y > right_toe_y and left_heel_y < left_toe_y:
        return "right_heel_strike"
    elif left_toe_y > left_heel_y:
        return "left_toe_off"
    elif right_toe_y > right_heel_y:
        return "right_toe_off"
    return "stance"


# ---------------------------------------------------------------------------
# Gait Analysis Algorithm
# ---------------------------------------------------------------------------

def analyze_gait_patterns(
    keypoint_sequence: List[Dict[str, Tuple[float, float, float]]],
    timestamps: List[float]
) -> Tuple[str, float, Observations, GaitParameters]:
    """
    Main gait analysis algorithm
    Analyzes pose keypoint sequence and extracts gait parameters
    """
    
    if len(keypoint_sequence) < 4:
        raise ValueError("Need at least 4 frames for gait analysis")
    
    # Initialize tracking variables
    knee_angles_left = []
    knee_angles_right = []
    hip_heights = []
    ankle_clearances_left = []
    ankle_clearances_right = []
    step_widths = []
    stride_indicators = []
    
    # Analyze each frame
    for kp in keypoint_sequence:
        # Knee angles
        if all(k in kp for k in ["left_hip", "left_knee", "left_ankle"]):
            angle = calculate_angle(kp["left_hip"][:2], kp["left_knee"][:2], kp["left_ankle"][:2])
            knee_angles_left.append(angle)
        
        if all(k in kp for k in ["right_hip", "right_knee", "right_ankle"]):
            angle = calculate_angle(kp["right_hip"][:2], kp["right_knee"][:2], kp["right_ankle"][:2])
            knee_angles_right.append(angle)
        
        # Hip height (average of both hips)
        if "left_hip" in kp and "right_hip" in kp:
            avg_hip_y = (kp["left_hip"][1] + kp["right_hip"][1]) / 2
            hip_heights.append(avg_hip_y)
        
        # Ankle clearance (foot height during swing)
        if "left_ankle" in kp and "left_hip" in kp:
            clearance = kp["left_hip"][1] - kp["left_ankle"][1]
            ankle_clearances_left.append(clearance)
        
        if "right_ankle" in kp and "right_hip" in kp:
            clearance = kp["right_hip"][1] - kp["right_ankle"][1]
            ankle_clearances_right.append(clearance)
        
        # Step width
        if "left_ankle" in kp and "right_ankle" in kp:
            width = abs(kp["left_ankle"][0] - kp["right_ankle"][0])
            step_widths.append(width)
    
    # Calculate gait parameters
    avg_step_width = np.mean(step_widths) if step_widths else 0
    cadence = len(keypoint_sequence) / (timestamps[-1] - timestamps[0]) * 60  # steps per minute
    
    # Estimate stride length (simplified - would need calibration in production)
    stride_length_left = np.std(ankle_clearances_left) * 2 if ankle_clearances_left else 0
    stride_length_right = np.std(ankle_clearances_right) * 2 if ankle_clearances_right else 0
    
    velocity = (stride_length_left + stride_length_right) / 2 * cadence / 60
    
    # Analyze asymmetry
    left_knee_range = max(knee_angles_left) - min(knee_angles_left) if knee_angles_left else 0
    right_knee_range = max(knee_angles_right) - min(knee_angles_right) if knee_angles_right else 0
    asymmetry_ratio = abs(left_knee_range - right_knee_range) / max(left_knee_range, right_knee_range, 1)
    
    # Detect abnormalities
    observations = Observations(
        asymmetry="Noticeable left-right asymmetry detected" if asymmetry_ratio > 0.2 else None,
        pelvic_tilt="Excessive pelvic drop observed" if np.std(hip_heights) > 15 else None,
        knee_hyperextension="Knee hyperextension noted" if any(a > 185 for a in knee_angles_left + knee_angles_right) else None,
        foot_drop="Reduced ankle clearance on left side" if np.mean(ankle_clearances_left) < np.mean(ankle_clearances_right) * 0.8 else None,
        shortened_stride="Shortened stride length detected" if (stride_length_left + stride_length_right) / 2 < 50 else None,
        circumduction="Lateral hip movement pattern observed" if avg_step_width > 80 else None,
        trunk_lean=None,  # Would need shoulder tracking
        arm_swing=None    # Would need arm tracking
    )
    
    # Classify gait type based on observations
    gait_type = classify_gait_type(observations, asymmetry_ratio, knee_angles_left, knee_angles_right)
    
    # Calculate confidence based on keypoint visibility
    avg_confidence = np.mean([
        np.mean([kp[k][2] for k in kp.keys()])
        for kp in keypoint_sequence
    ])
    
    gait_parameters = GaitParameters(
        stride_length_left=float(stride_length_left),
        stride_length_right=float(stride_length_right),
        step_width=float(avg_step_width),
        cadence=float(cadence),
        velocity=float(velocity),
        double_support_time=0.15  # Placeholder - would need more sophisticated temporal analysis
    )
    
    return gait_type, float(avg_confidence), observations, gait_parameters


def classify_gait_type(
    obs: Observations,
    asymmetry_ratio: float,
    knee_angles_left: List[float],
    knee_angles_right: List[float]
) -> str:
    """Classify the type of gait abnormality"""
    
    # Check for specific patterns
    if obs.asymmetry and asymmetry_ratio > 0.3:
        return "hemiplegic_gait"
    
    if obs.foot_drop:
        return "steppage_gait"
    
    if obs.circumduction:
        return "circumduction_gait"
    
    if obs.knee_hyperextension:
        return "hyperextension_gait"
    
    if obs.shortened_stride and obs.pelvic_tilt:
        return "parkinsonian_gait"
    
    # Check for normal gait
    if not any([obs.asymmetry, obs.pelvic_tilt, obs.knee_hyperextension, 
                obs.foot_drop, obs.shortened_stride, obs.circumduction]):
        return "normal_gait"
    
    return "atypical_gait"


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.post("/analyze-gait", response_model=GaitAnalysisResponse)
async def analyze_gait(request: GaitAnalysisRequest):
    """
    Main endpoint for gait analysis
    Processes video frames and returns gait analysis
    """
    try:
        # Extract keypoints from all frames
        keypoint_sequence = []
        keypoint_data_response = []
        
        for idx, (frame_b64, timestamp) in enumerate(zip(request.frames, request.timestamps)):
            # Decode image
            image = base64_to_image(frame_b64)
            
            # Extract keypoints
            keypoints = extract_pose_keypoints(image)
            
            if keypoints is None:
                continue
            
            keypoint_sequence.append(keypoints)
            
            # Format for response
            frame_kp = FrameKeypointData(
                frame_number=idx,
                timestamp=timestamp,
                keypoints={
                    name: KeypointData(x=kp[0], y=kp[1], confidence=kp[2])
                    for name, kp in keypoints.items()
                }
            )
            keypoint_data_response.append(frame_kp)
        
        if len(keypoint_sequence) < 4:
            raise HTTPException(
                status_code=400,
                detail="Could not detect pose in enough frames. Please ensure person is fully visible."
            )
        
        # Analyze gait patterns
        gait_type, confidence, observations, gait_parameters = analyze_gait_patterns(
            keypoint_sequence,
            request.timestamps
        )
        
        return GaitAnalysisResponse(
            gait_type=gait_type,
            confidence=confidence,
            observations=observations,
            keypoint_data=keypoint_data_response,
            gait_parameters=gait_parameters
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "opencv-gait-analysis"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)