# 🔒 CLI Prevention - Practical Testing Guide

## Quick Start

### Setup Environment

```bash
# 1. Start dev server
npm run dev

# 2. Open browser
http://localhost:3000/[locale]/create

# 3. Open browser console (F12)
# Open terminal/PowerShell (separate window)
```

## ✅ Test 1: Normal User Flow (Should Work)

### Step 1: Browser - Take Photo

```bash
1. Navigate to http://localhost:3000/[locale]/create
2. Click "📷 Start Camera"
3. Allow camera permission
4. Click "📸 Capture"
5. See watermarked image preview
6. Input NFT name
7. Click "⬆️ Upload with Signature"
8. See watermark with timestamp + address
9. ✅ Image uploaded successfully
```

### Step 2: Check Backend Logs

```
[SUCCESS] Image uploaded by 0x123abc...xyz: /uploads/0x123abc.../a1b2c3d4e5f6.jpg
```

### Step 3: Verify File Saved

```bash
cd public/uploads
ls  # Should see: 0x123abc.../
cd 0x123abc.../
ls  # Should see: a1b2c3d4e5f6.jpg
```

**Expected Result**: ✅ All files created, NFT minted successfully

---

## ❌ Test 2: CLI Attack Without Signature (Should Fail)

### Attempt: Direct file upload via cURL

```bash
# Open PowerShell and try to upload without signature
curl -X POST http://localhost:3000/api/upload-image-with-signature `
  -F "file=@image.jpg" `
  -F "userAddress=0x1234567890abcdef" `
  -F "timestamp=1733100000"
# Missing: signature, publicKey, message

# Expected Response
# {
#   "error": "Missing signature or public key",
#   "status": 400
# }
```

**Result**: ❌ Request rejected - no signature provided

**Why it works**: Backend requires signature field and rejects if missing

---

## ❌ Test 3: CLI Attack With Fake Signature (Should Fail)

```bash
# Try to upload with forged signature
curl -X POST http://localhost:3000/api/upload-image-with-signature `
  -F "file=@image.jpg" `
  -F "signature=0xfakefakefakefakefakefakefakefakefakefake" `
  -F "publicKey=0xfakepublickeyhere" `
  -F "message=upload_image:fakehash:1733100000:0x1234567890abcdef" `
  -F "userAddress=0x1234567890abcdef"

# Expected Response
# {
#   "error": "Invalid signature",
#   "status": 401
# }
```

**Result**: ❌ Request rejected - signature doesn't match public key

**Why it works**: Backend verifies signature using Ed25519 verification

---

## ❌ Test 4: CLI With Stolen Real Signature (Should Still Fail)

```bash
# Scenario: Attacker intercepts real signature from browser
# Can they reuse it?

# First upload (real user, browser)
# Signature: 0x7f3c9a...
# Message: upload_image:abcd1234:1733100000:0xuser

# Attacker tries to reuse same signature immediately after
curl -X POST http://localhost:3000/api/upload-image-with-signature `
  -F "file=@different_image.jpg" `
  -F "signature=0x7f3c9a..." `
  -F "publicKey=0xuser_pubkey" `
  -F "message=upload_image:abcd1234:1733100000:0xuser"

# Expected Response
# {
#   "error": "File hash mismatch",
#   "status": 401
# }
```

**Result**: ❌ File hash in message doesn't match actual file

**Why it works**:

- Signature is bound to specific image hash
- Different image = different hash
- Hash validation fails

---

## ❌ Test 5: Timestamp Replay Attack (Should Fail)

```bash
# Scenario: Attacker waits > 5 minutes, tries to use old signature

# Original upload (5+ minutes ago)
# Message: upload_image:hash:1733099000:0xuser
# Current time: 1733100500 (> 5 min window)

curl -X POST http://localhost:3000/api/upload-image-with-signature `
  -F "file=@image.jpg" `
  -F "signature=0x7f3c9a..." `
  -F "publicKey=0xuser_pubkey" `
  -F "message=upload_image:hash:1733099000:0xuser" `
  -F "timestamp=1733099000"

# Expected Response
# {
#   "error": "Timestamp expired",
#   "status": 401
# }
```

**Result**: ❌ Timestamp validation fails (outside 5 min window)

**Why it works**: Each signature is time-locked to 5 minute window

---

## ❌ Test 6: Duplicate Image Upload (Should Fail Second Time)

```bash
# Upload same image first time - SUCCESS
curl -X POST http://localhost:3000/api/upload-image-with-signature `
  -F "file=@image.jpg" `
  -F "signature=0x7f3c9a..." `
  -F "publicKey=0xuser_pubkey" `
  -F "message=upload_image:abc123def456:1733100000:0xuser"

# Response: { "success": true, "imageUrl": "/uploads/..." }

# Try to upload same image again (new signature but same file)
curl -X POST http://localhost:3000/api/upload-image-with-signature `
  -F "file=@image.jpg" `  # Same file
  -F "signature=0xnewsig..." `  # Different signature
  -F "publicKey=0xuser_pubkey" `
  -F "message=upload_image:abc123def456:1733100100:0xuser"  # Different timestamp

# Expected Response
# {
#   "error": "This image has already been uploaded",
#   "status": 409
# }
```

**Result**: ❌ Hash is same, duplicate detection catches it

**Why it works**: Backend tracks all uploaded image hashes

---

## ⚠️ Test 7: Device Binding (Optional - With uploadImageWithDeviceBinding)

