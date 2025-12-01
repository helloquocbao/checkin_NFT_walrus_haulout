# 🔐 Ed25519 Implementation - Ready-to-Copy Code

## 📍 File to Update

`src/app/api/upload-image-with-signature/route.ts`

## ⚠️ Current Status

- ✅ Format validation implemented
- ❌ **Actual Ed25519 verification NOT implemented**
- ⏳ Ready for next step

## 🚀 Option A: Use tweetnacl-js (Recommended - Easiest)

### Step 1: Install

```bash
npm install tweetnacl-js
npm install -D @types/tweetnacl-js
```

### Step 2: Copy This Code

Replace the entire `verifySignature()` function with:

```typescript
import nacl from "tweetnacl-js";

/**
 * Verify Ed25519 signature using tweetnacl
 *
 * This uses tweetnacl.js which implements Ed25519
 * and is compatible with Sui wallet signatures
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
      console.warn("❌ Signature too short");
      return false;
    }

    if (!publicKey || publicKey.length < 32) {
      console.warn("❌ Public key too short");
      return false;
    }

    if (!message || message.length === 0) {
      console.warn("❌ Message is empty");
      return false;
    }

    // Convert hex string to Uint8Array
    const hexToUint8Array = (hex: string): Uint8Array => {
      // Handle both '0x' prefix and without
      const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
      const bytes = new Uint8Array(cleanHex.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
      }
      return bytes;
    };

    // Parse inputs
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = hexToUint8Array(signature);
    const publicKeyBytes = hexToUint8Array(publicKey);

    console.log("Message bytes:", messageBytes.length);
    console.log("Signature bytes:", signatureBytes.length);
    console.log("PublicKey bytes:", publicKeyBytes.length);

    // Verify using tweetnacl
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
    console.error("   Message:", message.slice(0, 50));
    console.error("   Signature:", signature.slice(0, 50));
    console.error("   PublicKey:", publicKey.slice(0, 50));
    return false;
  }
};
```

### Step 3: Add Import at Top

```typescript
import nacl from "tweetnacl-js";
```

---

## 🚀 Option B: Use @mysten/sui (If You Want Sui-Native)

### Step 1: Already Installed

```bash
# @mysten/sui is already in package.json
npm list @mysten/sui
```

### Step 2: Copy This Code

```typescript
import { verifySignature as suiVerifySignature } from "@mysten/sui/verify";

/**
 * Verify Ed25519 signature using @mysten/sui
 *
 * This uses Sui's native verification which handles
 * Sui-specific signature formats and encoding
 */
const verifySignature = (
  message: string,
  signature: string,
  publicKey: string
): boolean => {
  try {
    console.log("🔐 Verifying Ed25519 signature with @mysten/sui...");

    // Validate format
    if (!signature || signature.length === 0) {
      console.warn("❌ Signature is empty");
      return false;
    }

    if (!publicKey || publicKey.length === 0) {
      console.warn("❌ Public key is empty");
      return false;
    }

    if (!message || message.length === 0) {
      console.warn("❌ Message is empty");
      return false;
    }

    try {
      // Sui SDK handles format conversion and verification
      const isValid = suiVerifySignature(message, signature, publicKey);

      if (isValid) {
        console.log("✅ Signature VALID - Verified with Sui SDK");
      } else {
        console.warn("❌ Signature INVALID - Sui verification failed");
      }

      return isValid;
    } catch (innerError) {
      console.warn("⚠️  Sui verification threw error:", innerError);
      return false;
    }
  } catch (error) {
    console.error("❌ Signature verification error:", error);
    return false;
  }
};
```

### Step 3: Add Import at Top

```typescript
import { verifySignature as suiVerifySignature } from "@mysten/sui/verify";
```

---

## 📋 Side-by-Side Comparison

| Feature            | tweetnacl-js                   | @mysten/sui               |
| ------------------ | ------------------------------ | ------------------------- |
| Installation       | `npm install tweetnacl-js`     | Already installed         |
| Setup Time         | 5 min                          | 2 min                     |
| Compatibility      | Generic Ed25519                | Sui-specific              |
| Error Messages     | Clear                          | Sometimes cryptic         |
| Bundle Size        | Small                          | Larger (already included) |
| Maintenance        | Well-maintained                | Sui team maintains        |
| **Recommendation** | ✅ **Better for this project** | Good if Sui-native needed |

---

## 🔧 Implementation Steps

