"use client";

import Link from "next/link";

interface Badge {
  location_id: number;
  location_name: string;
  image_url: string;
  rarity: number;
  perfection: number;
  created_at: number;
}

export default function CardBadge({
  badge,
  getRarityColor,
  getRarityName,
}: {
  badge: Badge;
  getRarityColor: (rarity: number) => string;
  getRarityName: (rarity: number) => string;
}) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border-l-4 border-blue-500">
      <div className="relative h-40 sm:h-48 bg-gray-200 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={badge.image_url}
          alt={badge.location_name}
          className="w-full h-full object-cover"
        />
        <div
          className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${getRarityColor(
            badge.rarity
          )}`}
        >
          {getRarityName(badge.rarity)}
        </div>
      </div>

      <div className="p-4">
        <Link
          href={`/location/${badge.location_id}`}
          className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"
        >
          {badge.location_name}
        </Link>

        <div className="mt-3 space-y-2 text-sm text-gray-600">
          <div>
            <span className="font-semibold">Perfection:</span>{" "}
            <span className="text-blue-600">
              {badge.perfection}/1000 (
              {((badge.perfection / 1000) * 100).toFixed(1)}%)
            </span>
          </div>
          <div>
            <span className="font-semibold">📅 Claimed:</span>{" "}
            {formatDate(badge.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
