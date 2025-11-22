/**
 * Sui Client Service
 * Khởi tạo và quản lý kết nối tới Sui network
 */

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { CONTRACT_CONFIG } from "@/config/contracts";

// Tạo Sui client instance
export const suiClient = new SuiClient({
  url: getFullnodeUrl(
    CONTRACT_CONFIG.NETWORK as "mainnet" | "testnet" | "devnet"
  ),
});

/**
 * Get current network
 */
export const getNetwork = () => CONTRACT_CONFIG.NETWORK;

/**
 * Check if connected to correct network
 */
export const isCorrectNetwork = (network: string) => {
  return network === CONTRACT_CONFIG.NETWORK;
};