### Step 1: Choose Option (A or B)

- **A = tweetnacl** (recommended)
- **B = @mysten/sui**

### Step 2: Install (if needed)

```bash
# For Option A only
npm install tweetnacl-js

# Option B: already installed
```

### Step 3: Update route.ts

1. Open `src/app/api/upload-image-with-signature/route.ts`
2. Find the `verifySignature()` function (line ~8)
3. Replace entire function with code from Option A or B above
4. Add import statement at top

### Step 4: Test

**Test 1: Local Development**

```bash
npm run dev
# Navigate to /[locale]/create
# Take photo and upload
# Check terminal for verification logs
```

**Test 2: CLI Attack**

```bash
curl -X POST http://localhost:3000/api/upload-image-with-signature \
  -F "file=@image.jpg" \
  -F "signature=0xfakefakefakefake" \
  -F "publicKey=0xfakepublickey" \
  -F "message=upload_image:hash:timestamp:user"

# Expected: ❌ 401 Unauthorized - Signature INVALID
```

### Step 5: Verify Logs

Check terminal output:

```
✅ Signature VALID - means real user uploaded
❌ Signature INVALID - means CLI attack prevented
```

---

## 🧪 Test Cases

### ✅ Test 1: Real User Upload

```
1. Open /create
2. Capture photo
3. Click "Upload with Signature"
4. Allow wallet to sign
5. Upload succeeds ✅

Expected Logs:
✅ Signature VALID
```

### ❌ Test 2: CLI Fake Signature

```
curl -X POST ... -F "signature=0xfake..."

Expected Result: 401 Unauthorized
Expected Logs:
❌ Signature INVALID
```

### ❌ Test 3: Modified Message

```
Real signature: sign("upload_image:abc123:1733100000:0x123")
Modified message: "upload_image:abc123:1733100001:0x123" (timestamp changed)

Expected Result: 401 Unauthorized
```

---

## 🚨 Common Errors

### Error: "Cannot find module 'tweetnacl-js'"

**Solution**: Did you run `npm install tweetnacl-js`?

### Error: "Signature INVALID" for real user

**Solution**:

- Check message format is exactly: `"upload_image:{hash}:{timestamp}:{address}"`
- Check signature encoding (hex vs base64)
- Check public key is from same wallet

### Error: "hexToUint8Array is not a function"

**Solution**: Make sure you copied the entire function including helper functions

---

## 📝 Next Steps

1. ✅ Choose Option A or B
2. ✅ Install dependency (if needed)
3. ✅ Copy code
4. ✅ Test locally
5. ✅ Deploy to staging
6. ✅ Monitor logs
7. ✅ Deploy to production

---

## 🔍 Debugging

### Enable Debug Logs

The code already has detailed console.log() statements:

```typescript
console.log("🔐 Verifying Ed25519 signature...");
console.log("Message bytes:", messageBytes.length);
console.log("✅ Signature VALID");
console.log("❌ Signature INVALID");
```

### Check Logs

```bash
# Terminal 1: Dev server
npm run dev

# You'll see:
# 🔐 Verifying Ed25519 signature with tweetnacl...
# ✅ Signature VALID - User proved ownership of private key
```

### Verify Locally

```typescript
// In Node.js console (for testing)
const nacl = require("tweetnacl-js");

const message = "upload_image:abc123:1733100000:0x123";
const messageBytes = new TextEncoder().encode(message);

// This would verify the signature
const isValid = nacl.sign.detached.verify(
  messageBytes,
  signatureBytes,
  publicKeyBytes
);
```

---

## ✅ Success Criteria

After implementation:

- [ ] Real user uploads work ✅
- [ ] CLI attacks fail ❌
- [ ] Logs show verification status
- [ ] No false positives
- [ ] No false negatives

---

## 🎓 What This Does

1. **Takes** message + signature + publicKey
2. **Converts** from hex to Uint8Array
3. **Verifies** using Ed25519 algorithm that:
   - Signature was created by holder of private key
   - Message hasn't been modified
   - Public key matches private key
4. **Returns** true/false

**Result**:

- ✅ Real users: signature valid → upload succeeds
- ❌ CLI attackers: fake signature → upload fails

---

**Ready to implement?**

- Option A (tweetnacl): Copy code, run `npm install tweetnacl-js`, done!
- Option B (@mysten/sui): Copy code, no install needed!

Let me know which option you want and I'll help with integration! 🚀
