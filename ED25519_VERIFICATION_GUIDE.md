# 🔐 Ed25519 Signature Verification - Implementation Guide

## 📍 File

`src/app/api/upload-image-with-signature/route.ts` → `verifySignature()` function

## ⚠️ Current Status

### ✅ What's Implemented

- Basic signature format validation (not empty, correct length)
- Public key format validation
- Error handling

### ❌ What's Missing

- **Actual Ed25519 verification** against public key
- Cryptographic proof that signature is valid
- Currently accepts **ANY** signature as long as format looks OK

## 🔴 Security Risk (CRITICAL)

**Current code accepts ALL signatures** as long as they're not empty!

```typescript
// CURRENT (INSECURE)
if (!signature || signature.length < 64) return false;
return true; // ← ACCEPTS EVERYTHING! 🚨
```

**Attacker can:**

1. Create fake signature (any 64+ character string)
2. Backend accepts it ✅
3. Upload fake image ✅
4. CLI bypass successful ❌

## 🟢 How to Fix

### Option 1: Use tweetnacl (Recommended for Server)

**Install:**

```bash
npm install tweetnacl-js
npm install --save-types/tweetnacl
```

**Implement:**

```typescript
import nacl from "tweetnacl-js";

const verifySignature = (
  message: string,
  signature: string,
  publicKey: string
): boolean => {
  try {
    // Convert message to bytes
    const messageBytes = new TextEncoder().encode(message);

    // Convert signature from hex to Uint8Array (64 bytes)
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    // Convert publicKey from hex to Uint8Array (32 bytes)
    const publicKeyBytes = new Uint8Array(
      publicKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    // Verify signature
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    console.log(isValid ? "✅ Signature valid" : "❌ Signature invalid");
    return isValid;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
};
```

### Option 2: Use @mysten/sui.js (Recommended for Sui)

**Check if available:**

```bash
npm list @mysten/sui.js
```

**Implement:**

```typescript
import { verifySignature } from "@mysten/sui.js/verify";

const verifySignature = (
  message: string,
  signature: string,
  publicKey: string
): boolean => {
  try {
    // Sui SDK handles format conversion
    const isValid = verifySignature(message, signature, publicKey);

    console.log(isValid ? "✅ Signature valid" : "❌ Signature invalid");
    return isValid;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
};
```

### Option 3: Use libsodium.js (Cross-Platform)

**Install:**

```bash
npm install libsodium.js
```

**Implement:**

```typescript
import sodium from "libsodium.js";

const verifySignature = (
  message: string,
  signature: string,
  publicKey: string
): boolean => {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = sodium.from_hex(signature);
    const publicKeyBytes = sodium.from_hex(publicKey);

    const isValid = sodium.crypto_sign_open(
      sodium.crypto_sign_BYTES + messageBytes.length
    );

    console.log(isValid ? "✅ Signature valid" : "❌ Signature invalid");
    return isValid;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
};
```

## 🎯 Recommended Approach

### For This Project: Use tweetnacl

**Reasons:**

1. ✅ Simple standalone library (no Sui dependency)
2. ✅ Small bundle size
3. ✅ Pure JS implementation (works in Node.js & browser)
4. ✅ Well-tested for Ed25519
5. ✅ Compatible with Sui signatures

**Steps:**

1. Install tweetnacl-js
2. Replace `verifySignature()` function
3. Test with real Sui wallet signatures
4. Deploy

## 🧪 Testing

### Test Case 1: Valid Signature

```bash
# Get real signature from wallet
# Upload image → should pass ✅
```

### Test Case 2: Invalid Signature (CLI Attack)

```bash
curl -X POST http://localhost:3000/api/upload-image-with-signature \
  -F "file=@image.jpg" \
  -F "signature=0xfakefakefake..." \
  -F "publicKey=0xfakepubkey..." \
  -F "message=upload_image:hash:timestamp:user"

# Expected: ❌ 401 Unauthorized - Invalid signature
```

