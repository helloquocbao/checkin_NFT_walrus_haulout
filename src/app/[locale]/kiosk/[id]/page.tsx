"use client";

import { useParams, useRouter } from "next/navigation";
import {
  useCurrentAccount,
  useSuiClient,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useState, useEffect } from "react";
import Link from "next/link";
import { CONTRACT_CONFIG } from "@/config/index";
import { getUserKiosks } from "@/services/profileService";

interface KioskListing {
  listingId: string;
  memoryId: string;
  seller: string;
  price: bigint;
  name: string;
  imageUrl: string;
  rarity: string;
  perfection: number;
  latitude: string;
  longitude: string;
  listedAt: number;
}

export default function PurchasePage() {
  const params = useParams();
  const router = useRouter();
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const listingId = params.id as string;

  const [listing, setListing] = useState<KioskListing | null>(null);
  const [seller, setSeller] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string>("");
  const [successTx, setSuccessTx] = useState<string>("");

  // 📥 Load listing details
  useEffect(() => {
    if (!listingId) return;

    const loadListing = async () => {
      try {
        setLoading(true);
        setError("");

        console.log("🔍 Loading listing:", listingId);

        // Get listing object
        const listingObj = await client.getObject({
          id: listingId,
          options: { showContent: true },
        });

        if (!listingObj.data?.content) {
          throw new Error("Listing not found");
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const listingFields = (listingObj.data.content as any).fields;

        console.log("📊 Listing fields:", listingFields);

        // Get Memory NFT details
        const nftObj = await client.getObject({
          id: listingFields.memory_id,
          options: { showContent: true },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nftFields = (nftObj.data?.content as any).fields;

        console.log("🎨 NFT fields:", nftFields);

        const listingData: KioskListing = {
          listingId: listingFields.id?.id || listingId,
          memoryId: listingFields.memory_id,
          seller: listingFields.seller,
          price: BigInt(listingFields.price),
          name: nftFields?.name || "Memory NFT",
          imageUrl: nftFields?.image_url || "",
          rarity: nftFields?.rarity || "common",
          perfection: parseInt(nftFields?.perfection || "0"),
          latitude: nftFields?.latitude || "0",
          longitude: nftFields?.longitude || "0",
          listedAt: parseInt(listingFields.listed_at || "0"),
        };

        setListing(listingData);
        setSeller(listingFields.seller);
      } catch (err) {
        console.error("❌ Error loading listing:", err);
        setError(err instanceof Error ? err.message : "Failed to load listing");
      } finally {
        setLoading(false);
      }
    };

    loadListing();
  }, [listingId, client]);

  // 💰 Handle purchase
  const handlePurchase = async () => {
    if (!account || !listing) {
      setError("Wallet not connected or listing not loaded");
      return;
    }

    if (account.address === seller) {
      setError("Cannot buy your own listing");
      return;
    }

    setPurchasing(true);
    setError("");

    try {
      console.log("🛒 Starting purchase process...");
      console.log("📌 Listing ID:", listingId);
      console.log("💰 Price (MIST):", listing.price.toString());
      console.log("🏪 Seller address:", seller);

      // 🔑 Fetch seller's kiosk ID
      console.log("🔍 Fetching seller's kiosk...");
      const sellerKiosks = await getUserKiosks(seller);

      if (!sellerKiosks || sellerKiosks.length === 0) {
        throw new Error("Seller does not have a kiosk");
      }

      const sellerKioskId = sellerKiosks[0].id;
      console.log("✅ Found seller kiosk:", sellerKioskId);

      // Create transaction to buy NFT
      const tx = new Transaction();

      // Split payment coin for exact amount
      const [paymentCoin] = tx.splitCoins(tx.gas, [listing.price]);

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::buy_memory_direct`,
        arguments: [
          tx.object(CONTRACT_CONFIG.MEMORY_MAKET_PLACE_ID), // registry
          tx.object(listingId), // listing (will be consumed)
          tx.object(sellerKioskId), // seller_kiosk
          tx.object(CONTRACT_CONFIG.TRANSFER_POLICY_ID), // policy
          paymentCoin, // payment
        ],
      });
      console.log("✅ Transaction built, executing...");

      // Execute transaction
      signAndExecute(
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          transaction: tx as any,
        },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSuccess: (result: any) => {
            console.log("✅ Purchase successful!");
            console.log("📜 Transaction digest:", result.digest);
            setSuccessTx(result.digest);
            setPurchasing(false);

            // Redirect to my-nfts after 2 seconds
            setTimeout(() => {
              router.push("/my-nfts");
            }, 2000);
          },
          onError: (err) => {
            console.error("❌ Purchase failed:", err);
            setError(err instanceof Error ? err.message : "Purchase failed");
            setPurchasing(false);
          },
        }
      );
    } catch (err) {
      console.error("❌ Error during purchase:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <section className="relative pb-10 pt-20 md:pt-32">
        <picture className="pointer-events-none absolute inset-x-0 top-0 -z-10 block dark:hidden h-full">
          <img
            src="/images/gradient.jpg"
            alt="gradient"
            className="h-full w-full"
          />
        </picture>
        <picture className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden dark:block">
          <img
            src="/images/gradient_dark.jpg"
            alt="gradient dark"
            className="h-full w-full"
          />
        </picture>
        <div className="container mx-auto">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
              <p className="mt-4 text-lg">Loading listing...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!listing || error) {
    return (
      <section className="relative pb-10 pt-20 md:pt-32">
        <picture className="pointer-events-none absolute inset-x-0 top-0 -z-10 block dark:hidden h-full">
          <img
            src="/images/gradient.jpg"
            alt="gradient"
            className="h-full w-full"
          />
        </picture>
        <picture className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden dark:block">
          <img
            src="/images/gradient_dark.jpg"
            alt="gradient dark"
            className="h-full w-full"
          />
        </picture>
        <div className="container mx-auto">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4v2m0 0v2m0-6V9m0 0V7m0 2a2 2 0 110-4 2 2 0 010 4z"
                />
              </svg>
              <p className="mt-4 text-lg text-red-500">
                {error || "Listing not found"}
              </p>
              <Link
                href="/user-profile"
                className="mt-4 inline-block bg-accent text-white px-6 py-2 rounded-full"
              >
                Back to profile
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const priceInSUI = Number(listing.price) / 1e9;

  return (
    <section className="relative pb-10 pt-20 md:pt-32">
      <picture className="pointer-events-none absolute inset-x-0 top-0 -z-10 block dark:hidden h-full">
        <img
          src="/images/gradient.jpg"
          alt="gradient"
          className="h-full w-full"
        />
      </picture>
      <picture className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden dark:block">
        <img
          src="/images/gradient_dark.jpg"
          alt="gradient dark"
          className="h-full w-full"
        />
      </picture>

      <div className="container mx-auto">
        {/* Back Button */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-accent hover:text-accent-dark transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* NFT Image and Details */}
          <div className="lg:col-span-1">
            <div className="rounded-lg overflow-hidden shadow-lg bg-white dark:bg-jacarta-700">
              {/* Image */}
              <div className="relative bg-jacarta-100 dark:bg-jacarta-600 aspect-square overflow-hidden">
                {listing.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${listing.imageUrl}`}
                    alt={listing.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <svg
                      className="w-12 h-12 text-jacarta-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}

                {/* Rarity Badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${
                      listing.rarity === "legendary"
                        ? "bg-yellow-500"
                        : listing.rarity === "epic"
                        ? "bg-purple-500"
                        : listing.rarity === "rare"
                        ? "bg-blue-500"
                        : "bg-green-500"
                    }`}
                  >
                    {String(listing.rarity).charAt(0).toUpperCase() +
                      String(listing.rarity).slice(1)}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4 dark:text-white">
                  {listing.name}
                </h2>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-jacarta-300">
                      Location:
                    </span>
                    <span className="font-semibold dark:text-white">
                      {listing.latitude}, {listing.longitude}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-jacarta-300">
                      Perfection:
                    </span>
                    <span className="font-semibold dark:text-white">
                      {listing.perfection}%
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-jacarta-300">
                      Rarity:
                    </span>
                    <span className="font-semibold dark:text-white capitalize">
                      {listing.rarity}
                    </span>
                  </div>

                  <div className="border-t pt-3 flex justify-between">
                    <span className="text-gray-600 dark:text-jacarta-300">
                      Memory ID:
                    </span>
                    <span className="font-mono text-xs dark:text-white truncate">
                      {listing.memoryId.slice(0, 8)}...
                    </span>
                  </div>
                </div>

                {/* View on Explorer */}
                <a
                  href={`https://suiscan.xyz/testnet/object/${listing.memoryId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 text-accent hover:text-accent-dark transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14c1.1 0 2-.9 2-2v-7h-2v7z" />
                  </svg>
                  View on Explorer
                </a>
              </div>
            </div>
          </div>

          {/* Purchase Section */}
          <div className="lg:col-span-2">
            <div className="rounded-lg overflow-hidden shadow-lg bg-white dark:bg-jacarta-700 p-8">
              <h3 className="text-3xl font-bold mb-8 dark:text-white">
                🛒 Complete Purchase
              </h3>

              {/* Price Display */}
              <div className="mb-8 p-6 bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg border border-accent/20">
                <p className="text-sm text-gray-600 dark:text-jacarta-300 mb-2">
                  Total Price
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-accent">
                    {priceInSUI}
                  </span>
                  <span className="text-xl font-semibold dark:text-white">
                    SUI
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-jacarta-400 mt-2">
                  ≈ {(priceInSUI * 2).toFixed(2)} USD (approx)
                </p>
              </div>

              {/* Seller Info */}
              <div className="mb-8 p-4 bg-jacarta-50 dark:bg-jacarta-600 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-jacarta-300 mb-2">
                  Seller
                </p>
                <p className="font-mono text-sm break-all dark:text-white">
                  {seller}
                </p>
              </div>

              {/* Order Summary */}
              <div className="mb-8 space-y-3 pb-8 border-b border-jacarta-100 dark:border-jacarta-600">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-jacarta-300">
                    NFT Price:
                  </span>
                  <span className="font-semibold dark:text-white">
                    {priceInSUI} SUI
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-jacarta-300">
                    Royalty (2.5%):
                  </span>
                  <span className="font-semibold dark:text-white">
                    {(priceInSUI * 0.025).toFixed(6)} SUI
                  </span>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">
                    ❌ {error}
                  </p>
                </div>
              )}

              {successTx && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-green-600 dark:text-green-400 text-sm">
                    ✅ Purchase successful!
                  </p>
                  <p className="text-green-600 dark:text-green-400 text-xs mt-2 font-mono break-all">
                    {successTx}
                  </p>
                </div>
              )}

              {/* Purchase Button */}
              <button
                onClick={handlePurchase}
                disabled={purchasing || !account || successTx !== ""}
                className={`w-full py-4 px-6 rounded-full font-semibold text-lg text-white transition-all ${
                  purchasing || !account || successTx
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-accent hover:bg-accent-dark shadow-accent-volume hover:shadow-lg"
                }`}
              >
                {!account ? (
                  "🔗 Connect Wallet"
                ) : purchasing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </span>
                ) : successTx ? (
                  "✅ Purchase Completed"
                ) : (
                  "💳 Buy Now"
                )}
              </button>

              {/* Wallet Connection Required */}
              {!account && (
                <p className="mt-4 text-center text-sm text-gray-600 dark:text-jacarta-300">
                  Please connect your wallet to purchase this NFT.
                </p>
              )}

              {/* Additional Info */}
              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-blue-800 dark:text-blue-300 text-sm">
                  ℹ️ <strong>Note:</strong> The purchased NFT will be
                  transferred to your wallet directly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
