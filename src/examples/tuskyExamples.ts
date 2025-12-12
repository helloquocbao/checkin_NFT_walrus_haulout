/**
 * Example: How to use Tusky in your app
 * Basic usage examples without JSX
 */

import {
  uploadImageToTusky,
  getTuskyUrl,
  uploadImageDataToTusky,
  createPrivateVault,
  getUserAssets,
  getUserVaults,
  downloadFile,
  initTuskyClient,
} from "../utils/tuskyUpload";

// ============================================
// 1. Basic Image Upload
// ============================================
export async function basicImageUpload(file: File) {
  try {
    // Upload image to Tusky
    const result = await uploadImageToTusky(file);

    console.log("Upload successful!");
    console.log("Blob ID:", result.blobId);
    console.log("URL:", result.url);
    console.log("Metadata:", result.metadata);

    return result;
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
}

// ============================================
// 2. Private/Encrypted Upload
// ============================================
export async function privateImageUpload(file: File) {
  try {
    // Upload with encryption enabled
    const result = await uploadImageToTusky(file, {
      isPrivate: true,
      metadata: {
        description: "Private profile picture",
        uploadedBy: "user-address",
      },
    });

    console.log("Private upload successful!");
    console.log("Encrypted Blob ID:", result.blobId);

    return result;
  } catch (error) {
    console.error("Private upload failed:", error);
    throw error;
  }
}

// ============================================
// 3. Upload from Base64 or URL
// ============================================
export async function uploadFromDataUrl(imageDataUrl: string) {
  try {
    const result = await uploadImageDataToTusky(imageDataUrl, "my-image.png");

    console.log("Data URL upload successful!");
    console.log("URL:", result.url);

    return result;
  } catch (error) {
    console.error("Data URL upload failed:", error);
    throw error;
  }
}

// ============================================
// 4. Create Private Vault
// ============================================
export async function createUserVault(userName: string) {
  try {
    const vault = await createPrivateVault(
      `${userName}-memories`,
      `Private vault for ${userName}'s travel memories`
    );

    console.log("Vault created:", vault);

    return vault;
  } catch (error) {
    console.error("Vault creation failed:", error);
    throw error;
  }
}

// ============================================
// 5. List User's Assets
// ============================================
export async function listUserFiles() {
  try {
    const assets = await getUserAssets();

    console.log(`Found ${assets.length} assets:`, assets);

    return assets;
  } catch (error) {
    console.error("Failed to list assets:", error);
    return [];
  }
}

// ============================================
// 6. List User's Vaults
// ============================================
export async function listUserVaults() {
  try {
    const vaults = await getUserVaults();

    console.log(`Found ${vaults.length} vaults:`, vaults);

    return vaults;
  } catch (error) {
    console.error("Failed to list vaults:", error);
    return [];
  }
}

// ============================================
// 7. Download File
// ============================================
export async function downloadUserFile(uploadId: string) {
  try {
    const buffer = await downloadFile(uploadId);

    console.log("File downloaded:", buffer.byteLength, "bytes");

    return buffer;
  } catch (error) {
    console.error("Download failed:", error);
    throw error;
  }
}

// ============================================
// 8. Initialize Tusky with API Key
// ============================================
export async function initializeWithApiKey() {
  // If you have a Tusky API key, initialize like this:
  const apiKey = process.env.NEXT_PUBLIC_TUSKY_API_KEY;

  if (apiKey) {
    initTuskyClient(apiKey);
    console.log("Tusky initialized with API key");
  } else {
    // Initialize without API key (wallet auth)
    initTuskyClient();
    console.log("Tusky initialized - use wallet to authenticate");
  }
}

// ============================================
// 9. Usage in File Input Handler
// ============================================
export async function handleFileInputChange(
  event: React.ChangeEvent<HTMLInputElement>
) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    console.log("Uploading to Tusky...");

    // Upload to Tusky
    const result = await uploadImageToTusky(file, {
      isPrivate: false,
      metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    console.log("Upload successful:", result);

    return result;
  } catch (error) {
    console.error("Upload failed:", error);
    alert("Upload failed: " + (error as Error).message);
  }
}

// ============================================
// 10. Usage Example in API Route
// ============================================
export async function uploadFileFromAPI(formData: FormData) {
  try {
    const file = formData.get("file") as File;

    if (!file) {
      throw new Error("No file provided");
    }

    // Upload to Tusky
    const result = await uploadImageToTusky(file);

    return {
      success: true,
      ...result,
    };
  } catch (error) {
    console.error("API upload error:", error);
    throw error;
  }
}