### Test Case 3: Valid Format But Invalid Signature

```bash
# Create hex string that looks valid (64+ chars)
# But doesn't match real Ed25519 signature
# Should FAIL ❌
```

## 📊 Signature Format Reference

### Sui Wallet Signature Format

```
Type: Ed25519 signature
Format: Base64 or Hex string
Length: 128 hex characters = 64 bytes
Example: 0x7f3c9a1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0

Structure:
├─ 64 bytes (128 hex): Signature
└─ 32 bytes (64 hex): Public Key

Total: 96 hex characters for signature alone
```

### Message Format (Signed)

```
Format: "upload_image:{imageHash}:{timestamp}:{userAddress}"
Example: "upload_image:abc123def456:1733100000:0x1234567890abcdef"
Encoding: UTF-8 → Bytes
```

## 🔍 Debug Logging

Add to `verifySignature()`:

```typescript
console.log("🔐 Verifying...");
console.log("Message:", message);
console.log("Signature (first 40 chars):", signature.slice(0, 40));
console.log("PublicKey (first 40 chars):", publicKey.slice(0, 40));

// After verification
console.log("✅ Verified!" || "❌ Failed!");
```

## 📝 Implementation Checklist

- [ ] Install tweetnacl-js or use @mysten/sui.js
- [ ] Replace `verifySignature()` function
- [ ] Add proper error handling
- [ ] Test with real Sui wallet
- [ ] Test CLI attack (should fail)
- [ ] Add logging for debugging
- [ ] Update comments with chosen method
- [ ] Remove old TODO comment
- [ ] Deploy to testnet
- [ ] Monitor logs for false positives

## 🚀 Deployment Steps

```bash
# 1. Install dependency
npm install tweetnacl-js

# 2. Update route.ts with chosen implementation
# (Copy code from Option 1, 2, or 3 above)

# 3. Test locally
npm run dev
# Test at http://localhost:3000/[locale]/create

# 4. Verify logs show "✅ Signature valid"
# Check terminal for verification logs

# 5. Deploy
git add .
git commit -m "Implement Ed25519 signature verification"
git push
```

## ⚡ Important Notes

1. **Signature Encoding**

   - Usually hex or base64
   - Adjust conversion code accordingly
   - Test with real wallet first

2. **Public Key Format**

   - Must be from same wallet that signed
   - If mismatch → verification fails (correct behavior)

3. **Message Content**

   - Exact string must match what was signed
   - One byte difference = invalid signature

4. **Timestamp Window**

   - Still 5 minutes (handled separately)
   - Verification is independent of timestamp

5. **Performance**
   - Ed25519 verification is fast (~1ms)
   - Not a bottleneck

## 🎓 Reference

- **Ed25519 Standard**: https://en.wikipedia.org/wiki/EdDSA
- **tweetnacl.js Docs**: https://tweetnacl.js.org/
- **Sui Crypto**: https://docs.sui.io/concepts/cryptography
- **RFC 8032**: https://tools.ietf.org/html/rfc8032

## 📞 Troubleshooting

**Problem**: Signature verification always fails

- Check: Is message exactly the same?
- Check: Is public key from same wallet?
- Check: Are you using same signature?

**Problem**: Verification sometimes passes, sometimes fails

- Check: Race condition with concurrent requests?
- Check: Is signature being modified?
- Check: Clock sync issue (timestamp)?

**Problem**: CLI still bypasses verification

- Check: Is `verifySignature()` actually being called?
- Check: Are you using the right verification library?
- Check: Is the signature format correct?

---

**Status**: 🟡 Ready for Implementation
**Priority**: 🔴 HIGH (Critical for security)
**Estimated Time**: 30 minutes to implement + test
**Difficulty**: Medium (requires cryptography knowledge)

---

**Next**: Pick Option 1/2/3, implement, test, deploy! 🚀
