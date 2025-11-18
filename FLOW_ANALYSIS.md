# 🔍 Kiosk Marketplace Flow Analysis

## 📋 Summary

Flow có **4 lỗi CRITICAL** và **1 tính năng MISSING**

---

## ❌ CRITICAL ISSUES

### 🔴 LỖI 1: `createKiosk()` thiếu arguments

**Vị trí**: `src/services/profileService.ts` Line ~480

```typescript
export const createKiosk = async () => {
  const tx = new Transaction();

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::create_kiosk`,
    // ❌ THIẾU arguments: registry & ctx (ctx auto from tx context, nhưng registry cần)
  });

  return tx;
};
```

**Contract function signature**:

```move
public fun create_kiosk(
    registry: &mut MemoryMarketplaceRegistry,  // ❌ THIẾU
    ctx: &mut TxContext                         // Auto
)
```

**Fix**: Thêm `registry` argument

```typescript
tx.moveCall({
  target: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::create_kiosk`,
  arguments: [
    tx.object(CONTRACT_CONFIG.MEMORY_MAKET_PLACE_ID), // registry
  ],
});
```

---

### 🔴 LỖI 2: `listMemoryNFTToKiosk()` sai arguments

**Vị trí**: `src/services/profileService.ts` Line ~467-479

```typescript
export const listMemoryNFTToKiosk = async (
  kioskId: string,
  memoryNFTId: string,
  price: bigint
) => {
  const tx = new Transaction();

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::list_memory`,
    arguments: [
      tx.object(CONTRACT_CONFIG.MEMORY_MAKET_PLACE_ID), // ✅ registry
      tx.object(kioskId),                                 // ❌ Sai: dùng kioskId làm kiosk
      tx.object(kioskId),                                 // ❌ Sai: dùng kioskId làm cap!
      tx.object(memoryNFTId),                             // ✅ memory
      tx.pure.u64(price),                                 // ✅ price
      tx.object(CONTRACT_CONFIG.CLOCK_ID),               // ✅ clock
    ],
  });
```

**Contract function signature**:

```move
entry fun list_memory(
    registry: &mut MemoryMarketplaceRegistry,  // ✅
    kiosk: &mut Kiosk,                         // ✅
    cap: &KioskOwnerCap,                       // ❌ THIẾU - frontend pass kiosk ID lại
    memory: MemoryNFT,                         // ✅
    price: u64,                                // ✅
    clock: &Clock,                             // ✅
    ctx: &mut tx_context::TxContext,           // Auto
)
```

**Issue**:

- Argument 3 (cap): Frontend pass `kioskId` (Kiosk object) nhưng contract expect `KioskOwnerCap`
- `KioskOwnerCap` là object khác, phải lấy từ user's owned objects
- Frontend không có cách để get KioskOwnerCap từ kioskId

**Fix**: Cần query KioskOwnerCap:

```typescript
export const listMemoryNFTToKiosk = async (
  kioskId: string,
  kioskCapId: string, // 🆕 Add this
  memoryNFTId: string,
  price: bigint
) => {
  const tx = new Transaction();

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::list_memory`,
    arguments: [
      tx.object(CONTRACT_CONFIG.MEMORY_MAKET_PLACE_ID),
      tx.object(kioskId),
      tx.object(kioskCapId), // 🆕 Pass cap ID
      tx.object(memoryNFTId),
      tx.pure.u64(price),
      tx.object(CONTRACT_CONFIG.CLOCK_ID),
    ],
  });

  return tx;
};
```

Và trong my-profile page, cần get cap:

```typescript
const kiosks = await getUserKiosks(currentAccount.address);
const caps = await getUserKioskCaps(currentAccount.address);
const capId = caps[0]?.id;

await listMemoryNFTToKiosk(kiosks[0].id, capId, nftId, price);
```

---

### 🔴 LỖI 3: Không có API để query tất cả listings

**Vị trí**: `src/services/profileService.ts` - MISSING

**Issue**:

- Frontend cần display "tất cả sản phẩm từ tất cả kiosks"
- Hiện tại không có function để:
  1. Query tất cả MemoryListing objects
  2. Lấy kiosk details từ listing
  3. Display marketplace

**Missing API**:

```typescript
export const getAllListings = async () => {
  try {
    // Query all MemoryListing objects (shared type)
    const objects = await suiClient.queryEvents({
      query: {
        MoveEventType: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::MemoryListed`,
      },
    });

    // OR: Query owned objects of type MemoryListing
    // (Listings are shared, not owned - need to get from events or contract table)

    return objects;
  } catch (error) {
    console.error("Error getting listings:", error);
    return [];
  }
};
```

---

### 🔴 LỖI 4: `buy_memory()` function không có corresponding frontend API

**Vị trí**: Contract có function nhưng frontend không implement

```move
entry fun buy_memory(
    registry: &MemoryMarketplaceRegistry,
    listing: MemoryListing,
    seller_kiosk: &mut Kiosk,
    buyer_kiosk: &mut Kiosk,
    buyer_cap: &KioskOwnerCap,
    policy: &TransferPolicy<MemoryNFT>,
    payment: Coin<SUI>,
    ctx: &mut tx_context::TxContext,
)
```

**Issue**:

- Frontend không có `buyMemory()` function
- Cần cập nhật khi user mua NFT từ marketplace

---

## 🔧 FLOW BREAKDOWN

### 1️⃣ CREATE KIOSK

```
Frontend: handleListNFT()
  ↓ No kiosk exists?
  ↓ Show confirm dialog
  ↓ User clicks OK
  ↓ createKiosk() 🔴 LỖI 1: MISSING REGISTRY ARGUMENT
  ↓ Move: create_kiosk(registry, ctx)
    - Assert user not in table
    - Create Kiosk & KioskOwnerCap via kiosk::new()
    - Track in Table: user → kiosk_id
    - Transfer KioskOwnerCap to user
    - Share Kiosk as public object
  ↓ Success
  ↓ Page reload
