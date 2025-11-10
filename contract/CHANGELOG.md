# Changelog - Contract Updates

## Version 2.0 - Memory NFT System 🗺️ (Latest)

### 🎨 New Module: `memory_nft.move`

Complete check-in NFT system with location-based memories that can be traded.

**MemoryNFT Structure:**

```move
public struct MemoryNFT has key, store {
    id: UID,
    name: String,           // Tên memory
    content: String,        // Nội dung mô tả
    image_url: String,      // Link ảnh check-in
    latitude: String,       // Vĩ độ GPS
    longitude: String,      // Kinh độ GPS
    creator: address,       // Người tạo
    created_at: u64,        // Timestamp
    rarity: u8,            // 🎲 0=Common, 1=Rare, 2=Epic, 3=Legendary
    perfection: u64,       // 🎯 250-1000
}
```

**Features:**

- ✅ Mint Memory NFT khi check-in tại địa điểm (0.03 SUI)
- ✅ Random rarity & perfection (giống Badge gacha system)
- ✅ Fully tradable với key+store abilities
- ✅ Lưu trữ GPS coordinates (latitude, longitude)
- ❌ Removed: Like system (keep it simple)

**Rarity Distribution:**

- Common (0): 60% chance
- Rare (1): 25% chance
- Epic (2): 12% chance
- Legendary (3): 3% chance

**Perfection Range:** 250-1000 (random)

### 🏪 New Module: `memory_marketplace.move`

Complete marketplace for trading Memory NFTs using Sui Kiosk pattern.

**Features:**

