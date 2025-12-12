"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import { useState, useEffect } from "react";
import Link from "next/link";
import { CONTRACT_CONFIG } from "@/config/index";

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

export default function KioskMarketplace() {
  const client = useSuiClient();
  const [listings, setListings] = useState<KioskListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [filter, setFilter] = useState<string>("all"); // all, common, rare, epic, legendary

  // Helper function to convert numeric rarity to string
  const getRarityString = (rarity: string | number): string => {
    const rarityNum = typeof rarity === "string" ? parseInt(rarity) : rarity;
    const rarityMap = ["common", "rare", "epic", "legendary"];
    return rarityMap[rarityNum] || "common";
  };

  // 📥 Load all listings
  useEffect(() => {
    const loadListings = async () => {
      try {
        setLoading(true);
        setError("");

        // Query MemoryListed events to find all listings
        const events = await client.queryEvents({
          query: {
            MoveEventType: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::MemoryListed`,
          },
          limit: 200,
          order: "descending",
        });

        const allListings: KioskListing[] = [];
        const processedListings = new Set<string>();

        // For each event, fetch listing and NFT details
        for (const event of events.data) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const eventData = event.parsedJson as any;

            // Avoid duplicates
            if (
              eventData?.listing_id &&
              !processedListings.has(eventData.listing_id)
            ) {
              processedListings.add(eventData.listing_id);

              // Get listing object
              const listingObj = await client.getObject({
                id: eventData.listing_id,
                options: { showContent: true },
              });

              if (!listingObj.data?.content) continue;

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const listingFields = (listingObj.data.content as any).fields;

              // Get Memory NFT details
              const nftObj = await client.getObject({
                id: listingFields.memory_id,
                options: { showContent: true },
              });

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const nftFields = (nftObj.data?.content as any).fields;

              const listing: KioskListing = {
                listingId: eventData.listing_id,
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

              allListings.push(listing);
            }
          } catch (err) {
            console.error("❌ Error processing listing:", err);
            // Continue to next listing
          }
        }

        setListings(allListings);
      } catch (err) {
        console.error("❌ Error loading listings:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load listings"
        );
      } finally {
        setLoading(false);
      }
    };

    loadListings();
  }, [client]);

  // 🔍 Filter listings
  const filteredListings = listings.filter((listing) => {
    if (filter === "all") return true;
    // Handle both string and numeric rarity
    const rarityString = getRarityString(listing.rarity);
    return rarityString === filter.toLowerCase();
  });

  // 💰 Format price
  const formatPrice = (price: bigint) => {
    const sui = Number(price) / 1e9;
    return sui.toFixed(3);
  };

  // 🎨 Get rarity color
  const getRarityColor = (rarity: string | number) => {
    // Handle both numeric rarity (0,1,2,3) and string rarity ("common", "rare", etc)
    let rarityString: string;
    if (typeof rarity === "number" || !isNaN(Number(rarity))) {
      rarityString = getRarityString(rarity);
    } else {
      rarityString = String(rarity).toLowerCase();
    }

    switch (rarityString) {
      case "legendary":
        return "bg-yellow-500 text-white";
      case "epic":
        return "bg-purple-500 text-white";
      case "rare":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <section className="relative pb-10 pt-20 md:pt-32">
      {/* Background */}
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
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4 dark:">🏪 NFT Marketplace</h1>
          <p className="text-gray-600 dark:text-jacarta-300">
            Discover and buy unique Memory NFTs from the community
          </p>
        </div>

        {/* Filter */}
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full font-semibold transition-all ${
              filter === "all"
                ? "bg-accent "
                : "bg-gray-200 dark:bg-jacarta-600 text-gray-700 dark: hover:bg-accent hover:"
            }`}
          >
            All Listings ({listings.length})
          </button>

          {["common", "rare", "epic", "legendary"].map((rarity) => {
            const count = listings.filter(
              (l) => getRarityString(l.rarity) === rarity
            ).length;
            return (
              <button
                key={rarity}
                onClick={() => setFilter(rarity)}
                className={`px-4 py-2 rounded-full font-semibold transition-all capitalize ${
                  filter === rarity
                    ? "bg-accent "
                    : `${getRarityColor(rarity)}  opacity-75 hover:opacity-100`
                }`}
              >
                {rarity} ({count})
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
              <p className="mt-4 text-lg dark:">Loading marketplace...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">❌ Error: {error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredListings.length === 0 && (
          <div className="text-center py-20">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="mt-4 text-lg text-gray-600 dark:text-jacarta-300">
              No listings found
            </p>
          </div>
        )}

        {/* Listings Grid */}
        {!loading && filteredListings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <Link
                key={listing.listingId}
                href={`/kiosk/${listing.listingId}`}
              >
                <div className="h-full mr-3 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl bg-white dark:bg-jacarta-700 transition-all hover:scale-105 transform cursor-pointer border-l-4 border-green-500">
                  {/* Image */}
                  <div className="relative bg-jacarta-100 dark:bg-jacarta-600 aspect-square overflow-hidden">
                    {listing.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${listing.imageUrl}`}
                        alt={listing.name}
                        className="h-[450px] object-cover hover:scale-110 transition-transform"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-200 dark:bg-jacarta-600">
                        <svg
                          className="w-12 h-12 text-gray-400"
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

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3 bg-accent  text-white px-3 py-1 rounded-full text-xs font-semibold">
                      ✓ Listed
                    </div>

                    {/* Rarity Badge */}
                    <div className="absolute top-3 text-white bg-green right-3 rounded-full">
                      <span
                        className={`${getRarityColor(
                          listing.rarity
                        )}  px-3 py-1 rounded-full text-xs font-semibold`}
                      >
                        {getRarityString(listing.rarity)
                          .charAt(0)
                          .toUpperCase() +
                          getRarityString(listing.rarity).slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-2 line-clamp-2 dark:">
                      {listing.name}
                    </h3>

                    {/* Location */}
                    <p className="text-xs text-gray-500 dark:text-jacarta-400 mb-3">
                      📍 {listing.latitude}, {listing.longitude}
                    </p>

                    {/* Stats */}
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-jacarta-300">
                          Perfection:
                        </span>
                        <span className="font-semibold dark:">
                          {listing.perfection}%
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-3 rounded-lg mb-4 border border-green-200 dark:border-green-700">
                      <p className="text-xs text-gray-600 dark:text-jacarta-300 mb-1">
                        Price
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatPrice(listing.price)}
                        </span>
                        <span className="text-sm font-semibold text-gray-600 dark:text-jacarta-300">
                          SUI
                        </span>
                      </div>
                    </div>

                    {/* Buy Button */}
                    <button className="w-full bg-accent hover:bg-accent-dark  font-semibold py-2 px-4 rounded-lg transition-all hover:shadow-lg">
                      Buy Now →
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-blue-800 dark:text-blue-300">
            ℹ️ <strong>Tip:</strong> Click on any listing card to view details
            and complete your purchase. All NFTs are secured by smart contracts.
          </p>
        </div>
      </div>
    </section>
  );
}
