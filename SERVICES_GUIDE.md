# 📚 Services & Hooks Documentation

## 🎯 Tổng quan

Project cung cấp các service functions và React hooks để tương tác với smart contract trên Sui blockchain.

---

## 📁 Cấu trúc

```
src/
├── services/           # Service functions (pure functions)
│   ├── suiClient.ts       # Sui client configuration
│   ├── profileService.ts  # Profile operations
│   ├── memoryService.ts   # Memory NFT operations
│   ├── badgeService.ts    # Badge marketplace operations
│   ├── locationService.ts # Location management
│   └── index.ts           # Export all services
│
├── hooks/              # React hooks (với state management)
│   ├── useProfile.ts      # Profile hook
│   └── useMemory.ts       # Memory NFT hook
│
└── config/
    └── contracts.ts       # Contract configuration
```

---

## 🔧 Services

### 1. **Profile Service**

#### Mint Profile

```typescript
import { mintProfile } from "@/services";

const tx = await mintProfile(walletAddress, {
  name: "John Doe",
  bio: "Travel enthusiast",
  avatarUrl: "https://...",
  socialLinks: ["https://twitter.com/..."],
  country: "Vietnam",
});

// Execute với wallet
await signAndExecute({ transaction: tx });
```

#### Update Profile

```typescript
const tx = await updateProfile(profileId, {
  name: "New Name",
  bio: "New bio",
  avatarUrl: "https://...",
  socialLinks: [],
});
```

#### Claim Badge (Gacha)

```typescript
const tx = await claimBadge(profileId, locationId);
// User sẽ nhận badge với random rarity (0-3) và perfection (250-1000)
```

#### Vote for Verification

```typescript
const tx = await voteForProfile(targetProfileId);
// Cost: 0.02 SUI, max 2 votes per user
```

#### Claim Verification

```typescript
const tx = await claimVerification(profileId);
// Requires 3+ votes, cost: 0.02 SUI
```

---

### 2. **Memory NFT Service**

#### Mint Memory NFT

```typescript
import { mintMemoryNFT, gpsToU64 } from "@/services";

const tx = await mintMemoryNFT({
  name: "Beautiful Sunset",
  content: "Amazing view at Eiffel Tower",
  imageUrl: "https://...",
  latitude: 48.8584, // Will be converted to u64
  longitude: 2.2945, // Will be converted to u64
});
```

#### List Memory NFT for Sale

**⚠️ Lưu ý:** User cần có Kiosk trước khi list. Nếu chưa có, gọi `createKiosk()` từ Badge Service.

```typescript
import { listMemoryNFT } from "@/services";

// Cần: Kiosk ID, Kiosk Cap ID, Memory NFT ID
const tx = await listMemoryNFT(
  kioskId, // User's Kiosk ID
  kioskCapId, // User's Kiosk Cap ID
  memoryNftId, // Memory NFT to list
  1000000000 // Price in MIST (1 SUI = 1,000,000,000 MIST)
);
```

#### Buy Memory NFT (2 methods)

**Method 1: Buy to Kiosk** (buyer cần có Kiosk)

```typescript
import { buyMemoryNFT } from "@/services";

const tx = await buyMemoryNFT(
  listingId, // Memory listing object ID
  sellerKioskId, // Seller's Kiosk ID
  buyerKioskId, // Buyer's Kiosk ID (for receiving NFT)
  buyerKioskCapId, // Buyer's Kiosk Cap ID
  1000000000 // Price in MIST
);
// NFT sẽ được place vào buyer's Kiosk (có thể resell sau)
```

**Method 2: Buy Direct** (không cần Kiosk, đơn giản hơn)

```typescript
import { buyMemoryNFTDirect } from "@/services";

const tx = await buyMemoryNFTDirect(
  listingId, // Memory listing object ID
  sellerKioskId, // Seller's Kiosk ID
  1000000000 // Price in MIST
);
// NFT sẽ transfer trực tiếp về wallet (không thể resell trừ khi list lại)
```

#### Delist Memory NFT

```typescript
import { delistMemoryNFT } from "@/services";

const tx = await delistMemoryNFT(
  listingId, // Memory listing object ID
  kioskId, // Your Kiosk ID
  kioskCapId // Your Kiosk Cap ID
);
// NFT sẽ transfer về wallet của seller
```

---

### 3. **Badge Service**