```bash
# Upload from Device A
# Device fingerprint: "Chrome/Windows/Intel"

# Try to upload from Device B (CLI on different machine)
# Device fingerprint: "Python/Linux/ARM"
# But message signed with Device A fingerprint

curl -X POST http://localhost:3000/api/upload-image-with-signature `
  -F "file=@image.jpg" `
  -F "signature=0x7f3c9a..." `  # Signed on Windows
  -F "deviceId=python_linux_arm" `  # But uploading from Linux
  -F "message=upload_image:hash:device_a_fingerprint:timestamp:user"

# Expected Response
# {
#   "error": "Device mismatch - upload from different device detected",
#   "status": 401
# }
```

**Result**: ❌ Device ID doesn't match signed message

**Why it works**: Device fingerprint is included in signed message

---

## 📊 Test Results Summary

| Test | Attack Vector    | Result  | Why It Works                   |
| ---- | ---------------- | ------- | ------------------------------ |
| 1    | Normal user      | ✅ Pass | Signature valid + hash matches |
| 2    | No signature     | ❌ Fail | Missing required field         |
| 3    | Fake signature   | ❌ Fail | Invalid Ed25519 signature      |
| 4    | Reuse signature  | ❌ Fail | Hash mismatch (different file) |
| 5    | Old signature    | ❌ Fail | Timestamp outside 5 min window |
| 6    | Duplicate upload | ❌ Fail | Same hash already uploaded     |
| 7    | Wrong device     | ❌ Fail | Device ID mismatch             |

---

## 🔧 Debug Mode

### Enable Detailed Logging

**Frontend** (`src/utils/imageSignature.ts`):

```typescript
// Already has console.log() - check browser console
console.log("Image hash:", imageHash);
console.log("Message to sign:", message);
console.log("Signature created:", signature);
```

**Backend** (`src/app/api/upload-image-with-signature/route.ts`):

```typescript
// Already has console logs - check terminal
console.log("Verifying signature:", { message, signature, publicKey });
console.warn("[SECURITY] Invalid signature from", userAddress);
console.log("[SUCCESS] Image uploaded by", userAddress, imageUrl);
```

### View Live Logs

**Terminal 1** - Dev Server:

```bash
npm run dev

# You'll see logs like:
# [SUCCESS] Image uploaded by 0x123abc: /uploads/0x123abc.../hash.jpg
# [SECURITY] Invalid signature from CLI_attempt
```

**Browser** - Console (F12):

```javascript
// Image hash: a1b2c3d4e5f6...
// Message to sign: upload_image:a1b2c3d4e5f6:1733100000:0x123abc...xyz
// Signature created: 0x7f3c9a...
```

---

## 🎯 Attack Scenarios Covered

### ✅ Scenario 1: Attacker Has User's Private Key

- **What happens**: Attacker CAN upload images (already compromised)
- **Mitigation**: User should rotate keys, enable 2FA on wallet
- **Note**: This is beyond app scope (wallet security responsibility)

### ✅ Scenario 2: Attacker Intercepts Network Request

- **What happens**: Can read signature, but can't modify it
- **Mitigation**: HTTPS enforced (replay still fails due to hash binding)
- **Note**: Hash bound to specific file, so can't replace image

### ✅ Scenario 3: Attacker Compromises Backend

- **What happens**: Can directly modify database/records
- **Mitigation**: Implement on-chain verification of image hash
- **Note**: Part of Phase 2 implementation

### ✅ Scenario 4: User's Browser Compromised

- **What happens**: Attacker can invoke uploadImageWithSignature()
- **Mitigation**: Device binding + rate limiting
- **Note**: Device fingerprint in signed message prevents other devices

### ✅ Scenario 5: DDoS Attack

- **What happens**: Flood server with upload requests
- **Mitigation**: Rate limiting + request throttling
- **Note**: Each request requires valid signature (expensive to forge)

---

## 🚨 Known Limitations

1. **Device Fingerprinting Can Be Spoofed**

   - Attacker on same device/browser can spoof fingerprint
   - Solution: Use additional verification (SMS, email confirmation)

2. **User Private Key Compromise**

   - If user's private key is exposed, all bets are off
   - This is wallet security responsibility, not app responsibility

3. **Rate Limiting Not Implemented Yet**

   - Backend can be flooded with valid signatures
   - Solution: Implement per-user/per-IP rate limiting

4. **No On-Chain Verification Yet**
   - Backend is single point of truth
   - Solution: Store image hashes on smart contract

---

## 📈 Production Checklist

Before deploying to mainnet:

- [ ] Test all 7 test cases above
- [ ] Enable HTTPS (non-negotiable)
- [ ] Implement rate limiting (max N uploads per user per hour)
- [ ] Add database persistence for upload records
- [ ] Implement on-chain image hash verification
- [ ] Add monitoring/alerting for suspicious patterns
- [ ] Set up audit logs for all uploads
- [ ] Test with real Sui mainnet wallets
- [ ] Security audit by third party
- [ ] Load testing (how many concurrent uploads?)
- [ ] Backup/disaster recovery plan

---

## 🔗 Related Files

- Frontend utility: `src/utils/imageSignature.ts`
- Backend API: `src/app/api/upload-image-with-signature/route.ts`
- Camera component: `src/components/CameraCapture.tsx`
- Create page (integrated): `src/app/[locale]/create/page.jsx`
- Documentation: `ANTI_CLI_FRAUD_GUIDE.md` (this file)

---

## 📞 Support

If tests fail:

1. **Check backend logs** - Terminal should show error details
2. **Check browser console** - F12 → Console tab
3. **Verify files exist** - Check if upload directory created
4. **Check timestamps** - Ensure system clock is accurate
5. **Verify wallet connected** - User account must be active

---

**Last Updated**: 2025-12-01
**Status**: Ready for Testing ✅
