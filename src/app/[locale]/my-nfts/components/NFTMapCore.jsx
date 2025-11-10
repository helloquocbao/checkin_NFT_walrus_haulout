"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import React, { useEffect, useState } from "react";
import { useSuiClient, useCurrentAccount } from "@mysten/dapp-kit";
function shortenAddress(address, chars = 4) {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
const markerIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -28],
});

export default function NFTMapCore() {
  const client = useSuiClient();
  const account = useCurrentAccount();
  const [nfts, setNfts] = useState([]);

  const defaultPosition = [10.762622, 106.660172];

  useEffect(() => {
    if (!account?.address) return;

    const packageId =
      "0xcc84871dc79970f2dab50400699552c2ebeba058c8e6a8a4e9f5ace44464311f";
    const moduleName = "checkin_nft";

    (async () => {
      try {
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
      } catch (e) {
        console.error("Error loading NFTs:", e);
      }
    })();
  }, [account, client]);

  const validNFTs = nfts
    .map((item) => item.data.content.fields)
    .filter((f) => f.latitude && f.longitude);

  if (typeof window === "undefined") return null;
  console.log("validNFTs", validNFTs);
  return (
    <div className="h-[500px] w-full">
      <MapContainer
        center={defaultPosition}
        zoom={4}
        scrollWheelZoom
        style={{ height: 500, width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        />
        {validNFTs.map((item, i) => (
          <Marker
            key={i}
            position={[parseFloat(item.latitude), parseFloat(item.longitude)]}
            icon={markerIcon}
          >
            <Popup>
              <article key={item?.id?.id}>
                <div className="dark:bg-jacarta-700 dark:border-jacarta-700 border-jacarta-100 rounded-2.5xl block border bg-white p-[1.1875rem] transition-shadow hover:shadow-lg">
                  <figure className="relative">
                    <a>
                      <img
                        src={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${item?.image_url}`}
                        alt="item 5"
                        className="w-full h-[230px] rounded-[0.625rem] object-cover"
                      />
                    </a>
                  </figure>
                  <div className="mt-7 flex items-center  justify-between">
                    <a
                      href={`https://suiexplorer.com/object/${item?.id?.id}?network=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-display mb-2 *:text-jacarta-700 hover:text-accent text-base dark:text-white flex justify-between w-full items-center gap-1"
                    >
                      <span className="w-full text-xl"> {item?.name} </span>
                      <span className="w-full flex justify-end mr-4">
                        #{shortenAddress(item?.id?.id)}
                      </span>
                    </a>
                  </div>
                  <div className="mt-2 text-sm ">
                    <span className="flex justify-between mr-1 mb-1">
                      <span className="font-semibold">Rarity:</span>
                      <span
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
                            ? "text-black"
                            : item?.rarity === "Epic"
                            ? "text-[#5D2F77]"
                            : "text-[#FFCC00]"
                        }`}
                      >
                        {item?.rarity}
                      </span>
                      <br />
                    </span>
                    <span className="flex justify-between mr-1  mb-1">
                      <span className="font-semibold">Completion:</span>
                      <span className="w-full flex justify-end text-base mr-4 font-semibold">
                        {item?.completion}
                      </span>
                      <br />
                    </span>
                    <span className="flex justify-between mr-1  mb-1">
                      <span className="font-semibold">Latitude:</span>{" "}
                      <span className="w-full flex justify-end mr-4">
                        {item?.latitude}
                      </span>
                      <br />
                    </span>
                    <span className="flex justify-between mr-1  mb-1">
                      <span className="font-semibold">Longitude:</span>{" "}
                      <span className="w-full flex justify-end mr-4">
                        {item?.longitude}
                      </span>
                      <br />
                    </span>
                  </div>
                </div>
              </article>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