#### Create Kiosk (Bắt buộc trước khi trade)

```typescript
import { createKiosk } from "@/services";

const tx = await createKiosk();
// Tạo Kiosk để có thể list Badge hoặc Memory NFT
// Mỗi wallet chỉ cần 1 Kiosk (dùng chung cho cả Badge và Memory)
```

#### Check if has Kiosk

```typescript
import { hasKiosk } from "@/services";

const kioskExists = await hasKiosk(walletAddress);
if (!kioskExists) {
  // Create kiosk first
  await createKiosk();
}
```

#### List Badge for Sale

**⚠️ Chỉ Epic (rarity=2) và Legendary (rarity=3) badges mới có thể trade**

```typescript
import { listBadge } from "@/services";

const tx = await listBadge(
  profileId, // Your profile ID
  kioskId, // Your Kiosk ID
  kioskCapId, // Your Kiosk Cap ID
  locationId, // Location ID of the badge
  500000000 // Price in MIST (0.5 SUI)
);
// Badge sẽ được extract từ profile → wrap → place in Kiosk → list
```

#### Buy Badge

```typescript
import { buyBadge } from "@/services";

const tx = await buyBadge(
  profileId, // Buyer's profile ID (to receive badge)
  listingId, // Badge listing object ID
  sellerKioskId, // Seller's Kiosk ID
  500000000 // Price in MIST
);
// Badge sẽ được unwrap và add vào buyer's profile
```

#### Delist Badge

```typescript
import { delistBadge } from "@/services";

const tx = await delistBadge(
  profileId, // Your profile ID (to receive badge back)
  listingId, // Badge listing object ID
  kioskId, // Your Kiosk ID
  kioskCapId, // Your Kiosk Cap ID
  locationId // Location ID of the badge
);
// Badge sẽ được unwrap và trả về profile
```

#### Get Kiosk Info

```typescript
import { getKioskByAddress, getKioskCapByAddress } from "@/services";

const kioskId = await getKioskByAddress(walletAddress);
const kioskCapId = await getKioskCapByAddress(walletAddress);
```

---

### 4. **Location Service**

#### Add Location (Admin Only)

```typescript
import { addLocation, gpsToU64 } from "@/services";

const tx = await addLocation({
  name: "Eiffel Tower",
  description: "Iconic landmark in Paris",
  latitude: gpsToU64(48.8584),
  longitude: gpsToU64(2.2945),
  imageCommon: "https://...",
  imageRare: "https://...",
  imageEpic: "https://...",
  imageLegendary: "https://...",
});
```

#### Get All Locations

```typescript
const locations = await getAllLocations();
```

#### GPS Conversion

```typescript
// Convert GPS to u64 format (multiply by 1,000,000)
const lat = gpsToU64(48.8584); // "48858400"

// Convert u64 back to GPS
const gps = u64ToGps("48858400"); // 48.8584
```

---

## 🪝 React Hooks

### useProfile Hook

```typescript
import { useProfile } from "@/hooks/useProfile";

function ProfileComponent() {
  const {
    loading,
    error,
    mint,
    update,
    claim,
    vote,
    claimVerify,
    getProfile,
    checkHasProfile,
  } = useProfile();

  // Mint profile
  const handleMint = async () => {
    try {
      await mint({
        name: "Alice",
        bio: "Traveler",
        avatarUrl: "https://...",
        socialLinks: [],
        country: "Vietnam",
      });
      alert("Profile minted!");
    } catch (err) {
      console.error(err);
    }
  };

  // Claim badge
  const handleClaim = async () => {
    const profileObj = await getProfile();
    if (profileObj) {
      await claim(profileObj.data.objectId, 0); // Location ID = 0
    }
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      <button onClick={handleMint}>Mint Profile</button>
      <button onClick={handleClaim}>Claim Badge</button>
    </div>
  );
}
```

### useMemory Hook

