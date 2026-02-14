/**
 * Extracts evenly-spaced frames from a video at ~4 fps.
 * Returns individual frames as data URLs plus a debug grid preview.
 *
 * Runs client-side only (requires DOM APIs).
 */

const TARGET_FPS = 4;
const MIN_FRAMES = 12;
const MAX_FRAMES = 100; // Anthropic API limit is 100 images per request
const GRID_COLS = 6;

export interface VideoFrames {
  /** Individual frame data URLs at full resolution */
  frames: string[];
  /** Timestamp (in seconds) for each frame */
  timestamps: number[];
  /** Small grid preview for debug display only */
  gridPreview: string;
  /** Effective fps of extraction */
  fps: number;
  /** Video duration in seconds */
  duration: number;
}

/**
 * Extracts frames from a video at ~4 fps and returns them individually.
 */
export async function extractVideoFrames(file: File): Promise<VideoFrames> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = async () => {
      try {
        await waitForVideo(video);

        let duration = video.duration;
        if (!duration || !isFinite(duration)) {
          duration = await resolveDuration(video);
        }

        if (!duration || !isFinite(duration) || duration <= 0) {
          URL.revokeObjectURL(url);
          reject(new Error("Could not determine video duration"));
          return;
        }

        // Only use the first 15 seconds of any video
        const usableDuration = Math.min(duration, 15);

        // Dynamic frame count based on usable duration at ~4 fps
        const rawCount = Math.round(usableDuration * TARGET_FPS);
        const frameCount = Math.max(MIN_FRAMES, Math.min(MAX_FRAMES, rawCount));
        const fps = frameCount / usableDuration;

        // Calculate timestamps across the usable portion only
        const timestamps: number[] = [];
        for (let i = 0; i < frameCount; i++) {
          timestamps.push((i / frameCount) * usableDuration);
        }

        // Extract individual frames
        const frameCanvas = document.createElement("canvas");
        const frameCtx = frameCanvas.getContext("2d");
        if (!frameCtx) {
          URL.revokeObjectURL(url);
          reject(new Error("Could not create canvas context"));
          return;
        }

        const frames: string[] = [];
        const extractedTimestamps: number[] = [];
        let frameWidth = 0;
        let frameHeight = 0;

        for (let i = 0; i < timestamps.length; i++) {
          try {
            await seekTo(video, timestamps[i]);
            if (!frameWidth) {
              frameWidth = video.videoWidth;
              frameHeight = video.videoHeight;
              frameCanvas.width = frameWidth;
              frameCanvas.height = frameHeight;
            }
            frameCtx.drawImage(video, 0, 0, frameWidth, frameHeight);
            frames.push(frameCanvas.toDataURL("image/jpeg", 0.85));
            extractedTimestamps.push(timestamps[i]);
          } catch {
            // Skip frames that fail to extract
          }
        }

        URL.revokeObjectURL(url);

        if (frames.length < 4) {
          reject(new Error("Could not extract enough frames from video (need at least 4)"));
          return;
        }

        // Build a small grid preview for debug only
        const gridPreview = await buildGridPreview(frames, extractedTimestamps, frameWidth, frameHeight);

        resolve({
          frames,
          timestamps: extractedTimestamps,
          gridPreview,
          fps,
          duration: usableDuration,
        });
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video file"));
    };
  });
}

/**
 * Builds a small composite grid for debug preview only (not sent to VLM).
 */
async function buildGridPreview(
  frames: string[],
  timestamps: number[],
  frameWidth: number,
  frameHeight: number
): Promise<string> {
  const cols = GRID_COLS;
  const rows = Math.ceil(frames.length / cols);
  const thumbWidth = Math.min(frameWidth, 240);
  const thumbHeight = Math.round(thumbWidth * (frameHeight / frameWidth));

  const canvas = document.createElement("canvas");
  canvas.width = thumbWidth * cols;
  canvas.height = thumbHeight * rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < frames.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * thumbWidth;
    const y = row * thumbHeight;

    const img = await loadImage(frames[i]);
    ctx.drawImage(img, x, y, thumbWidth, thumbHeight);

    const label = `#${i + 1} ${timestamps[i].toFixed(2)}s`;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x, y, thumbWidth, 18);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px monospace";
    ctx.fillText(label, x + 4, y + 13);
  }

  return canvas.toDataURL("image/jpeg", 0.8);
}

function resolveDuration(video: HTMLVideoElement): Promise<number> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      const d = video.duration;
      video.currentTime = 0;
      video.addEventListener(
        "seeked",
        () => resolve(isFinite(d) ? d : 0),
        { once: true }
      );
    };
    const onError = () => {
      cleanup();
      reject(new Error("Failed to resolve video duration"));
    };
    const timeout = setTimeout(() => {
      cleanup();
      resolve(isFinite(video.duration) ? video.duration : 0);
    }, 8000);

    function cleanup() {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      clearTimeout(timeout);
    }

    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = 1e10;
  });
}

function waitForVideo(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    if (video.readyState >= 2) {
      resolve();
      return;
    }
    video.oncanplay = () => resolve();
  });
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    video.currentTime = time;

    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Failed to seek to ${time}s`));
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Seek timeout at ${time}s`));
    }, 5000);

    function cleanup() {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      clearTimeout(timeout);
    }

    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
