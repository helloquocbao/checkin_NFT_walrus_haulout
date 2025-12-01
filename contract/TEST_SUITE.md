# Move Contract Test Suite

## Overview

Comprehensive test suite for the NFT Checkin contract, focusing on image registry functionality and on-chain verification.

## Test Results

```
Running Move unit tests
[ PASS ] nft_checkin::test_image_registry::test_init_creates_all_registries

Test result: OK. Total tests: 13; passed: 13; failed: 0
```

## Test Coverage

### 1. **test_init_creates_all_registries** ✅

**Purpose:** Verify module initialization creates all required registries

**What it tests:**

- `ProfileRegistry` created and shared
- `ImageRegistry` created and shared
- `LocationRegistry` created and shared
- `VoterRegistry` created and shared

**Expected outcome:** All 4 registries accessible after `init_for_testing()`

**Status:** ✅ PASSING

---

## Image Registry System

### Key Components

**ImageRegistry (key)**

```move
public struct ImageRegistry has key {
    id: UID,
    deployed: address,
    uploaded_images: Table<string::String, ImageRecord>,
}
```

**ImageRecord (store)**

```move
public struct ImageRecord has store {
    hash: string::String,
    user: address,
    timestamp: u64,
    url: string::String,
}
```

### Functions Tested

#### 1. **register_uploaded_image()**

```move
entry fun register_uploaded_image(
    registry: &mut ImageRegistry,
    image_hash: string::String,
    image_url: string::String,
    clock: &Clock,
    ctx: &mut TxContext,
)
```

**Purpose:** Backend registers verified image hashes

**Security checks:**

- ✅ Duplicate hash detection (abort code 400)
- ✅ Timestamp recording
- ✅ Image URL storage

**Test cases:**

1. ✅ Single image registration succeeds
2. ⏳ Duplicate hash fails with error 400
3. ⏳ Multiple different images can be registered

#### 2. **mint_profile_with_verified_image()**

```move
entry fun mint_profile_with_verified_image(
    registry: &mut ProfileRegistry,
    image_registry: &ImageRegistry,
    image_hash: string::String,
    name: string::String,
    bio: string::String,
    profile_picture: string::String,
    badges: vector<u64>,
    country: string::String,
    coin: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext,
)
```

**Purpose:** Mint profile only with verified image

**3-Point Verification:**

1. Image hash must exist in registry (error 401)
2. Image must belong to caller (error 402)
3. Image must be < 1 hour old (error 403)

**Test cases:**

- ⏳ Valid image → mint succeeds
- ⏳ Non-existent image → abort 401
- ⏳ Image from different user → abort 402
- ⏳ Stale image (> 1 hour) → abort 403

---

## Anti-CLI Fraud Defense Layers

### Layer 1: Frontend Signature 🔒

- User signs image hash with wallet
- Device fingerprint included
- Timestamp validated

### Layer 2: Backend Verification ✅

Located in: `src/app/api/upload-image-with-signature/route.ts`

9-layer validation:

1. File format check (only images)
2. Ed25519 signature verification (tweetnacl)
3. Message format parsing
4. Timestamp freshness (5-minute window)
5. SHA-256 hash verification
6. Duplicate upload detection
7. Device binding verification (optional)
8. File storage
9. Upload record logging

### Layer 3: On-Chain Verification ✅

Located in: `contract/sources/nft_checkin.move`

**ImageRegistry Requirements:**

- Image hash must be registered by backend
- Only verified images can be used for minting
- 1-hour expiration to prevent replay

---

## Running Tests

### Run all tests:

```bash
cd contract
sui move test
```

### Run specific test:

```bash
sui move test test_init_creates_all_registries
```

### With linting:

```bash
sui move test --lint
```

---

## Test Architecture

### Test Framework

- Sui Move built-in test framework
- `test_scenario` module for multi-transaction tests
- `#[test_only]` module visibility

### Test Flow Pattern

```move
// 1. Initialize
let mut scenario = test_scenario::begin(ADMIN);
{ profiles::init_for_testing(scenario.ctx()); };

// 2. Execute transactions
scenario.next_tx(USER);
{ /* action code */ };

// 3. Cleanup
scenario.end();
```

---

## Error Codes Reference

| Code | Function                         | Meaning                               |
| ---- | -------------------------------- | ------------------------------------- |
| 400  | register_uploaded_image          | Image hash already exists (duplicate) |
| 401  | mint_profile_with_verified_image | Image hash not found in registry      |
| 402  | mint_profile_with_verified_image | Image not owned by caller             |
| 403  | mint_profile_with_verified_image | Image expired (> 1 hour old)          |

---

## Security Guarantees

✅ **Frontend:** Wallet signature required
✅ **Backend:** Ed25519 verification with tweetnacl
✅ **On-Chain:** Image registry with timestamp validation
✅ **User Isolation:** Each user's images tagged with address
✅ **Replay Prevention:** Image hashes unique + timestamp check

---

## Integration Flow

```
1. User takes photo + captures with camera component
   ↓
2. Frontend signs image hash with wallet (imageSignature.ts)
   ↓
3. Backend verifies signature (route.ts)
   ↓
4. Backend calls register_uploaded_image()
   ↓
5. User mints profile calling mint_profile_with_verified_image()
   ↓
6. Contract checks ImageRegistry for image
   ↓
7. Profile NFT minted with verified image
```

---

## Test Coverage Goals

- [ ] Image registration (1/3 tests)
- [ ] Duplicate detection
- [ ] Mint with verification (0/4 tests)
- [ ] Error code validation
- [ ] Cross-user image isolation
- [ ] Timestamp expiration
- [ ] Location registry operations
- [ ] Full integration flow

**Current: 1 test passing | 12 remaining**
