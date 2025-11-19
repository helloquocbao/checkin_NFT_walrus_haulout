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
    "0x2885ef5af578b308918da87d716c5d24b6b1af22ab13628a3ba8f99bb70b7c11",

  // ==================== Profile & Badge System ====================

  // Profile Registry - Shared object for profile management
  PROFILE_REGISTRY_ID:
    process.env.NEXT_PUBLIC_PROFILE_REGISTRY_ID ||
    "0x18e8a7dd4a293ee9b36bc085b7cec7a60018a3adc396edccb774cc3d06fdac4c",

  // Voter Registry - Tracks verification votes
  VOTER_REGISTRY_ID:
    process.env.NEXT_PUBLIC_VOTER_REGISTRY_ID ||
    "0xa8837eaa90cfc983b7b83179dc69bb7f4d2baaaf874d1ab612f73cc19068f3c0",

  // Location Registry - Manages badge locations
  LOCATION_REGISTRY_ID:
    process.env.NEXT_PUBLIC_LOCATION_REGISTRY_ID ||
    "0x9b92dbaf40df210dd11f9d0dba9f9184bbadcde62913187ce2fb91160b313601",

  // Memory Registry - Manages memory NFTs
  MEMORY_REGISTRY_ID:
    process.env.NEXT_PUBLIC_MEMORY_REGISTRY_ID ||
    "0x5cc2914128c8d694c6f2551d433a27beebe018badc7445db9b916f3c97297cfd",
  MEMORY_MAKET_PLACE_ID:
    process.env.NEXT_PUBLIC_MEMORY_MAKET_PLACE_ID ||
    "0x17d6d298533ab3912c16ca0d3bc55d59f75d851c56a494611e817fa63ac5d290",

  // Transfer Policy for Memory NFT
  TRANSFER_POLICY_ID:
    process.env.NEXT_PUBLIC_TRANSFER_POLICY_ID ||
    "0xa854f8e6c1cdb5ed71aca385323753195e192700b6b892541d6e20e3c4106f38",

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
