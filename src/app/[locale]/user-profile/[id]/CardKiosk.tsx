"use client";

import Link from "next/link";

interface KioskListing {
  listingId: string;
  name: string;
  content: string;
  imageUrl: string;
  latitude: string;
  longitude: string;
  price: string;
  rarity: number;
  perfection: number;
}

export default function CardKiosk({
  listing,
  getRarityColor,
  getRarityName,
}: {
  listing: KioskListing;
  getRarityColor: (rarity: number) => string;
  getRarityName: (rarity: number) => string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border-l-4 border-green-500">
      <div className="relative h-40 sm:h-48 bg-gray-200 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.imageUrl}
          alt={listing.name}
          className="w-full h-full object-cover"
        />

        <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
          ✓ Listed
        </div>

        <div
          className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${getRarityColor(
            listing.rarity
          )}`}
        >
          {getRarityName(listing.rarity)}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900">{listing.name}</h3>

        <p className="text-xs text-gray-600 mt-2 line-clamp-2">
          {listing.content}
        </p>

        <div className="mt-3 text-xs text-gray-500">
          📍 {listing.latitude}, {listing.longitude}
        </div>

        <div className="mt-3 bg-green-50 border border-green-200 rounded p-2">
          <div className="text-xs text-gray-600">Listed Price:</div>
          <div className="text-lg font-bold text-green-600">
            {(BigInt(listing.price) / BigInt(1e9)).toString()} SUI
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          <span className="font-semibold">Perfection:</span>{" "}
          <span className="text-green-600">{listing.perfection}</span>
        </div>

        <Link
          href={`https://suiexplorer.com/object/${listing.listingId}?network=testnet`}
          target="_blank"
          className="block w-full mt-3 text-center py-2 bg-green-100 text-green-600 rounded-lg text-xs font-semibold hover:bg-green-200 transition-colors"
        >
          View Listing →
        </Link>
      </div>
    </div>
  );
}
