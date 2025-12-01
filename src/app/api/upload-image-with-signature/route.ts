import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { extname } from "path";
import fs from "fs";
import path from "path";
import nacl from "tweetnacl";

// Store uploaded image hashes để chặn duplicate
const uploadedHashes = new Map<
  string,
  { timestamp: number; userAddress: string }
>();

/**
 * Verify Ed25519 signature using tweetnacl
 *
 * Ensures that:
 * 1. Signature was created by holder of private key
 * 2. Message hasn't been tampered with
 * 3. Public key matches private key
 */
const verifySignature = (
  message: string,
  signature: string,
  publicKey: string
): boolean => {
  try {
    console.log("🔐 Verifying Ed25519 signature with tweetnacl...");

    // Validate format
    if (!signature || signature.length < 64) {
      console.warn("❌ Signature too short (must be at least 64 characters)");
      return false;
    }

    if (!publicKey || publicKey.length < 32) {
      console.warn("❌ Public key too short (must be at least 32 characters)");
      return false;
    }

    if (!message || message.length === 0) {
      console.warn("❌ Message is empty");
      return false;
    }

    // Helper: Convert hex string to Uint8Array
    const hexToUint8Array = (hex: string): Uint8Array => {
      const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
      const bytes = new Uint8Array(cleanHex.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
      }
      return bytes;
    };

    // Convert inputs to Uint8Array
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = hexToUint8Array(signature);
    const publicKeyBytes = hexToUint8Array(publicKey);

    console.log("📊 Input sizes:", {
      messageLength: messageBytes.length,
      signatureLength: signatureBytes.length,
      publicKeyLength: publicKeyBytes.length,
    });

    // Verify signature using Ed25519
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (isValid) {
      console.log("✅ Signature VALID - User proved ownership of private key");
    } else {
      console.warn(
        "❌ Signature INVALID - Signature doesn't match message & key"
      );
    }

    return isValid;
  } catch (error) {
    console.error("❌ Signature verification error:", error);
    console.error("   Error details:", {
      messageLength: message?.length,
      signatureLength: signature?.length,
      publicKeyLength: publicKey?.length,
    });
    return false;
  }
};

/**
 * Validate timestamp (5 minute window)
 */
const isTimestampValid = (timestamp: number): boolean => {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const diff = currentTimestamp - timestamp;
  return diff >= 0 && diff <= 300; // 5 minutes
};

/**
 * Parse message và extract data
 */
const parseUploadMessage = (
  message: string
): {
  imageHash: string;
  timestamp: number;
  userAddress: string;
  deviceId?: string;
} | null => {
  const parts = message.split(":");

  if (parts.length === 4) {
    // Format: upload_image:{imageHash}:{timestamp}:{userAddress}
    return {
      imageHash: parts[1],
      timestamp: parseInt(parts[2], 10),
      userAddress: parts[3],
    };
  }

  if (parts.length === 5) {
    // Format: upload_image:{imageHash}:{deviceId}:{timestamp}:{userAddress}
    return {
      imageHash: parts[1],
      deviceId: parts[2],
      timestamp: parseInt(parts[3], 10),
      userAddress: parts[4],
    };
  }

  return null;
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const signature = formData.get("signature") as string;
    const publicKey = formData.get("publicKey") as string;
    const message = formData.get("message") as string;
    const userAddress = formData.get("userAddress") as string;
    const deviceId = formData.get("deviceId") as string;

    // ===== VALIDATION =====

    // 1. Check file exists
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 2. Check signature exists
    if (!signature || !publicKey || !message) {
      return NextResponse.json(
        { error: "Missing signature or public key" },
        { status: 400 }
      );
    }

    // 3. Verify signature
    const isValidSignature = verifySignature(message, signature, publicKey);
    if (!isValidSignature) {
      console.warn(`[SECURITY] Invalid signature from ${userAddress}`);
      return NextResponse.json(
        {
          error: "Invalid signature",
          hint: "Signature verification failed. Please ensure you're using the correct private key.",
        },
        { status: 401 }
      );
    }

    // 4. Parse message
    const parsedMessage = parseUploadMessage(message);
    if (!parsedMessage) {
      return NextResponse.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }

    // 5. Validate timestamp
    if (!isTimestampValid(parsedMessage.timestamp)) {
      console.warn(`[SECURITY] Expired timestamp from ${userAddress}`);
      return NextResponse.json({ error: "Timestamp expired" }, { status: 401 });
    }

    // 6. Calculate file hash
    const buffer = await file.arrayBuffer();
    const fileHash = createHash("sha256")
      .update(Buffer.from(buffer))
      .digest("hex");

    // 7. Verify file hash matches message hash
    if (fileHash !== parsedMessage.imageHash) {
      console.warn(`[SECURITY] File hash mismatch for ${userAddress}`);
      return NextResponse.json(
        { error: "File hash mismatch" },
        { status: 401 }
      );
    }

    // 8. Check duplicate upload (chặn upload cùng ảnh nhiều lần)
    if (uploadedHashes.has(fileHash)) {
      const existing = uploadedHashes.get(fileHash)!;
      if (existing.userAddress === userAddress) {
        console.warn(`[SECURITY] Duplicate upload attempt from ${userAddress}`);
        return NextResponse.json(
          { error: "This image has already been uploaded" },
          { status: 409 }
        );
      }
    }

    // 9. Device binding check (nếu có)
    if (
      deviceId &&
      parsedMessage.deviceId &&
      deviceId !== parsedMessage.deviceId
    ) {
      console.warn(
        `[SECURITY] Device mismatch: expected ${parsedMessage.deviceId}, got ${deviceId} for ${userAddress}`
      );
      return NextResponse.json(
        { error: "Device mismatch - upload from different device detected" },
        { status: 401 }
      );
    }

    // ===== UPLOAD =====

    // Save file locally (hoặc upload lên Walrus)
    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      userAddress
    );
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `${fileHash}${extname(file.name)}`;
    const filePath = path.join(uploadsDir, fileName);
    const fileStream = fs.createWriteStream(filePath);

    const reader = (file as Blob).stream().getReader();
    let done = false;

    while (!done) {
      const { done: streamDone, value } = await reader.read();
      done = streamDone;
      if (value) {
        fileStream.write(Buffer.from(value));
      }
    }

    await new Promise((resolve, reject) => {
      fileStream.end(() => resolve(true));
      fileStream.on("error", reject);
    });

    // Record upload
    uploadedHashes.set(fileHash, {
      timestamp: parsedMessage.timestamp,
      userAddress,
    });

    const imageUrl = `/uploads/${userAddress}/${fileName}`;

    console.log(`[SUCCESS] Image uploaded by ${userAddress}: ${imageUrl}`);

    return NextResponse.json(
      {
        success: true,
        imageUrl,
        fileHash,
        signature,
        message: "Image uploaded successfully with signature verification",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