- ✅ List Memory NFT to Kiosk
- ✅ Buy Memory NFT (direct transfer hoặc to buyer's kiosk)
- ✅ Delist Memory NFT
- ✅ Creator royalty system (2.5% default, configurable up to 10%)
- ✅ Transfer Policy integration

**Key Functions:**

```move
// List memory for sale
entry fun list_memory(
    registry: &mut MemoryMarketplaceRegistry,
    kiosk: &mut Kiosk,
    cap: &KioskOwnerCap,
    memory: MemoryNFT,
    price: u64,
    clock: &Clock,
    ctx: &mut TxContext,
)

// Buy and transfer directly
entry fun buy_memory_direct(
    registry: &MemoryMarketplaceRegistry,
    listing: MemoryListing,
    seller_kiosk: &mut Kiosk,
    policy: &TransferPolicy<MemoryNFT>,
    payment: Coin<SUI>,
    ctx: &mut TxContext,
)

// Buy to buyer's kiosk
entry fun buy_memory(
    registry: &MemoryMarketplaceRegistry,
    listing: MemoryListing,
    seller_kiosk: &mut Kiosk,
    buyer_kiosk: &mut Kiosk,
    buyer_cap: &KioskOwnerCap,
    policy: &TransferPolicy<MemoryNFT>,
    payment: Coin<SUI>,
    ctx: &mut TxContext,
)

// Delist memory
entry fun delist_memory(
    listing: MemoryListing,
    kiosk: &mut Kiosk,
    cap: &KioskOwnerCap,
    ctx: &TxContext,
)
```

**View Functions:**

```move
public fun total_listings(registry: &MemoryMarketplaceRegistry): u64
public fun royalty_bps(registry: &MemoryMarketplaceRegistry): u64
public fun listing_price(listing: &MemoryListing): u64
public fun listing_seller(listing: &MemoryListing): address
public fun listing_memory_id(listing: &MemoryListing): ID

// Memory NFT getters
public fun memory_name(memory: &MemoryNFT): String
public fun memory_content(memory: &MemoryNFT): String
public fun memory_image_url(memory: &MemoryNFT): String
public fun memory_latitude(memory: &MemoryNFT): String
public fun memory_longitude(memory: &MemoryNFT): String
public fun memory_creator(memory: &MemoryNFT): address
public fun memory_created_at(memory: &MemoryNFT): u64
public fun memory_rarity(memory: &MemoryNFT): u8
public fun memory_perfection(memory: &MemoryNFT): u64
```

### 📊 Updated Fee Structure

| Action              | Fee (SUI) | Fee (MIST)     | Recipient    | Module         |
| ------------------- | --------- | -------------- | ------------ | -------------- |
| Mint Profile        | 0.01      | 10_000_000     | Deployer     | profiles       |
| Claim Badge (Gacha) | 0.01      | 10_000_000     | Deployer     | profiles       |
| Update Profile      | 0.05      | 50_000_000     | Deployer     | profiles       |
| Vote for Profile    | 0.02      | 20_000_000     | Deployer     | profiles       |
| Claim Verification  | 0.02      | 20_000_000     | Deployer     | profiles       |
| **Mint Memory NFT** | **0.03**  | **30_000_000** | **Deployer** | **memory_nft** |

### 🧪 Test Coverage

- **Total Tests:** 46 (all passing ✅)
- **Memory NFT Tests:** 4 tests
- **Memory Marketplace Tests:** 8 tests
- **Profile & Badge Tests:** 34 tests

---

## Version 1.5 - Profile & Verification System

## 🆕 New Features Added

### 1. **Profile Update Function** ✅

- **Function:** `update_profile()`
- **Fee:** 0.05 SUI (50_000_000 MIST)
- **Description:** Users can update their profile information
- **Updatable fields:**
  - `name` - Display name
  - `bio` - Profile biography
  - `avatar_url` - Avatar image URL
  - `social_links` - Social media links vector
- **Restrictions:** Only profile owner can update

**Usage:**

```move
entry fun update_profile(
    registry: &ProfileRegistry,
    profile: &mut ProfileNFT,
    new_name: string::String,
    new_bio: string::String,
    new_avatar_url: string::String,
    new_social_links: vector<string::String>,
    payment: Coin<SUI>,  // Must be >= 0.05 SUI
    ctx: &mut TxContext,
)
```

### 2. **Verification Fees** ✅

Updated verification system to require payment:

#### Vote for Profile

- **Function:** `vote_for_profile()`
- **Fee:** 0.02 SUI (20_000_000 MIST)
- **Changes:** Added `registry` and `payment` parameters

**Updated signature:**

```move
entry fun vote_for_profile(
    registry: &ProfileRegistry,        // NEW
    voter_registry: &mut VoterRegistry,
    target_profile: &mut ProfileNFT,
    payment: Coin<SUI>,                // NEW - Must be >= 0.02 SUI
    ctx: &mut TxContext,
)
```

#### Claim Verification

- **Function:** `claim_verification()`
- **Fee:** 0.02 SUI (20_000_000 MIST)
- **Changes:** Added `payment` parameter

**Updated signature:**

```move
entry fun claim_verification(
    registry: &ProfileRegistry,
    profile: &mut ProfileNFT,
    payment: Coin<SUI>,  // NEW - Must be >= 0.02 SUI
    ctx: &mut TxContext,
)
```

## 💰 Fee Summary

| Action                 | Fee (SUI) | Fee (MIST)     | Recipient    |
| ---------------------- | --------- | -------------- | ------------ |
| Mint Profile           | 0.01      | 10_000_000     | Deployer     |
| Claim Badge (Gacha)    | 0.01      | 10_000_000     | Deployer     |
| **Update Profile**     | **0.05**  | **50_000_000** | **Deployer** |
| **Vote for Profile**   | **0.02**  | **20_000_000** | **Deployer** |
| **Claim Verification** | **0.02**  | **20_000_000** | **Deployer** |

## 🔄 Migration Guide for Frontend

### Memory NFT Features

#### Mint Memory NFT

```typescript
const tx = new TransactionBlock();
const payment = tx.splitCoins(tx.gas, [tx.pure(30_000_000)]); // 0.03 SUI

tx.moveCall({
  target: `${PACKAGE_ID}::memory_nft::mint_memory`,
  arguments: [
    tx.object(MEMORY_REGISTRY_ID),
    tx.pure(name), // String
    tx.pure(content), // String
    tx.pure(imageUrl), // String
    tx.pure(latitude), // String (e.g., "10.762622")
    tx.pure(longitude), // String (e.g., "106.660172")
    payment,
    tx.object(CLOCK_ID),
  ],
});
```

#### List Memory NFT

```typescript
const tx = new TransactionBlock();

tx.moveCall({
  target: `${PACKAGE_ID}::memory_marketplace::list_memory`,
  arguments: [
    tx.object(MEMORY_MARKETPLACE_REGISTRY_ID),
    tx.object(kioskId),
    tx.object(kioskCapId),
    tx.object(memoryNftId),
    tx.pure(price), // u64 in MIST
    tx.object(CLOCK_ID),
  ],
});
```

#### Buy Memory NFT (Direct)

```typescript
const tx = new TransactionBlock();
const payment = tx.splitCoins(tx.gas, [tx.pure(price)]);

tx.moveCall({
  target: `${PACKAGE_ID}::memory_marketplace::buy_memory_direct`,
  arguments: [
    tx.object(MEMORY_MARKETPLACE_REGISTRY_ID),
    tx.object(listingId),
    tx.object(sellerKioskId),
    tx.object(MEMORY_TRANSFER_POLICY_ID),
    payment,
  ],
});
```

#### Query Memory NFT Data

```typescript
// Get all memories by creator
const memories = await provider.getOwnedObjects({
  owner: creatorAddress,
  filter: {
    StructType: `${PACKAGE_ID}::memory_nft::MemoryNFT`,
  },
  options: {
    showContent: true,
    showType: true,
  },
});

// Parse memory data
memories.data.forEach((obj) => {
  const fields = obj.data.content.fields;
  console.log({
    name: fields.name,
    latitude: fields.latitude,
    longitude: fields.longitude,
    rarity: fields.rarity, // 0-3
    perfection: fields.perfection, // 250-1000
    creator: fields.creator,
  });
});
```

### Update Profile Feature

```typescript
// New: Update profile
const tx = new TransactionBlock();
const payment = tx.splitCoins(tx.gas, [tx.pure(50_000_000)]); // 0.05 SUI

tx.moveCall({
  target: `${PACKAGE_ID}::profiles::update_profile`,
  arguments: [
    tx.object(PROFILE_REGISTRY_ID),
    tx.object(profileObjectId),
    tx.pure(newName),
    tx.pure(newBio),
    tx.pure(newAvatarUrl),
    tx.pure(newSocialLinks), // vector<string>
    payment,
  ],
});
```

### Updated Vote Function

```typescript
// OLD (no longer works):
tx.moveCall({
  target: `${PACKAGE_ID}::profiles::vote_for_profile`,
  arguments: [tx.object(VOTER_REGISTRY_ID), tx.object(targetProfileId)],
});

// NEW (with payment):
const payment = tx.splitCoins(tx.gas, [tx.pure(20_000_000)]); // 0.02 SUI

tx.moveCall({
  target: `${PACKAGE_ID}::profiles::vote_for_profile`,
  arguments: [
    tx.object(PROFILE_REGISTRY_ID), // NEW
    tx.object(VOTER_REGISTRY_ID),
    tx.object(targetProfileId),
    payment, // NEW
  ],
});
```

### Updated Claim Verification

```typescript
// OLD (no longer works):
tx.moveCall({
  target: `${PACKAGE_ID}::profiles::claim_verification`,
  arguments: [tx.object(PROFILE_REGISTRY_ID), tx.object(profileObjectId)],
});

// NEW (with payment):
const payment = tx.splitCoins(tx.gas, [tx.pure(20_000_000)]); // 0.02 SUI

tx.moveCall({
  target: `${PACKAGE_ID}::profiles::claim_verification`,
  arguments: [
    tx.object(PROFILE_REGISTRY_ID),
    tx.object(profileObjectId),
    payment, // NEW
  ],
});
```

## ⚠️ Breaking Changes

**All existing frontend code using the following functions MUST be updated:**

- ❌ `vote_for_profile()` - Now requires `registry` and `payment`
- ❌ `claim_verification()` - Now requires `payment`

## ✅ Error Codes

| Code  | Description                    |
| ----- | ------------------------------ |
| `1`   | Not profile owner              |
| `10`  | Insufficient payment           |
| `300` | Cannot vote for yourself       |
| `301` | Already voted for this profile |
| `302` | Max 2 votes per user           |
| `303` | Already verified               |
| `304` | Not enough votes to verify     |

## 🏗️ Architecture Overview

### Module Structure

```
nft_checkin/
├── profiles (nft_checkin.move)
│   ├── ProfileNFT
│   ├── Badge (dynamic field)
│   └── Verification system
│
├── badge_marketplace
│   ├── TradableBadge (wrapped Badge)
│   └── Kiosk integration
│
├── memory_nft
│   ├── MemoryNFT (check-in NFT)
│   └── Random stats (rarity + perfection)
│
└── memory_marketplace
    ├── MemoryListing
    └── Royalty system
```

### Data Flow

1. **Profile Creation**: User mints ProfileNFT (0.01 SUI)
2. **Badge Collection**: User claims badges at locations (gacha, 0.01 SUI)
3. **Badge Trading**: Epic/Legendary badges → TradableBadge → Kiosk
4. **Memory Check-in**: User mints MemoryNFT at location (0.03 SUI, random stats)
5. **Memory Trading**: List MemoryNFT in Kiosk with royalty

### Key Design Patterns

- **Dynamic Fields**: Badges stored as dynamic fields in ProfileNFT
- **NFT Wrapping**: Badge → TradableBadge for trading
- **Kiosk Pattern**: Standard Sui marketplace pattern
- **Transfer Policy**: Royalty enforcement for Memory NFTs
- **Gacha System**: Deterministic randomness using tx digest

## 📝 Test Coverage

Update test constants:

```move
const MINT_FEE: u64 = 10_000_000;   // 0.01 SUI
const CLAIM_FEE: u64 = 10_000_000;  // 0.01 SUI
const UPDATE_FEE: u64 = 50_000_000; // 0.05 SUI
const VERIFY_FEE: u64 = 20_000_000; // 0.02 SUI
const MEMORY_MINT_FEE: u64 = 30_000_000; // 0.03 SUI
```

**Test Results:**

```bash
Test result: OK. Total tests: 46; passed: 46; failed: 0
```

### Test Breakdown

- **Memory NFT Tests**: 4 tests
  - Mint success
  - Mint insufficient fee
  - Multiple users mint
  - View functions
- **Memory Marketplace Tests**: 8 tests
  - List memory
  - Buy memory direct
  - Verify listing data
  - Delist memory
  - Single user multiple listings
  - Royalty calculation
  - Update royalty (non-admin fails)
  - Listing view functions
- **Profile & Badge Tests**: 34 tests
  - Complete flows (profile, badge, verification)
  - Error handling
  - Marketplace integration

## 📦 Deployment Checklist

### Initial Deployment

1. ✅ Deploy `nft_checkin` package (4 modules)
2. ✅ Get Package ID from output
3. ✅ Record shared object IDs:
   - ProfileRegistry
   - VoterRegistry
   - LocationRegistry
   - MarketplaceRegistry (badges)
   - MemoryRegistry ⭐ NEW
   - MemoryMarketplaceRegistry ⭐ NEW
   - TransferPolicy<MemoryNFT> ⭐ NEW
4. ✅ Update frontend config with IDs

### Required Object IDs

```typescript
// Save these after deployment
const CONFIG = {
  PACKAGE_ID: "0x...",
  PROFILE_REGISTRY_ID: "0x...",
  VOTER_REGISTRY_ID: "0x...",
  LOCATION_REGISTRY_ID: "0x...",
  BADGE_MARKETPLACE_REGISTRY_ID: "0x...",
  MEMORY_REGISTRY_ID: "0x...", // ⭐ NEW
  MEMORY_MARKETPLACE_REGISTRY_ID: "0x...", // ⭐ NEW
  MEMORY_TRANSFER_POLICY_ID: "0x...", // ⭐ NEW
  CLOCK_ID: "0x6", // Sui Clock (mainnet/testnet)
};
```

## 📚 Documentation

### Source Files

- `sources/nft_checkin.move` - Profile, badge, verification (608 lines)
- `sources/badge_marketplace.move` - Badge trading (436 lines)
- `sources/memory_nft.move` - Check-in NFT system (193 lines) ⭐ NEW
- `sources/memory_marketplace.move` - Memory trading (314 lines) ⭐ NEW
- `sources/utils/random.move` - Gacha randomness (30 lines)

### Test Files

- `tests/complete_flow_tests.move` - Main test suite (659 lines)
- `tests/nft_checkin_tests.move` - Unit tests (851 lines)
- `tests/memory_nft_tests.move` - Memory NFT tests (240 lines) ⭐ NEW
- `tests/memory_marketplace_tests.move` - Marketplace tests (420 lines) ⭐ NEW

**Total: ~3,751 lines of Move code** 3. Pass payment to function 4. Return shared registry

Example:

```move
let registry = ts::take_shared<ProfileRegistry>(&scenario);
let payment = coin::mint_for_testing<SUI>(VERIFY_FEE, ts::ctx(&mut scenario));
profiles::vote_for_profile(&registry, &mut voter_registry, &mut profile, payment, ts::ctx(&mut scenario));
ts::return_shared(registry);
```

## 🚀 Deployment Notes

After deploying updated contract:

1. ✅ Update frontend with new function signatures
2. ✅ Update fee constants in UI
3. ✅ Test all payment flows
4. ✅ Update documentation/help text
5. ✅ Notify users of new features and fees
