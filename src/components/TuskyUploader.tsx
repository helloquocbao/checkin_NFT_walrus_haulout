"use client";

import React, { useState } from "react";
import { uploadImageToTusky } from "../utils/tuskyUpload";

/**
 * Example React Component for uploading images to Tusky
 * Usage: Import this component into your page
 */
export function TuskyImageUploader() {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError("");

      // Upload to Tusky
      const result = await uploadImageToTusky(file, {
        isPrivate: false,
        metadata: {
          uploadedAt: new Date().toISOString(),
        },
      });

      setImageUrl(result.url);
      console.log("Upload successful:", result);
    } catch (error) {
      console.error("Upload failed:", error);
      setError((error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Upload to Tusky</h2>

      <label className="block">
        <span className="sr-only">Choose image</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={uploading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-purple-50 file:text-purple-700
            hover:file:bg-purple-100
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </label>

      {uploading && (
        <p className="mt-4 text-sm text-gray-600">
          Uploading to Tusky decentralized storage...
        </p>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600 font-semibold">
          Error: {error}
        </p>
      )}

      {imageUrl && (
        <div className="mt-4">
          <p className="text-sm text-green-600 font-semibold mb-2">
            ✓ Upload successful!
          </p>
          <img
            src={imageUrl}
            alt="Uploaded"
            className="max-w-full rounded-lg shadow"
          />
          <p className="text-xs text-gray-500 mt-2 break-all">{imageUrl}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Example: Private Upload Component
 */
export function TuskyPrivateUploader() {
  const [uploading, setUploading] = useState(false);
  const [uploadId, setUploadId] = useState("");
  const [error, setError] = useState("");

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError("");

      // Upload to Tusky with encryption
      const result = await uploadImageToTusky(file, {
        isPrivate: true,
        metadata: {
          uploadedAt: new Date().toISOString(),
          description: "Private encrypted file",
        },
      });

      setUploadId(result.blobId);
      console.log("Private upload successful:", result);
    } catch (error) {
      console.error("Upload failed:", error);
      setError((error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-lg max-w-md">
      <h2 className="text-2xl font-bold mb-2 text-gray-900">
        🔒 Private Upload
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Files are encrypted end-to-end before upload
      </p>

      <label className="block">
        <span className="sr-only">Choose image</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={uploading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-purple-500 file:text-white
            hover:file:bg-purple-600
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </label>

      {uploading && (
        <p className="mt-4 text-sm text-purple-600">
          Encrypting and uploading...
        </p>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600 font-semibold">
          Error: {error}
        </p>
      )}

      {uploadId && (
        <div className="mt-4 p-4 bg-white rounded-lg">
          <p className="text-sm text-green-600 font-semibold mb-2">
            ✓ Encrypted upload successful!
          </p>
          <p className="text-xs text-gray-500">Upload ID:</p>
          <p className="text-xs text-gray-700 font-mono break-all mt-1">
            {uploadId}
          </p>
        </div>
      )}
    </div>
  );
}
