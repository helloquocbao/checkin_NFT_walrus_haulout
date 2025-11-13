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
    "0xc10cf0154a316d7307f954792477ec3c1390207b2798eac7d5a87c30f163d1a6",

  // ==================== Profile & Badge System ====================

  // Profile Registry - Shared object for profile management
  PROFILE_REGISTRY_ID:
    process.env.NEXT_PUBLIC_PROFILE_REGISTRY_ID ||
    "0xe1a85238e3233a1a0d8e71cff8259a40c043320b948c1d715bfd2df4279550f4",

  // Voter Registry - Tracks verification votes
  VOTER_REGISTRY_ID:
    process.env.NEXT_PUBLIC_VOTER_REGISTRY_ID ||
    "0x30e4e505640048e565bf8613031514a3d2aa1cea4269b32e9a9a27cafeeee722",

  // Location Registry - Manages badge locations
  LOCATION_REGISTRY_ID:
    process.env.NEXT_PUBLIC_LOCATION_REGISTRY_ID ||
    "0xe77df3774dfb378923976854c14fd6c982a4c1e3a99d7bdb25b674215c9ccf28",

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