```

**Fix required**: Add registry to createKiosk()

---

### 2️⃣ LIST NFT TO KIOSK

```
Frontend: handleListNFT() continued
  ↓ Get user kiosks
  ↓ Get user kiosk caps 🆕 NEED THIS
  ↓ listMemoryNFTToKiosk(kioskId, capId, nftId, price) 🔴 LỖI 2: CAP ID MISSING
  ↓ Move: list_memory(registry, kiosk, cap, memory, price, clock, ctx)
    - Verify kiosk ownership: kiosk::has_access(kiosk, cap)
    - Place NFT in kiosk: kiosk::place(kiosk, cap, memory)
    - List in kiosk: kiosk::list(kiosk, cap, memory_id, price)
    - Create MemoryListing object (shared)
    - Increment total_listings
    - Emit MemoryListed event
  ↓ Success
```

**Fix required**:

- Add capId parameter
- Get cap from user

---

### 3️⃣ BUY NFT (MISSING IN FRONTEND)

```
Frontend: (NOT IMPLEMENTED) 🔴 LỖI 4
  ↓ Show marketplace listings 🔴 LỖI 3: NO QUERY API
  ↓ User clicks "Buy" on listing
  ↓ buyMemory(listingId, sellerKioskId, buyerKioskId, buyerCapId, payment)
  ↓ Move: buy_memory(registry, listing, seller_kiosk, buyer_kiosk, buyer_cap, policy, payment, ctx)
    - Destructure listing
    - Verify payment >= price
    - Purchase from seller's kiosk: kiosk::purchase()
    - Confirm transfer policy
    - Calculate royalty
    - Place in buyer's kiosk
    - Emit MemorySold event
  ↓ Success
```

**Missing**:

- getAllListings() API
- buyMemory() transaction builder
- Marketplace UI

---

### 4️⃣ LIST ALL PRODUCTS FROM ALL KIOSKS

```
Frontend: (NOT IMPLEMENTED) 🔴 LỖI 3
  ↓ getAllListings() 🔴 MISSING
    - Query all MemoryListing shared objects
    - Get seller address from listing
    - Get seller's kiosk
    - Format for display
  ↓ Display marketplace:
    - Show all listings
    - Show creator info
    - Show price
    - Show "Buy" button
```

**Missing**:

- getAllListings() function
- Marketplace display page
- Buy UI/logic

---

## 📊 IMPACT ASSESSMENT

| Flow                 | Status     | Blocker | User Impact            |
| -------------------- | ---------- | ------- | ---------------------- |
| 1. Create Kiosk      | ❌ BROKEN  | LỖI 1   | Cannot create kiosk    |
| 2. List NFT          | ❌ BROKEN  | LỖI 2   | Cannot list NFT        |
| 3. Buy NFT           | ❌ MISSING | LỖI 3,4 | No marketplace         |
| 4. View All Listings | ❌ MISSING | LỖI 3   | No marketplace display |

---

## ✅ REQUIRED FIXES

1. **Fix createKiosk()** - Add registry argument
2. **Fix listMemoryNFTToKiosk()** - Add cap parameter & query cap from user
3. **Add getAllListings()** - Query all listings from events/RPC
4. **Add buyMemory()** - Transaction builder for purchase
5. **Add marketplace display** - Page to show listings

---

## 🔗 RELATED FILES

- Contract: `contract/sources/memory_marketplace.move`
- Service: `src/services/profileService.ts`
- Page: `src/app/[locale]/my-profile/page.tsx`
- Config: `src/config/contracts.ts`
