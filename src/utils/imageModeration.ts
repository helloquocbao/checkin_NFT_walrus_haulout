/**
 * Image Moderation Utility using NSFW.js
 * Detects inappropriate content in images before upload
 */

import * as nsfwjs from "nsfwjs";

// Singleton model instance
let model: nsfwjs.NSFWJS | null = null;

/**
 * Load the NSFW.js model
 * This should be called once when the app loads
 */
export async function loadNSFWModel(): Promise<nsfwjs.NSFWJS> {
  if (model) {
    return model;
  }

  try {
    // Load the model from CDN (default)
    // This will load from https://nsfwjs.com/model/
    model = await nsfwjs.load();
    console.log("✅ NSFW model loaded successfully");
    return model;
  } catch (error) {
    console.error("❌ Failed to load NSFW model:", error);
    throw new Error("Failed to load content moderation model");
  }
}

/**
 * Check if an image contains inappropriate content
 * @param imageElement - Image element or Blob to check
 * @param strictnessLevel - Strictness level (1-10). Higher = stricter. Default = 5
 * @returns Object with isSafe flag and predictions
 */
export async function checkImageSafety(
  imageSource: HTMLImageElement | Blob | File,
  strictnessLevel: number = 5
): Promise<{
  isSafe: boolean;
  predictions: nsfwjs.PredictionType[];
  reason?: string;
  scores: {
    neutral: number;
    drawing: number;
    hentai: number;
    porn: number;
    sexy: number;
  };
}> {
  try {
    // Validate strictness level (1-10)
    if (strictnessLevel < 1 || strictnessLevel > 10) {
      throw new Error("Strictness level must be between 1 and 10");
    }

    // Convert strictness level (1-10) to threshold (0.1-1.0)
    // Level 1 (lowest) → threshold 1.0 (allow almost everything)
    // Level 10 (highest) → threshold 0.1 (very strict)
    const threshold = (11 - strictnessLevel) * 0.1;

    // Load model if not already loaded
    const nsfwModel = model || (await loadNSFWModel());
    console.log("✅ Model ready");

    let imageElement: HTMLImageElement;

    // Convert Blob/File to Image element
    if (imageSource instanceof Blob || imageSource instanceof File) {
      console.log("🖼️ Converting blob to image...");
      imageElement = await blobToImage(imageSource);
    } else {
      imageElement = imageSource;
    }

    // Get predictions
    console.log("🔄 Classifying image...");
    const predictions = await nsfwModel.classify(imageElement);
    console.log("✅ Classification complete:", predictions);

    // Convert predictions array to object for easier access
    const scores = predictions.reduce(
      (acc, pred) => {
        // Convert className to lowercase to match object keys
        const key = pred.className.toLowerCase() as keyof typeof acc;
        acc[key] = pred.probability;
        return acc;
      },
      { neutral: 0, drawing: 0, hentai: 0, porn: 0, sexy: 0 }
    );

    // Check if image is safe based on threshold
    const pornScore = scores.porn;
    const hentaiScore = scores.hentai;
    const sexyScore = scores.sexy;

    // Log scores for debugging
    console.log("🔍 Image Analysis Results:", {
      strictnessLevel,
      threshold,
      scores: {
        porn: `${(pornScore * 100).toFixed(2)}%`,
        hentai: `${(hentaiScore * 100).toFixed(2)}%`,
        sexy: `${(sexyScore * 100).toFixed(2)}%`,
        neutral: `${(scores.neutral * 100).toFixed(2)}%`,
        drawing: `${(scores.drawing * 100).toFixed(2)}%`,
      },
    });

    // Dynamic sexy threshold based on strictness level
    // Higher strictness = lower sexy threshold (more blocking)
    let sexyThreshold: number;
    if (strictnessLevel >= 10) {
      sexyThreshold = 0.25; // Very strict - block most bikini/sexy content
    } else if (strictnessLevel >= 9) {
      sexyThreshold = 0.3; // Block bikini and revealing clothes
    } else if (strictnessLevel >= 8) {
      sexyThreshold = 0.35;
    } else if (strictnessLevel >= 7) {
      sexyThreshold = 0.4;
    } else if (strictnessLevel >= 5) {
      sexyThreshold = 0.5;
    } else {
      sexyThreshold = 0.7; // Lenient - only block very explicit sexy content
    }

    // Image is unsafe if:
    // - Porn or Hentai score > threshold
    // - Sexy score > dynamic threshold
    const isUnsafe =
      pornScore > threshold ||
      hentaiScore > threshold ||
      sexyScore > sexyThreshold;

    console.log("🎯 Check Results:", {
      sexyThreshold,
      isUnsafe,
      reasons: {
        porn: pornScore > threshold,
        hentai: hentaiScore > threshold,
        sexy: sexyScore > sexyThreshold,
      },
    });

    let reason: string | undefined;
    if (isUnsafe) {
      if (pornScore > threshold) {
        reason = "Image contains explicit adult content";
      } else if (hentaiScore > threshold) {
        reason = "Image contains inappropriate animated content";
      } else if (sexyScore > sexyThreshold) {
        reason = "Image contains sexually suggestive content";
      }
    }

    return {
      isSafe: !isUnsafe,
      predictions,
      reason,
      scores,
    };
  } catch (error) {
    console.error("Error checking image safety:", error);
    // In case of error, allow the image (fail-open approach)
    // You can change this to fail-closed (block on error) if needed
    return {
      isSafe: true,
      predictions: [],
      scores: { neutral: 1, drawing: 0, hentai: 0, porn: 0, sexy: 0 },
    };
  }
}

/**
 * Convert Blob/File to HTMLImageElement
 */
function blobToImage(blob: Blob | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      // IMPORTANT: Don't revoke until after classification
      // URL.revokeObjectURL(url);
      console.log("✅ Image loaded for moderation:", {
        width: img.width,
        height: img.height,
      });
      resolve(img);
    };

    img.onerror = (error) => {
      URL.revokeObjectURL(url);
      console.error("❌ Failed to load image:", error);
      reject(new Error("Failed to load image for moderation"));
    };

    img.src = url;
    // Enable CORS if needed
    img.crossOrigin = "anonymous";
  });
}

/**
 * Preload the NSFW model in the background
 * Call this when your app initializes to speed up first check
 */
export function preloadNSFWModel(): void {
  loadNSFWModel().catch((error) => {
    console.warn("Failed to preload NSFW model:", error);
  });
}

/**
 * Get a user-friendly message based on safety check result
 */
export function getSafetyMessage(result: {
  isSafe: boolean;
  reason?: string;
  scores: any;
}): string {
  if (result.isSafe) {
    return "✅ Image is appropriate for upload";
  }

  return `⚠️ ${
    result.reason || "Image may contain inappropriate content"
  }. Please choose a different photo.`;
}
