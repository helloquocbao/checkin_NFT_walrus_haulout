"use client";

import React, { useRef, useState } from "react";
import { uploadImageWithSignature } from "@/utils/imageSignature";
import { useCurrentAccount } from "@mysten/dapp-kit";

interface CameraCaptureProps {
  onImageCapture?: (imageUrl: string) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onImageCapture,
}) => {
  const account = useCurrentAccount();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  /**
   * Add watermark (timestamp + address) to canvas
   */
  const addWatermark = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Semi-transparent background
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, height - 50, width, 50);

    // Timestamp
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Arial";
    ctx.fillText(new Date().toLocaleString(), 10, height - 15);

    // Address (truncated)
    const displayAddress = account?.address
      ? `${account.address.slice(0, 8)}...${account.address.slice(-8)}`
      : "";
    ctx.fillText(displayAddress, width - 180, height - 15);
  };

  /**
   * Start camera
   */
  const startCamera = async () => {
    try {
      setUploadError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      setUploadError("Cannot access camera. Please allow camera permission.");
      console.error("Camera error:", error);
    }
  };

  /**
   * Stop camera
   */
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setIsStreaming(false);
    }
  };

  /**
   * Capture frame from video
   */
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    const video = videoRef.current;
    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;

    // Draw video frame
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    // Add watermark
    addWatermark(context, video.videoWidth, video.videoHeight);

    // Convert to blob
    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCapturedImage(url);
          stopCamera();
        }
      },
      "image/jpeg",
      0.95
    );
  };

  /**
   * Retake photo
   */
  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  /**
   * Upload image with signature
   */
  const handleUpload = async () => {
    if (!capturedImage || !canvasRef.current || !account?.address) {
      setUploadError("Image or address missing");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      canvasRef.current.toBlob(
        async (blob) => {
          if (!blob) {
            setUploadError("Failed to process image");
            return;
          }

          const result = await uploadImageWithSignature(
            blob,
            account.address,
            null
          );

          setUploadSuccess(true);
          if (onImageCapture) {
            onImageCapture(result.imageUrl);
          }

          // Reset after 2 seconds
          setTimeout(() => {
            setCapturedImage(null);
            setUploadSuccess(false);
          }, 2000);
        },
        "image/jpeg",
        0.95
      );
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {/* Camera View */}
      {!capturedImage && !isStreaming && (
        <div className="text-center">
          <button
            onClick={startCamera}
            disabled={isUploading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            📷 Start Camera
          </button>
        </div>
      )}

      {/* Video Stream */}
      {isStreaming && !capturedImage && (
        <div className="space-y-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg bg-black"
          />
          <div className="flex gap-4 justify-center">
            <button
              onClick={captureFrame}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              📸 Capture
            </button>
            <button
              onClick={stopCamera}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Captured Image Preview */}
      {capturedImage && (
        <div className="space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full rounded-lg border-2 border-gray-300"
          />

          {/* Error Message */}
          {uploadError && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              ⚠️ {uploadError}
            </div>
          )}

          {/* Success Message */}
          {uploadSuccess && (
            <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              ✅ Upload successful! Image saved with signature verification.
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center gap-2"
            >
              {isUploading ? "⏳ Uploading..." : "⬆️ Upload with Signature"}
            </button>
            <button
              onClick={retakePhoto}
              disabled={isUploading}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-400"
            >
              🔄 Retake
            </button>
          </div>

          {/* Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
            <p>
              <strong>🔒 Security:</strong> Your image được ký bằng private key
              từ ví của bạn.
            </p>
            <p>
              <strong>🚫 Anti-CLI:</strong> CLI không thể upload vì cần private
              key.
            </p>
            <p>
              <strong>📷 Watermark:</strong> Ảnh được watermark với timestamp +
              address.
            </p>
          </div>
        </div>
      )}

      {/* Hidden Canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
