# Contract Deployment Guide

## 📦 Prerequisites

1. Install Sui CLI: https://docs.sui.io/build/install
2. Create/Import wallet:
   ```bash
   sui client new-address ed25519
   sui client switch --address <your-address>
   ```
3. Get testnet SUI tokens: https://faucet.testnet.sui.io/

## 🚀 Deployment Steps

### 1. Build Contract

```bash
cd contract
sui move build
```

Verify no errors in build output.

### 2. Deploy to Testnet

```bash
sui client publish --gas-budget 100000000
```

**Important:** Save the entire output! You'll need several Object IDs.

### 3. Extract Object IDs from Output

From the deployment output, find and save these values:

#### Package ID

Look for: `"packageId": "0x..."`

```
Published Objects:
└─ PackageID: 0xabcd1234...
```

#### Shared Objects Created

The deployment will create several shared objects:

```typescript
// Look for these in the "Created Objects" section:

ProfileRegistry: {
  objectId: "0x...",
  type: "0xPACKAGE::profiles::ProfileRegistry"
}

VoterRegistry: {
  objectId: "0x...",
  type: "0xPACKAGE::profiles::VoterRegistry"
}

LocationRegistry: {
  objectId: "0x...",
  type: "0xPACKAGE::profiles::LocationRegistry"
}

MarketplaceRegistry (Badge): {
  objectId: "0x...",
  type: "0xPACKAGE::badge_marketplace::MarketplaceRegistry"
}

MemoryRegistry: {
  objectId: "0x...",
  type: "0xPACKAGE::memory_nft::MemoryRegistry"
}

MemoryMarketplaceRegistry: {
  objectId: "0x...",
  type: "0xPACKAGE::memory_marketplace::MemoryMarketplaceRegistry"
}

TransferPolicy<MemoryNFT>: {
  objectId: "0x...",
  type: "0x2::transfer_policy::TransferPolicy<0xPACKAGE::memory_nft::MemoryNFT>"
}
```

### 4. Update Frontend Configuration

#### Option 1: Using Environment Variables (Recommended)

Create `.env.local` file in project root:

```bash
# Copy from .env.example
cp .env.example .env.local
```

Edit `.env.local` and paste your Object IDs:

```env
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=0xYOUR_PACKAGE_ID

# Profile & Badge System
NEXT_PUBLIC_PROFILE_REGISTRY_ID=0xYOUR_PROFILE_REGISTRY_ID
NEXT_PUBLIC_VOTER_REGISTRY_ID=0xYOUR_VOTER_REGISTRY_ID
NEXT_PUBLIC_LOCATION_REGISTRY_ID=0xYOUR_LOCATION_REGISTRY_ID
NEXT_PUBLIC_BADGE_MARKETPLACE_REGISTRY_ID=0xYOUR_BADGE_MARKETPLACE_REGISTRY_ID
NEXT_PUBLIC_BADGE_TRANSFER_POLICY_ID=0xYOUR_BADGE_TRANSFER_POLICY_ID

# Memory NFT System
NEXT_PUBLIC_MEMORY_REGISTRY_ID=0xYOUR_MEMORY_REGISTRY_ID
NEXT_PUBLIC_MEMORY_MARKETPLACE_REGISTRY_ID=0xYOUR_MEMORY_MARKETPLACE_REGISTRY_ID
NEXT_PUBLIC_MEMORY_TRANSFER_POLICY_ID=0xYOUR_MEMORY_TRANSFER_POLICY_ID
```

#### Option 2: Direct Configuration (for testing)

Edit `src/config/contracts.ts` and replace empty strings with your IDs.

### 5. Verify Configuration

```bash
# Restart dev server to load new env vars
yarn dev
```

Check browser console - should not see "Contract not configured" errors.

### 6. Initialize Contract (Optional)

Add initial locations for badge collection:

```typescript
// Run this from your frontend admin panel or use Sui CLI
import { Transaction } from "@mysten/sui/transactions";

const tx = new Transaction();

tx.moveCall({
  target: `${PACKAGE_ID}::profiles::add_location`,
  arguments: [
    tx.object(LOCATION_REGISTRY_ID),
    tx.pure.string("Eiffel Tower"),
    tx.pure.string("Iconic iron lattice tower in Paris"),
    tx.pure.string("48.8584"),
    tx.pure.string("2.2945"),
    tx.pure.string("https://common.jpg"),
    tx.pure.string("https://rare.jpg"),
    tx.pure.string("https://epic.jpg"),
    tx.pure.string("https://legendary.jpg"),
  ],
});
```

## 🔍 Verification Checklist

- [ ] Contract deployed successfully
- [ ] Package ID saved
- [ ] All 8 shared object IDs saved
- [ ] `.env.local` file created and populated
- [ ] Frontend dev server restarted
- [ ] No console errors about missing config
- [ ] Test mint profile function works
- [ ] Test mint memory NFT function works

## 🐛 Troubleshooting

### "Insufficient gas" error during deployment

```bash
# Increase gas budget
sui client publish --gas-budget 200000000
```

### Can't find Object IDs in output

```bash
# Check recent transactions
sui client transaction <TX_DIGEST> --show-effects

# Or check on Sui Explorer
# https://testnet.suivision.xyz/txblock/<TX_DIGEST>
```

### "Object not found" errors in frontend

- Make sure you copied the correct Object IDs
- Verify you're connected to the same network (testnet/mainnet)
- Check that Object IDs don't have extra quotes or spaces

### Contract needs update after changes

```bash
# Rebuild and republish
cd contract
sui move build
sui client publish --gas-budget 100000000

# Update all Object IDs again (they will change!)
```

## 📚 Next Steps

After successful deployment:

1. ✅ Test basic functions (mint profile, claim badge)
2. ✅ Add test locations via admin functions
3. ✅ Test Memory NFT minting with GPS
4. ✅ Test marketplace listing/buying
5. ✅ Deploy to mainnet (repeat all steps on mainnet)

## 🌐 Network Endpoints

### Testnet

- RPC: `https://fullnode.testnet.sui.io:443`
- Faucet: `https://faucet.testnet.sui.io/`
- Explorer: `https://testnet.suivision.xyz/`

### Mainnet

- RPC: `https://fullnode.mainnet.sui.io:443`
- Explorer: `https://suivision.xyz/`

## 💡 Tips

- Save deployment output to a file: `sui client publish --gas-budget 100000000 > deployment.txt`
- Use Sui Explorer to verify contract structure
- Test on testnet thoroughly before mainnet deployment
- Keep your deployer wallet private key secure
- Consider using a multisig wallet for mainnet deployments
