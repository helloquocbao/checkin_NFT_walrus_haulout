/**
 * Tusky storage integration utility
 * Using Tusky decentralized storage with Walrus backend
 */

import { Tusky } from "@tusky-io/ts-sdk/web";

// Initialize Tusky client
// Note: You can use either wallet authentication or API key
let tuskyClient: Tusky | null = null;
let currentVaultId: string | null = null;
let isAuthenticated: boolean = false;

/**
 * Initialize Tusky client
 * @param apiKey - Optional API key for authentication (or use wallet)
 */
export function initTuskyClient(apiKey?: string): Tusky {
  if (!tuskyClient) {
    if (apiKey) {
      // Initialize with API key
      tuskyClient = new Tusky({
        apiKey,
      });
      // API key automatically authenticates
      isAuthenticated = true;
    } else {
      // Initialize with default configuration
      // Users can authenticate via wallet in the app
      tuskyClient = new Tusky({});
      isAuthenticated = false;
    }
  }
  return tuskyClient;
}

/**
 * Get Tusky client instance
 */
export function getTuskyClient(): Tusky {
  if (!tuskyClient) {
    return initTuskyClient();
  }
  return tuskyClient;
}

/**
 * Ensure Tusky is authenticated before operations
 * This function checks if authentication is needed and provides helpful error messages
 */
async function ensureAuthenticated(): Promise<void> {
  const client = getTuskyClient();

  // Check if already authenticated
  if (isAuthenticated) {
    return;
  }

  // Try to authenticate with API key from environment
  const apiKey =
    typeof window !== "undefined"
      ? (window as any).TUSKY_API_KEY || process.env.NEXT_PUBLIC_TUSKY_API_KEY
      : process.env.NEXT_PUBLIC_TUSKY_API_KEY;

  if (apiKey) {
    // Re-initialize with API key
    tuskyClient = new Tusky({ apiKey });
    isAuthenticated = true;
    return;
  }

  // If no API key, throw helpful error
  throw new Error(
    "Tusky authentication required. Please set NEXT_PUBLIC_TUSKY_API_KEY in your .env.local file. " +
      "Get your API key from https://app.tusky.io/account/api-keys"
  );
}

/**
 * Get or create default vault for uploads
 */
async function getOrCreateVault(encrypted: boolean = false): Promise<string> {
  if (currentVaultId) {
    return currentVaultId;
  }

  await ensureAuthenticated();
  const client = getTuskyClient();

  try {
    // Try to list existing vaults
    const vaults = await client.vault.listAll();

    if (vaults && vaults.length > 0) {
      // Use the first vault
      currentVaultId = vaults[0].id;
      return currentVaultId;
    }
  } catch (error) {
    console.log("No existing vaults, creating new one");
  }

  // Create new vault if none exists
  const vault = await client.vault.create("My Files", { encrypted });
  currentVaultId = vault.id;
  return currentVaultId;
}

export interface TuskyUploadResponse {
  blobId: string;
  url: string;
  metadata?: {
    name: string;
    size: number;
    type: string;
  };
}

/**
 * Upload image file to Tusky/Walrus and return the blob information
 * @param file - The image file to upload
 * @param options - Optional upload options
 * @returns Upload response with blob ID and URL
 */
