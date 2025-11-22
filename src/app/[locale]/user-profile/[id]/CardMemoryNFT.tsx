"use client";

import Link from "next/link";

interface MemoryNFT {
  id: string;
  name: string;
  content: string;
  image_url: string;
  latitude: string;
  longitude: string;
  rarity: number;
  perfection: number;
}

export default function CardMemoryNFT({
  nft,
  getRarityColor,
  getRarityName,
}: {
  nft: MemoryNFT;
  getRarityColor: (rarity: number) => string;
  getRarityName: (rarity: number) => string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border-l-4 border-purple-500">
      <div className="relative h-40 sm:h-48 bg-gray-200 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={nft.image_url}
          alt={nft.name}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900">{nft.name}</h3>

        <p className="text-xs text-gray-600 mt-2 line-clamp-2">{nft.content}</p>

        <div className="mt-3 text-xs text-gray-500">
          📍 {nft.latitude}, {nft.longitude}
        </div>
        <div className="mt-3 text-sm text-gray-600">
          <span className="font-semibold">Rarity:</span>{" "}
          <span className="text-purple-600"> {getRarityName(nft.rarity)}</span>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          <span className="font-semibold">Perfection:</span>{" "}
          <span className="text-purple-600">{nft.perfection}</span>
        </div>

        <Link
          href={`https://suiexplorer.com/object/${nft.id}?network=testnet`}
          target="_blank"
          className="block w-full mt-3 text-center py-2 bg-purple-100 text-purple-600 rounded-lg text-xs font-semibold hover:bg-purple-200 transition-colors"
        >
          View on Explorer →
        </Link>
      </div>
    </div>
  );
}
