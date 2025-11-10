/**
 * Memory NFT Service
 * Các functions để tương tác với Memory NFT module
 */

import { Transaction } from "@mysten/sui/transactions";
import { CONTRACT_CONFIG, FEE_CONFIG } from "@/config/contracts";
import { suiClient } from "./suiClient";

/**
 * Mint Memory NFT
 */
export const mintMemoryNFT = async (memory: {
  name: string;
  content: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
}) => {
  const tx = new Transaction();

  const [feeCoin] = tx.splitCoins(tx.gas, [FEE_CONFIG.MINT_MEMORY_FEE]);

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_nft::mint_memory`,
    arguments: [
      tx.object(CONTRACT_CONFIG.MEMORY_REGISTRY_ID),
      tx.pure.string(memory.name),
      tx.pure.string(memory.content),
      tx.pure.string(memory.imageUrl),
      tx.pure.u64(memory.latitude),
      tx.pure.u64(memory.longitude),
      feeCoin,
      tx.object(CONTRACT_CONFIG.CLOCK_ID),
    ],
  });

  return tx;
};

/**
 * List Memory NFT for sale
 * NOTE: Cần có Kiosk trước (dùng createKiosk từ badgeService)
 */
export const listMemoryNFT = async (
  kioskId: string,
  kioskCapId: string,
  memoryNftId: string,
  price: bigint
) => {
  const tx = new Transaction();

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::list_memory`,
    arguments: [
      tx.object(CONTRACT_CONFIG.MEMORY_MARKETPLACE_REGISTRY_ID),
      tx.object(kioskId),
      tx.object(kioskCapId),
      tx.object(memoryNftId),
      tx.pure.u64(price),
      tx.object(CONTRACT_CONFIG.CLOCK_ID),
    ],
  });

  return tx;
};

/**
 * Buy Memory NFT (vào Kiosk của buyer)
 * NOTE: Buyer cũng cần có Kiosk
 */
export const buyMemoryNFT = async (
  listingId: string,
  sellerKioskId: string,
  buyerKioskId: string,
  buyerKioskCapId: string,
  price: bigint
) => {
  const tx = new Transaction();

  const [paymentCoin] = tx.splitCoins(tx.gas, [price]);

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::buy_memory`,
    arguments: [
      tx.object(CONTRACT_CONFIG.MEMORY_MARKETPLACE_REGISTRY_ID),
      tx.object(listingId),
      tx.object(sellerKioskId),
      tx.object(buyerKioskId),
      tx.object(buyerKioskCapId),
      tx.object(CONTRACT_CONFIG.MEMORY_TRANSFER_POLICY_ID),
      paymentCoin,
    ],
  });

  return tx;
};

/**
 * Buy Memory NFT Direct (transfer trực tiếp, không vào Kiosk)
 * Đơn giản hơn, không cần buyer có Kiosk
 */
export const buyMemoryNFTDirect = async (
  listingId: string,
  sellerKioskId: string,
  price: bigint
) => {
  const tx = new Transaction();

  const [paymentCoin] = tx.splitCoins(tx.gas, [price]);

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::buy_memory_direct`,
    arguments: [
      tx.object(CONTRACT_CONFIG.MEMORY_MARKETPLACE_REGISTRY_ID),
      tx.object(listingId),
      tx.object(sellerKioskId),
      tx.object(CONTRACT_CONFIG.MEMORY_TRANSFER_POLICY_ID),
      paymentCoin,
    ],
  });

  return tx;
};

/**
 * Delist Memory NFT (transfer về seller)
 */
export const delistMemoryNFT = async (
  listingId: string,
  kioskId: string,
  kioskCapId: string
) => {
  const tx = new Transaction();

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::delist_memory`,
    arguments: [
      tx.object(listingId),
      tx.object(kioskId),
      tx.object(kioskCapId),
    ],
  });

  return tx;
};

/**
 * Get Memory NFTs owned by address
 */
export const getMemoryNFTsByAddress = async (address: string) => {
  try {
    const objects = await suiClient.getOwnedObjects({
      owner: address,
      filter: {
        StructType: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_nft::MemoryNFT`,
      },
      options: {
        showContent: true,
        showDisplay: true,
      },
    });

    return objects.data;
  } catch (error) {
    console.error("Error getting Memory NFTs:", error);
    return [];
  }
};

/**
 * Get Memory NFT details
 */
export const getMemoryNFTDetails = async (memoryId: string) => {
  try {
    const object = await suiClient.getObject({
      id: memoryId,
      options: {
        showContent: true,
        showDisplay: true,
        showOwner: true,
      },
    });

    return object;
  } catch (error) {
    console.error("Error getting Memory NFT details:", error);
    return null;
  }
};

/**
 * Get all Memory NFT listings
 */
export const getAllMemoryListings = async () => {
  try {
    const listings = await suiClient.getOwnedObjects({
      owner: CONTRACT_CONFIG.MEMORY_MARKETPLACE_REGISTRY_ID,
      filter: {
        StructType: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::MemoryListing`,
      },
      options: {
        showContent: true,
        showDisplay: true,
        showOwner: true,
      },
    });

    return listings.data || [];
  } catch (error) {
    console.error("Error getting Memory listings:", error);
    return [];
  }
};
