# Changelog - Contract Updates

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

| Action | Fee (SUI) | Fee (MIST) | Recipient |
|--------|-----------|------------|-----------|
| Mint Profile | 0.01 | 10_000_000 | Deployer |
| Claim Badge (Gacha) | 0.01 | 10_000_000 | Deployer |
| **Update Profile** | **0.05** | **50_000_000** | **Deployer** |
| **Vote for Profile** | **0.02** | **20_000_000** | **Deployer** |
| **Claim Verification** | **0.02** | **20_000_000** | **Deployer** |

## 🔄 Migration Guide for Frontend

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
  arguments: [
    tx.object(VOTER_REGISTRY_ID),
    tx.object(targetProfileId),
  ],
});

// NEW (with payment):
const payment = tx.splitCoins(tx.gas, [tx.pure(20_000_000)]); // 0.02 SUI

tx.moveCall({
  target: `${PACKAGE_ID}::profiles::vote_for_profile`,
  arguments: [
    tx.object(PROFILE_REGISTRY_ID),  // NEW
    tx.object(VOTER_REGISTRY_ID),
    tx.object(targetProfileId),
    payment,  // NEW
  ],
});
```

### Updated Claim Verification
```typescript
// OLD (no longer works):
tx.moveCall({
  target: `${PACKAGE_ID}::profiles::claim_verification`,
  arguments: [
    tx.object(PROFILE_REGISTRY_ID),
    tx.object(profileObjectId),
  ],
});

// NEW (with payment):
const payment = tx.splitCoins(tx.gas, [tx.pure(20_000_000)]); // 0.02 SUI

tx.moveCall({
  target: `${PACKAGE_ID}::profiles::claim_verification`,
  arguments: [
    tx.object(PROFILE_REGISTRY_ID),
    tx.object(profileObjectId),
    payment,  // NEW
  ],
});
```

## ⚠️ Breaking Changes

**All existing frontend code using the following functions MUST be updated:**
- ❌ `vote_for_profile()` - Now requires `registry` and `payment`
- ❌ `claim_verification()` - Now requires `payment`

## ✅ Error Codes

| Code | Description |
|------|-------------|
| `1` | Not profile owner |
| `10` | Insufficient payment |
| `300` | Cannot vote for yourself |
| `301` | Already voted for this profile |
| `302` | Max 2 votes per user |
| `303` | Already verified |
| `304` | Not enough votes to verify |

## 📝 Tests

Update test constants:
```move
const UPDATE_FEE: u64 = 50_000_000; // 0.05 SUI
const VERIFY_FEE: u64 = 20_000_000; // 0.02 SUI
```

All tests calling `vote_for_profile()` or `claim_verification()` need to:
1. Add `ProfileRegistry` to parameters
2. Create payment coin with `VERIFY_FEE`
3. Pass payment to function
4. Return shared registry

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
