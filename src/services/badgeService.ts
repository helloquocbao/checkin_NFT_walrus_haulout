/**
 * Badge Marketplace Service
 * Các functions để tương tác với Badge Marketplace module
 */

import { Transaction } from "@mysten/sui/transactions";
import { CONTRACT_CONFIG } from "@/config/contracts";
import { suiClient } from "./suiClient";

/**
 * Create Kiosk (required before listing)
 */
export const createKiosk = async () => {
  const tx = new Transaction();

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::badge_marketplace::create_kiosk`,
    arguments: [tx.object(CONTRACT_CONFIG.BADGE_MARKETPLACE_REGISTRY_ID)],
  });

  return tx;
};

/**
 * List badge for sale (extract từ profile và list vào Kiosk)
 * NOTE: Chỉ Epic (rarity=2) hoặc Legendary (rarity=3) mới trade được
 */
export const listBadge = async (
  profileId: string,
  kioskId: string,
  kioskCapId: string,
  locationId: number,
  price: bigint
) => {
  const tx = new Transaction();

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::badge_marketplace::list_badge`,
    arguments: [
      tx.object(profileId),
      tx.object(CONTRACT_CONFIG.BADGE_MARKETPLACE_REGISTRY_ID),
      tx.object(kioskId),
      tx.object(kioskCapId),
      tx.pure.u64(locationId),
      tx.pure.u64(price),
      tx.object(CONTRACT_CONFIG.CLOCK_ID),
    ],
  });

  return tx;
};

/**
 * Buy badge (tự động unwrap về profile của buyer)
 */
export const buyBadge = async (
  profileId: string,
  listingId: string,
  sellerKioskId: string,
  price: bigint
) => {
  const tx = new Transaction();

  const [paymentCoin] = tx.splitCoins(tx.gas, [price]);

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::badge_marketplace::buy_badge`,
    arguments: [
      tx.object(profileId),
      tx.object(CONTRACT_CONFIG.BADGE_MARKETPLACE_REGISTRY_ID),
      tx.object(listingId),
      tx.object(sellerKioskId),
      tx.object(CONTRACT_CONFIG.BADGE_TRANSFER_POLICY_ID),
      paymentCoin,
    ],
  });

  return tx;
};

/**
 * Delist badge (tự động unwrap về profile của seller)
 */
export const delistBadge = async (
  profileId: string,
  listingId: string,
  kioskId: string,
  kioskCapId: string
) => {
  const tx = new Transaction();

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::badge_marketplace::delist_badge`,
    arguments: [
      tx.object(profileId),
      tx.object(listingId),
      tx.object(kioskId),
      tx.object(kioskCapId),
    ],
  });

  return tx;
};

/**
 * Get Kiosk owned by address
 */
export const getKioskByAddress = async (address: string) => {
  try {
    const objects = await suiClient.getOwnedObjects({
      owner: address,
      filter: {
        StructType: `0x2::kiosk::Kiosk`,
      },
      options: {
        showContent: true,
      },
    });

    return objects.data.length > 0 ? objects.data[0] : null;
  } catch (error) {
    console.error("Error getting kiosk:", error);
    return null;
  }
};

/**
 * Get KioskOwnerCap by address
 */
export const getKioskCapByAddress = async (address: string) => {
  try {
    const objects = await suiClient.getOwnedObjects({
      owner: address,
      filter: {
        StructType: `0x2::kiosk::KioskOwnerCap`,
      },
      options: {
        showContent: true,
      },
    });

    return objects.data.length > 0 ? objects.data[0] : null;
  } catch (error) {
    console.error("Error getting kiosk cap:", error);
    return null;
  }
};

/**
 * Get all BadgeListing objects
 */
export const getAllBadgeListings = async () => {
  try {
    const listings = await suiClient.getOwnedObjects({
      owner: CONTRACT_CONFIG.BADGE_MARKETPLACE_REGISTRY_ID,
      filter: {
        StructType: `${CONTRACT_CONFIG.PACKAGE_ID}::badge_marketplace::BadgeListing`,
      },
      options: {
        showContent: true,
        showDisplay: true,
        showOwner: true,
      },
    });

    return listings.data || [];
  } catch (error) {
    console.error("Error getting badge listings:", error);
    return [];
  }
};

/**
 * Check if user has created Kiosk
 */
export const hasKiosk = async (address: string) => {
  const kiosk = await getKioskByAddress(address);
  return kiosk !== null;
};
