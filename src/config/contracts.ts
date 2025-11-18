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
    "0x353ae26929fc4ab9f2dc5f7ed238d6d26b25e06a3100ef803725c1fbc0fcbbc4",

  // ==================== Profile & Badge System ====================

  // Profile Registry - Shared object for profile management
  PROFILE_REGISTRY_ID:
    process.env.NEXT_PUBLIC_PROFILE_REGISTRY_ID ||
    "0x3c237316be3c2d25183b212b022d14047603fb3ee8ee35caa3b955dc4252c5a5",

  // Voter Registry - Tracks verification votes
  VOTER_REGISTRY_ID:
    process.env.NEXT_PUBLIC_VOTER_REGISTRY_ID ||
    "0x42fcd79d532dd1e38641b18f040b4f98c8b952f8e580a793d6ba2464fd2d183d",

  // Location Registry - Manages badge locations
  LOCATION_REGISTRY_ID:
    process.env.NEXT_PUBLIC_LOCATION_REGISTRY_ID ||
    "0x346e6578b2aea4c5f5f27b76cdb49b372ac922de37e4b39378bad5aa63d2da97",

  // Memory Registry - Manages memory NFTs
  MEMORY_REGISTRY_ID:
    process.env.NEXT_PUBLIC_MEMORY_REGISTRY_ID ||
    "0x21d64029862f92f5675ed08f4bfbfa071614f6736db7da7416c2ca4cbe1c3c16",
  MEMORY_MAKET_PLACE_ID:
    process.env.NEXT_PUBLIC_MEMORY_MAKET_PLACE_ID ||
    "0xaf2e76388f53404bf7805feeb23da82b5f4562ee4c997355c4160e5164e865d9",

  // Transfer Policy for Memory NFT
  TRANSFER_POLICY_ID:
    process.env.NEXT_PUBLIC_TRANSFER_POLICY_ID ||
    "0xe8c0b1af849359fa76c0f60565fd6ad96f666233d2e9d3f6e3e293e07a4fe6b7",

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