```typescript
import { useMemory } from "@/hooks/useMemory";

function MemoryComponent() {
  const {
    loading,
    error,
    mint,
    listForSale,
    buyNFT,
    buyNFTDirect,
    delistNFT,
    getMemories,
  } = useMemory();

  // Mint Memory NFT
  const handleMint = async () => {
    await mint({
      name: "Paris 2024",
      content: "Wonderful trip",
      imageUrl: "https://...",
      latitude: 48.8584,
      longitude: 2.2945,
    });
  };

  // List for sale (requires Kiosk)
  const handleList = async (
    memoryId: string,
    kioskId: string,
    kioskCapId: string
  ) => {
    await listForSale(
      kioskId,
      kioskCapId,
      memoryId,
      1000000000 // 1 SUI
    );
  };

  // Buy to Kiosk (for reselling later)
  const handleBuy = async (
    listingId: string,
    sellerKioskId: string,
    buyerKioskId: string,
    buyerKioskCapId: string
  ) => {
    await buyNFT(
      listingId,
      sellerKioskId,
      buyerKioskId,
      buyerKioskCapId,
      1000000000
    );
  };

  // Buy direct (simple transfer to wallet)
  const handleBuyDirect = async (listingId: string, sellerKioskId: string) => {
    await buyNFTDirect(listingId, sellerKioskId, 1000000000);
  };

  // Get user's memories
  const memories = await getMemories();

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      <button onClick={handleMint}>Create Memory</button>
      {/* Display memories */}
    </div>
  );
}
```

---

## 💰 Fee Configuration

```typescript
import { FEE_CONFIG } from "@/config/contracts";

// All fees in MIST (1 SUI = 10^9 MIST)
FEE_CONFIG.MINT_PROFILE_FEE; // 0.01 SUI
FEE_CONFIG.CLAIM_BADGE_FEE; // 0.01 SUI
FEE_CONFIG.UPDATE_PROFILE_FEE; // 0.05 SUI
FEE_CONFIG.VOTE_PROFILE_FEE; // 0.02 SUI
FEE_CONFIG.CLAIM_VERIFY_FEE; // 0.02 SUI
FEE_CONFIG.MINT_MEMORY_FEE; // 0.03 SUI
```

---

## 🎲 Badge Rarity System

```typescript
import { BADGE_RARITY, BADGE_RARITY_NAMES } from "@/config/contracts";

BADGE_RARITY.COMMON; // 0 (60% chance)
BADGE_RARITY.RARE; // 1 (25% chance)
BADGE_RARITY.EPIC; // 2 (12% chance)
BADGE_RARITY.LEGENDARY; // 3 (3% chance)

// Get rarity name
const rarityName = BADGE_RARITY_NAMES[0]; // "Common"
```

---

## 🔍 Query Functions

### Get Profile by Address

```typescript
import { getProfileByAddress } from "@/services";

const profile = await getProfileByAddress("0x...");
console.log(profile.data.content);
```

### Get Memory NFTs

```typescript
import { getMemoryNFTsByAddress } from "@/services";

const memories = await getMemoryNFTsByAddress("0x...");
memories.forEach((m) => {
  console.log(m.data.content);
});
```

### Check Verification Status

```typescript
import { getVerificationStatus } from "@/services";

const status = await getVerificationStatus(profileId);
console.log(status.isVerified); // true/false
console.log(status.verifyVotes); // số votes hiện tại
console.log(status.badgeCount); // số badges đã claim
```

---

## 🚨 Error Handling

```typescript
try {
  await mint({ ... });
} catch (error) {
  if (error.message.includes("already minted")) {
    alert("You already have a profile!");
  } else if (error.message.includes("insufficient")) {
    alert("Not enough SUI balance!");
  } else {
    alert("Transaction failed: " + error.message);
  }
}
```

---

## 🌐 Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=0x5c0d0985b638e9eb212ef70ead4157bf5084972f6601eb2da79ee9dd6b8563c1
NEXT_PUBLIC_PROFILE_REGISTRY_ID=0xbf06f589a9ff9088291bf4ca4750a7672a0a5facbe8f8edc8dff067dfc637c8e
# ... other IDs
```

---

## 📝 Notes

- **Gas Budget**: Thường 10-20 SUI là đủ cho mọi transaction
- **Transaction Block**: Tất cả functions đều trả về `Transaction` object, cần execute bằng wallet
- **Dynamic Fields**: Badge data được lưu dạng dynamic fields trong ProfileNFT
- **Royalty**: Memory NFT có 2.5% royalty về creator khi trade
- **GPS Format**: Tọa độ GPS được nhân 10^6 để lưu dạng u64

---

## 🔗 Links

- **Testnet Explorer**: https://testnet.suivision.xyz
- **Sui Docs**: https://docs.sui.io
- **dApp Kit Docs**: https://sdk.mystenlabs.com/dapp-kit
