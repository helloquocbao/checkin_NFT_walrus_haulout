/**
 * Profile Service
 * Các functions để tương tác với Profile module
 */

import { Transaction } from "@mysten/sui/transactions";
import { CONTRACT_CONFIG, FEE_CONFIG } from "@/config/contracts";
import { suiClient } from "./suiClient";

/**
 * Mint profile mới
 */
export const mintProfile = async (
  walletAddress: string,
  profile: {
    name: string;
    bio: string;
    avatarUrl: string;
    socialLinks: string[];
    country: string;
  }
) => {
  const tx = new Transaction();

  // Split coin để trả phí
  const [feeCoin] = tx.splitCoins(tx.gas, [FEE_CONFIG.MINT_PROFILE_FEE]);

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::profiles::mint_profile`,
    arguments: [
      tx.object(CONTRACT_CONFIG.PROFILE_REGISTRY_ID),
      tx.pure.string(profile.name),
      tx.pure.string(profile.bio),
      tx.pure.string(profile.avatarUrl),
      tx.pure.vector("string", profile.socialLinks),
      tx.pure.string(profile.country),
      feeCoin,
      tx.object(CONTRACT_CONFIG.CLOCK_ID),
    ],
  });

  return tx;
};

/**
 * Update profile
 */
export const updateProfile = async (
  profileId: string,
  updates: {
    name: string;
    bio: string;
    avatarUrl: string;
    socialLinks: string[];
  }
) => {
  const tx = new Transaction();

  const [feeCoin] = tx.splitCoins(tx.gas, [FEE_CONFIG.UPDATE_PROFILE_FEE]);

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::profiles::update_profile`,
    arguments: [
      tx.object(CONTRACT_CONFIG.PROFILE_REGISTRY_ID),
      tx.object(profileId),
      tx.pure.string(updates.name),
      tx.pure.string(updates.bio),
      tx.pure.string(updates.avatarUrl),
      tx.pure.vector("string", updates.socialLinks),
      feeCoin,
    ],
  });

  return tx;
};

/**
 * Claim badge tại location (gacha)
 */
export const claimBadge = async (profileId: string, locationId: number) => {
  const tx = new Transaction();

  const [feeCoin] = tx.splitCoins(tx.gas, [FEE_CONFIG.CLAIM_BADGE_FEE]);

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::profiles::claim_badge`,
    arguments: [
      tx.object(profileId),
      tx.object(CONTRACT_CONFIG.LOCATION_REGISTRY_ID),
      tx.pure.u64(locationId),
      feeCoin,
      tx.object(CONTRACT_CONFIG.CLOCK_ID),
    ],
  });

  return tx;
};

/**
 * Vote cho profile để verify
 */
export const voteForProfile = async (targetProfileId: string) => {
  const tx = new Transaction();

  const [feeCoin] = tx.splitCoins(tx.gas, [FEE_CONFIG.VOTE_PROFILE_FEE]);

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::profiles::vote_for_profile`,
    arguments: [
      tx.object(CONTRACT_CONFIG.PROFILE_REGISTRY_ID),
      tx.object(CONTRACT_CONFIG.VOTER_REGISTRY_ID),
      tx.object(targetProfileId),
      feeCoin,
    ],
  });

  return tx;
};

/**
 * Claim verification badge
 */
export const claimVerification = async (profileId: string) => {
  const tx = new Transaction();

  const [feeCoin] = tx.splitCoins(tx.gas, [FEE_CONFIG.CLAIM_VERIFY_FEE]);

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::profiles::claim_verification`,
    arguments: [
      tx.object(CONTRACT_CONFIG.PROFILE_REGISTRY_ID),
      tx.object(profileId),
      feeCoin,
    ],
  });

  return tx;
};

/**
 * Get profile object từ address
 */
export const getProfileByAddress = async (address: string) => {
  try {
    const objects = await suiClient.getOwnedObjects({
      owner: address,
      filter: {
        StructType: `${CONTRACT_CONFIG.PACKAGE_ID}::profiles::ProfileNFT`,
      },
      options: {
        showContent: true,
        showDisplay: true,
      },
    });

    if (objects.data.length === 0) return null;

    return objects.data[0];
  } catch (error) {
    console.error("Error getting profile:", error);
    return null;
  }
};

/**
 * Get profile details
 */
export const getProfileDetails = async (profileId: string) => {
  try {
    const object = await suiClient.getObject({
      id: profileId,
      options: {
        showContent: true,
        showDisplay: true,
        showOwner: true,
      },
    });

    return object;
  } catch (error) {
    console.error("Error getting profile details:", error);
    return null;
  }
};

/**
 * Check if user has minted profile
 */
export const hasProfile = async (address: string) => {
  const profile = await getProfileByAddress(address);
  return profile !== null;
};

/**
 * Get verification status
 */
export const getVerificationStatus = async (profileId: string) => {
  try {
    const profile = await getProfileDetails(profileId);
    if (!profile || !profile.data?.content) return null;

    const content = profile.data.content as any;
    return {
      isVerified: content.fields.is_verified || false,
      verifyVotes: parseInt(content.fields.verify_votes || "0"),
      badgeCount: parseInt(content.fields.badge_count || "0"),
    };
  } catch (error) {
    console.error("Error getting verification status:", error);
    return null;
  }
};
