/**
 * Walrus image upload utility
 */

const WALRUS_UPLOAD_URL =
  "https://publisher.walrus-testnet.walrus.space/v1/blobs";

export interface WalrusUploadResponse {
  newlyCreated?: {
    blobObject: {
      blobId: string;
    };
  };
  blobObject?: {
    blobId: string;
  };
}

/**
 * Upload image file to Walrus and return the blob ID
 * @param file - The image file to upload
 * @returns The Walrus blob ID
 */
export async function uploadImageToWalrus(file: File): Promise<string> {
  try {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw new Error("Please select a valid image file");
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error("Image size must be less than 10MB");
    }

    // Upload to Walrus
    const response = await fetch(WALRUS_UPLOAD_URL, {
      method: "PUT",
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const data: WalrusUploadResponse = await response.json();

    // Extract blob ID from response
    const blobId =
      data?.newlyCreated?.blobObject?.blobId || data?.blobObject?.blobId;

    if (!blobId) {
      throw new Error("No blob ID found in Walrus response");
    }

    return blobId;
  } catch (error) {
    console.error("Walrus upload error:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to upload image to Walrus");
  }
}

/**
 * Get the public URL for a Walrus blob
 * @param blobId - The Walrus blob ID
 * @returns The public URL to access the blob
 */
export function getWalrusUrl(blobId: string): string {
  return `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`;
}
