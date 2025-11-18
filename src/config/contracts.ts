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
    "0xfba7b4654cc5a4c83ae44ee86932dcdf132116d0ce62533cb5592838ba2ae2fc",

  // ==================== Profile & Badge System ====================

  // Profile Registry - Shared object for profile management
  PROFILE_REGISTRY_ID:
    process.env.NEXT_PUBLIC_PROFILE_REGISTRY_ID ||
    "0x46163727d7de4419c1e4b32a82f7e63952fa1fe8a943c1f9674770115e470b56",

  // Voter Registry - Tracks verification votes
  VOTER_REGISTRY_ID:
    process.env.NEXT_PUBLIC_VOTER_REGISTRY_ID ||
    "0xcef4dbf8dbf8249f4830b2947068ed7a1910764bd78a4f76f5596162b62ee6a3",

  // Location Registry - Manages badge locations
  LOCATION_REGISTRY_ID:
    process.env.NEXT_PUBLIC_LOCATION_REGISTRY_ID ||
    "0xe06b807d1b6ab099ade5e7cbfff754dfb6324ce195177bea0e98e62c3c2d36e2",

  // Memory Registry - Manages memory NFTs
  MEMORY_REGISTRY_ID:
    process.env.NEXT_PUBLIC_MEMORY_REGISTRY_ID ||
    "0x8bb54cf5da4ff467b215841406fb0784a620fc54934ff1323972ddfc816e98a2",
  MEMORY_MAKET_PLACE_ID:
    process.env.NEXT_PUBLIC_MEMORY_MAKET_PLACE_ID ||
    "0x6aa7e198a89775d86155de2c05785a58cb7a9258f942cdc670adfae40af0191d",

  // Transfer Policy for Memory NFT
  TRANSFER_POLICY_ID:
    process.env.NEXT_PUBLIC_TRANSFER_POLICY_ID ||
    "0x829fe97f2a5529e59e2fca291ccf6078559168672ae8e593dcd00d4cfd233fbd",

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
      CONTRACT_CONFIG.LOCATION_REGISTRY_ID
  );
};

/**
 * Type exports
 */
export type Network = typeof CONTRACT_CONFIG.NETWORK;
export type ModuleName = keyof typeof MODULES;
export type BadgeRarity = (typeof BADGE_RARITY)[keyof typeof BADGE_RARITY];
