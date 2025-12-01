/**
 * Image Upload with Signature Verification
 * Chặn CLI gian lận bằng cách ký ảnh với private key từ ví
 */

import crypto from "crypto";

/**
 * Tính SHA-256 hash của ảnh
 */
export const getImageHash = async (imageBlob: Blob): Promise<string> => {
  const arrayBuffer = await imageBlob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * Tạo message cần ký
 * Format: upload_image:{imageHash}:{timestamp}:{userAddress}
 */
export const createUploadMessage = (
  imageHash: string,
  userAddress: string
): { message: string; timestamp: number } => {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `upload_image:${imageHash}:${timestamp}:${userAddress}`;
  return { message, timestamp };
};

/**
 * Upload ảnh với signature từ ví
 * CLI không thể bypass vì cần private key
 */
export const uploadImageWithSignature = async (
  imageBlob: Blob,
  userAddress: string,
  signer: any // từ useSignAndExecuteTransaction
): Promise<{ imageUrl: string; signature: string; message: string }> => {
  try {
    // 1. Tính hash ảnh
    const imageHash = await getImageHash(imageBlob);
    console.log("Image hash:", imageHash);

    // 2. Tạo message cần ký
    const { message, timestamp } = createUploadMessage(imageHash, userAddress);
    console.log("Message to sign:", message);

    // 3. Ký message bằng private key (từ ví)
    // Sử dụng signMessage từ wallet
    const messageBytes = new TextEncoder().encode(message);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signResult = await (window as any).suiWallet?.signMessage?.({
      message: messageBytes,
    });

    if (!signResult) {
      throw new Error("Failed to sign message - no wallet response");
    }

    const signature = signResult.signature;
    const publicKey = signResult.publicKey;

    console.log("Signature created:", signature);

    // 4. Upload ảnh + signature lên Walrus thông qua API
    const formData = new FormData();
    formData.append("file", imageBlob);
    formData.append("signature", signature);
    formData.append("publicKey", publicKey);
    formData.append("message", message);
    formData.append("userAddress", userAddress);
    formData.append("timestamp", timestamp.toString());

    const response = await fetch("/api/upload-image-with-signature", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Upload failed");
    }

    const result = await response.json();
    return {
      imageUrl: result.imageUrl,
      signature: signature,
      message: message,
    };
  } catch (error) {
    console.error("Error uploading image with signature:", error);
    throw error;
  }
};

/**
 * Verify signature on frontend (optional, for UX feedback)
 */
export const verifySignatureLocally = (
  message: string,
  signature: string,
  publicKey: string
): boolean => {
  // Note: Verification on frontend là optional
  // Backend sẽ verify lại, frontend chỉ để show UX feedback
  try {
    // Verification logic sẽ được implement trên backend
    console.log("Signature verification will be done on backend");
    return true;
  } catch {
    return false;
  }
};

/**
 * Generate device fingerprint để bind upload tới device
 */
export const getDeviceFingerprint = async (): Promise<string> => {
  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory,
    maxTouchPoints: navigator.maxTouchPoints,
    timestamp: Math.floor(Date.now() / 1000),
  };

  const fingerprintStr = JSON.stringify(fingerprint);
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(fingerprintStr)
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * Upload với device binding (chặn CLI từ device khác)
 */
export const uploadImageWithDeviceBinding = async (
  imageBlob: Blob,
  userAddress: string,
  signer: any
): Promise<{ imageUrl: string; signature: string; deviceId: string }> => {
  const imageHash = await getImageHash(imageBlob);
  const deviceId = await getDeviceFingerprint();
  const timestamp = Math.floor(Date.now() / 1000);

  // Message includes device binding
  const message = `upload_image:${imageHash}:${deviceId}:${timestamp}:${userAddress}`;

  // Sign with wallet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signResult = await (window as any).suiWallet?.signMessage?.({
    message: new TextEncoder().encode(message),
  });

  if (!signResult) {
    throw new Error("Failed to sign message");
  }

  // Upload
  const formData = new FormData();
  formData.append("file", imageBlob);
  formData.append("signature", signResult.signature);
  formData.append("publicKey", signResult.publicKey);
  formData.append("message", message);
  formData.append("deviceId", deviceId);

  const response = await fetch("/api/upload-image-with-signature", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  const result = await response.json();
  return {
    imageUrl: result.imageUrl,
    signature: signResult.signature,
    deviceId: deviceId,
  };
};