export async function uploadImageToTusky(
  file: File,
  options?: {
    isPrivate?: boolean;
    metadata?: Record<string, any>;
  }
): Promise<TuskyUploadResponse> {
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

    // Ensure authenticated before upload
    await ensureAuthenticated();

    const client = getTuskyClient();

    // Get or create vault
    const vaultId = await getOrCreateVault(options?.isPrivate || false);

    // Upload file to Tusky vault
    const uploadId = await client.file.upload(vaultId, file);
    console.log("uploadId:", uploadId);

    // Get file metadata including blob ID
    // Note: blobId might be "unknown" initially as it's computed asynchronously
    let fileMetadata = await client.file.get(uploadId);
    console.log("Initial fileMetadata:", fileMetadata);

    // Wait and retry if blobId is unknown (max 3 attempts, 2 seconds each)
    let blobId = fileMetadata.blobId;
    let attempts = 0;
    const maxAttempts = 3;

    while (blobId === "unknown" && attempts < maxAttempts) {
      console.log(
        `Waiting for blob ID... (attempt ${attempts + 1}/${maxAttempts})`
      );
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      const updatedMetadata = await client.file.get(uploadId);
      blobId = updatedMetadata.blobId;
      attempts++;
    }

    console.log("Final blobId:", blobId);

    // Construct URL from blob ID or use uploadId as fallback
    const url =
      blobId && blobId !== "unknown"
        ? getTuskyUrl(blobId)
        : getTuskyUrl(uploadId);

    return {
      blobId: blobId !== "unknown" ? blobId : uploadId,
      url: url,
      metadata: {
        name: file.name,
        size: file.size,
        type: file.type,
      },
    };
  } catch (error) {
    console.error("Tusky upload error:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to upload image to Tusky");
  }
}

/**
 * Get the public URL for a Tusky/Walrus blob
 * @param blobId - The blob ID
 * @returns The public URL to access the blob
 */
export function getTuskyUrl(blobId: string): string {
  // Tusky uses Walrus backend for storage
  return `https://walrus.tusky.io/${blobId}`;
}

/**
 * Upload image from base64 or URL to Tusky
 * @param imageData - Base64 string or URL
 * @param fileName - Optional file name
 * @returns Upload response with blob ID and URL
 */
export async function uploadImageDataToTusky(
  imageData: string,
  fileName?: string
): Promise<TuskyUploadResponse> {
  try {
    let blob: Blob;

    if (imageData.startsWith("data:")) {
      // Convert base64 to blob
      const base64Data = imageData.split(",")[1];
      const mimeType = imageData.match(/data:([^;]+);/)?.[1] || "image/png";
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: mimeType });
    } else if (imageData.startsWith("http")) {
      // Fetch from URL
      const response = await fetch(imageData);
      blob = await response.blob();
    } else {
      throw new Error("Invalid image data format");
    }

    // Create file from blob
    const file = new File([blob], fileName || "image.png", {
      type: blob.type,
    });

    return await uploadImageToTusky(file);
  } catch (error) {
    console.error("Tusky upload from data error:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to upload image data to Tusky");
  }
}

/**
 * Create a private vault for storing encrypted data
 * @param name - Vault name
 * @param description - Vault description (not used in current API)
 * @returns Vault information
 */
export async function createPrivateVault(
  name: string,
  description?: string
): Promise<any> {
  try {
    await ensureAuthenticated();
    const client = getTuskyClient();

    // Create a new private vault
    const vault = await client.vault.create(name, { encrypted: true });

    return vault;
  } catch (error) {
    console.error("Create vault error:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to create private vault");
  }
}

/**
 * Get user's files/assets from Tusky
 * @returns List of user's files
 */
export async function getUserAssets(): Promise<any[]> {
  try {
    await ensureAuthenticated();
    const client = getTuskyClient();

    const files = await client.file.listAll();

    return files || [];
  } catch (error) {
    console.error("Get user assets error:", error);
    return [];
  }
}

/**
 * Get user's vaults from Tusky
 * @returns List of user's vaults
 */
export async function getUserVaults(): Promise<any[]> {
  try {
    await ensureAuthenticated();
    const client = getTuskyClient();

    const vaults = await client.vault.listAll();

    return vaults || [];
  } catch (error) {
    console.error("Get user vaults error:", error);
    return [];
  }
}

/**
 * Download file as ArrayBuffer
 * @param uploadId - The Tusky upload ID
 * @returns File buffer
 */
export async function downloadFile(uploadId: string): Promise<ArrayBuffer> {
  try {
    await ensureAuthenticated();
    const client = getTuskyClient();

    const buffer = await client.file.arrayBuffer(uploadId);

    return buffer;
  } catch (error) {
    console.error("Download file error:", error);
    throw error instanceof Error ? error : new Error("Failed to download file");
  }
}
