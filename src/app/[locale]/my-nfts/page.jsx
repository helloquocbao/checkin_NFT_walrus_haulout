"use client";
import dynamic from "next/dynamic";
import { useSuiClient, useCurrentAccount } from "@mysten/dapp-kit";
import React, { useEffect, useState } from "react";

const NFTMapLocate = dynamic(() => import("./components/NFTMapLocate"), {
  ssr: false,
});

function shortenAddress(address, chars = 4) {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export default function Collection_items() {
  const client = useSuiClient();
  const account = useCurrentAccount();
  const [nfts, setNfts] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'map'

  useEffect(() => {
    if (!account?.address) return;

    const packageId =
      "0xcc84871dc79970f2dab50400699552c2ebeba058c8e6a8a4e9f5ace44464311f";
    const moduleName = "checkin_nft";

    (async () => {
      const res = await client.getOwnedObjects({
        owner: account.address,
        options: { showType: true, showContent: true },
      });

      const userNFTs = res.data.filter((obj) =>
        obj.data?.content?.type?.includes(
          `${packageId}::${moduleName}::CheckinNFT`
        )
      );

      setNfts(userNFTs);
    })();
  }, [account, client]);

  const validNFTs = nfts
    .map((item) => item.data.content.fields)
    .filter((f) => f.latitude && f.longitude);

  return (
    <section className="relative pb-10 pt-20 md:pt-32 h-1527">
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
        <h2 className="text-2xl font-bold mb-6 text-center">
          🌍 My NFT Check-in Collection
        </h2>

        {/* 🔘 Toggle View Buttons */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 bg-white dark:bg-jacarta-700">
            <button
              onClick={() => setViewMode("list")}
              className={`px-6 py-2 font-medium transition ${
                viewMode === "list"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-blue"
                  : "hover:bg-gray-100 dark:hover:bg-jacarta-600 text-gray-600 dark:text-gray-300"
              }`}
            >
              📜 List View
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`px-6 py-2 font-medium transition ${
                viewMode === "map"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-blue"
                  : "hover:bg-gray-100 dark:hover:bg-jacarta-600 text-gray-600 dark:text-gray-300"
              }`}
            >
              🗺️ Map View
            </button>
          </div>
        </div>

        {/* ✅ Content */}
        {validNFTs.length > 0 ? (
          <>
            {viewMode === "list" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                {validNFTs?.map((item) => (
                  <article key={item?.id?.id}>
                    <div className="dark:bg-jacarta-700 dark:border-jacarta-700 border-jacarta-100 rounded-2.5xl block border bg-white p-[1.1875rem] transition-shadow hover:shadow-lg">
                      <figure className="relative">
                        <img
                          src={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${item?.image_url}`}
                          alt={item?.name}
                          className="w-full h-[230px] rounded-[0.625rem] object-cover"
                        />
                      </figure>
                      <div className="mt-7 flex items-center justify-between">
                        <a
                          href={`https://suiexplorer.com/object/${item?.id?.id}?network=testnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-display mb-2 *:text-jacarta-700 hover:text-accent text-base dark:text-white flex justify-between w-full items-center gap-1"
                        >
                          <span className="w-full text-xl">{item?.name}</span>
                          <span className="w-full flex justify-end mr-4 text-sm opacity-70">
                            #{shortenAddress(item?.id?.id)}
                          </span>
                        </a>
                      </div>
                      <div className="mt-2 text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="font-semibold">Rarity:</span>
                          <div
                            style={{
                              color:
                                item?.rarity === "Common"
                                  ? "#9CA3AF"
                                  : item?.rarity === "Epic"
                                  ? "#7C3AED"
                                  : "#FACC15",
                            }}
                            className={`font-semibold w-full text-lg flex justify-end mr-4 ${
                              item?.rarity === "Common"
                                ? "text-gray-500"
                                : item?.rarity === "Epic"
                                ? "text-purple-600"
                                : "text-yellow-400"
                            }`}
                          >
                            {item?.rarity}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold">Completion:</span>
                          <span className="w-full  font-semibold flex justify-end text-base mr-4">
                            {item?.completion}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold">Latitude:</span>
                          <span className="w-full flex justify-end mr-4">
                            {item?.latitude}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold">Longitude:</span>
                          <span className="w-full flex justify-end mr-4">
                            {item?.longitude}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {viewMode === "map" && (
              <div className="mt-8 h-[500px] rounded-xl overflow-hidden shadow-lg animate-fade-in">
                <NFTMapLocate nfts={validNFTs} />
              </div>
            )}
          </>
        ) : (
          <p className="text-center mt-10 text-gray-500">No NFTs found.</p>
        )}
      </div>
    </section>
  );
}
