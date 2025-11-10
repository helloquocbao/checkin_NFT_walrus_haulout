/**
 * Smart Contract Configuration
 *
 * Update these values after deploying the contract to Sui network
 */

export const CONTRACT_CONFIG = {
  // Network
  NETWORK: process.env.NEXT_PUBLIC_SUI_NETWORK || "testnet", // 'mainnet' | 'testnet' | 'devnet'

  // Package ID - Update after deployment
  PACKAGE_ID:
    process.env.NEXT_PUBLIC_PACKAGE_ID ||
    "0x5c0d0985b638e9eb212ef70ead4157bf5084972f6601eb2da79ee9dd6b8563c1",

  // ==================== Profile & Badge System ====================

  // Profile Registry - Shared object for profile management
  PROFILE_REGISTRY_ID:
    process.env.NEXT_PUBLIC_PROFILE_REGISTRY_ID ||
    "0xbf06f589a9ff9088291bf4ca4750a7672a0a5facbe8f8edc8dff067dfc637c8e",

  // Voter Registry - Tracks verification votes
  VOTER_REGISTRY_ID:
    process.env.NEXT_PUBLIC_VOTER_REGISTRY_ID ||
    "0x2f7df66b3a1b2f974dc5ea051d902c69ed85051473a9e72e06d1cfc3fc1b9d4f",

  // Location Registry - Manages badge locations
  LOCATION_REGISTRY_ID:
    process.env.NEXT_PUBLIC_LOCATION_REGISTRY_ID ||
    "0x2d59edbb2963adf0215b8a66ea72fd6937c3f8cb8664fce3c8a2afa525ff31d7",

  // Badge Marketplace Registry
  BADGE_MARKETPLACE_REGISTRY_ID:
    process.env.NEXT_PUBLIC_BADGE_MARKETPLACE_REGISTRY_ID ||
    "0x31a29e5afe7fcbee37e2ba826fdfa0c1614758cd86ae396669b16574fc74924e",

  // Badge Transfer Policy
  BADGE_TRANSFER_POLICY_ID:
    process.env.NEXT_PUBLIC_BADGE_TRANSFER_POLICY_ID ||
    "0x842812dcbdc3b95e474c9ba9e31e8a020919b19ec7ffcc5c82c093e53f90a908",

  // ==================== Memory NFT System ====================

  // Memory Registry - Manages Memory NFTs
  MEMORY_REGISTRY_ID:
    process.env.NEXT_PUBLIC_MEMORY_REGISTRY_ID ||
    "0x03f3b5c7e26ba50ff25bd97853a3a69a04c87740a6e7a3bdf5b25735fef67111",

  // Memory Marketplace Registry
  MEMORY_MARKETPLACE_REGISTRY_ID:
    process.env.NEXT_PUBLIC_MEMORY_MARKETPLACE_REGISTRY_ID ||
    "0xc29915fec4d9f406f4f081aebec05cd75f3d4093df530e4a2ea18096b9e0a4a3",

  // Memory Transfer Policy
  MEMORY_TRANSFER_POLICY_ID:
    process.env.NEXT_PUBLIC_MEMORY_TRANSFER_POLICY_ID ||
    "0x6701411b198c121af7487d0372b258ee72b060ba66d95d38fefd51be9dc7ad54",

  // ==================== System Objects ====================

  // Sui Clock Object (same across all networks)
  CLOCK_ID: "0x6",
} as const;

/**
 * Fee Configuration (in MIST, 1 SUI = 10^9 MIST)
 */
export const FEE_CONFIG = {
  // Profile & Badge fees
  MINT_PROFILE_FEE: 10_000_000n, // 0.01 SUI
  CLAIM_BADGE_FEE: 10_000_000n, // 0.01 SUI
  UPDATE_PROFILE_FEE: 50_000_000n, // 0.05 SUI
  VOTE_PROFILE_FEE: 20_000_000n, // 0.02 SUI
  CLAIM_VERIFY_FEE: 20_000_000n, // 0.02 SUI

  // Memory NFT fees
  MINT_MEMORY_FEE: 30_000_000n, // 0.03 SUI
} as const;

/**
 * Module names for moveCall
 */
export const MODULES = {
  PROFILES: "profiles",
  BADGE_MARKETPLACE: "badge_marketplace",
  MEMORY_NFT: "memory_nft",
  MEMORY_MARKETPLACE: "memory_marketplace",
} as const;

/**
 * Badge Rarity Levels
 */
export const BADGE_RARITY = {
  COMMON: 0,
  RARE: 1,
  EPIC: 2,
  LEGENDARY: 3,
} as const;

/**
 * Badge Rarity Names
 */
export const BADGE_RARITY_NAMES = {
  [BADGE_RARITY.COMMON]: "Common",
  [BADGE_RARITY.RARE]: "Rare",
  [BADGE_RARITY.EPIC]: "Epic",
  [BADGE_RARITY.LEGENDARY]: "Legendary",
} as const;

/**
 * Badge Rarity Colors (Tailwind)
 */
export const BADGE_RARITY_COLORS = {
  [BADGE_RARITY.COMMON]: "text-gray-500 bg-gray-100 border-gray-300",
  [BADGE_RARITY.RARE]: "text-blue-600 bg-blue-100 border-blue-300",
  [BADGE_RARITY.EPIC]: "text-purple-600 bg-purple-100 border-purple-300",
  [BADGE_RARITY.LEGENDARY]: "text-orange-600 bg-orange-100 border-orange-300",
} as const;

/**
 * Verification threshold
 */
export const VERIFICATION_CONFIG = {
  MIN_VOTES_REQUIRED: 3,
  MAX_VOTES_PER_USER: 2,
} as const;

/**
 * Helper function to get full module path
 */
export const getModulePath = (moduleName: keyof typeof MODULES) => {
  return `${CONTRACT_CONFIG.PACKAGE_ID}::${MODULES[moduleName]}`;
};

/**
 * Helper function to check if contract is configured
 */
export const isContractConfigured = () => {
  return Boolean(
    CONTRACT_CONFIG.PACKAGE_ID &&
      CONTRACT_CONFIG.PROFILE_REGISTRY_ID &&
      CONTRACT_CONFIG.MEMORY_REGISTRY_ID
  );
};

/**
 * Type exports
 */
export type Network = typeof CONTRACT_CONFIG.NETWORK;
export type ModuleName = keyof typeof MODULES;
export type BadgeRarity = (typeof BADGE_RARITY)[keyof typeof BADGE_RARITY];
