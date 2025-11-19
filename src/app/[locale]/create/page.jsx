"use client";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import CameraCapture from "@/components/cameraCapture/CameraCapture";
import Meta from "@/components/Meta";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { CONTRACT_CONFIG } from "@/config/contracts";

export default function Create() {
  const dispatch = useDispatch();
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const client = useSuiClient();

  const [imageBlob, setImageBlob] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [nftInfo, setNftInfo] = useState(null);
  const [position, setPosition] = useState({
    latitude: null,
    longitude: null,
  });

  const handleCapture = async (blob) => {
    try {
      // 🧩 Kiểm tra quyền vị trí trước
      if (!navigator.geolocation) {
        alert("⚠️ Trình duyệt không hỗ trợ GPS!");
        return;
      }

      // 🧩 Lấy vị trí
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => {
            if (err.code === 1) {
              // USER_DENIED_PERMISSION
              alert(
                "⚠️ Bạn đã từ chối quyền truy cập vị trí. Hãy bật lại GPS để mint NFT!"
              );
            } else {
              alert("⚠️ Không thể lấy vị trí! Hãy kiểm tra cài đặt GPS.");
            }
            reject(err);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });

      // Nếu lấy được vị trí => lưu
      const latitude = position.coords.latitude.toString();
      const longitude = position.coords.longitude.toString();

      // 🧩 Nếu có ảnh và vị trí, cho phép upload
      setImageBlob(blob);
      setImagePreview(URL.createObjectURL(blob));
      setPosition({ latitude, longitude });
    } catch (err) {
      console.error("❌ Lỗi khi chụp hoặc lấy vị trí:", err);
      // Nếu lỗi → reset, không cho mint
      setImageBlob(null);
      setImagePreview("");
      setPosition({ latitude: null, longitude: null });
    }
  };

  // 🧩 Upload ảnh lên Walrus
  const handleUpload = async () => {
    if (!account) {
      return;
    }

    if (!imageBlob) {
      alert("Vui lòng chụp ảnh trước khi upload!");
      return;
    }

    if (!position.latitude || !position.longitude) {
      alert(
        "⚠️ Vui lòng bật GPS và cấp quyền truy cập vị trí trước khi upload!"
      );
      return;
    }

    try {
      setUploading(true);

      const response = await fetch(
        "https://publisher.walrus-testnet.walrus.space/v1/blobs",
        {
          method: "PUT",
          body: imageBlob,
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const info = await response.json();

      const newBlobId =
        info?.newlyCreated?.blobObject?.blobId || info?.blobObject?.blobId;

      if (!newBlobId) {
        throw new Error("Không tìm thấy blobId trong phản hồi từ Walrus!");
      }

      const url_image = `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${newBlobId}`;
      // Mint memory NFT on chain
      await handleMint(url_image);
    } catch (err) {
      console.error("❌ Upload error:", err);
      alert(`Upload lỗi: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Mint memory NFT on chain
  const handleMint = async (urlImage) => {
    if (!account) {
      dispatch(walletModalShow());
      return;
    }

    setLoading(true);
    try {
      const tx = new Transaction();

      // Get gas coin for payment (0.03 SUI for mint fee)
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(50_000_000)]); // 0.05 SUI

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_nft::mint_memory`,
        arguments: [
          tx.object(CONTRACT_CONFIG.MEMORY_REGISTRY_ID), // MemoryRegistry object
          tx.pure.string(inputText || "My Memory"),
          tx.pure.string("Checkin memory from NFT app"),
          tx.pure.string(urlImage),
          tx.pure.string(position.latitude || "0"),
          tx.pure.string(position.longitude || "0"),
          coin,
          tx.object("0x6"), // Clock object
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            // Wait for transaction to finalize
            const txDetails = await client.waitForTransaction({
              digest: result.digest,
              options: { showObjectChanges: true },
            });

            // Find created MemoryNFT object
            const createdObject = txDetails.objectChanges?.find(
              (change) =>
                change.type === "created" &&
                change.objectType?.includes("MemoryNFT")
            );

            if (createdObject?.objectId) {
              // Fetch the NFT object details
              const nftObject = await client.getObject({
                id: createdObject.objectId,
                options: { showContent: true },
              });

              const fields = nftObject.data?.content?.fields;

              setNftInfo({
                id: createdObject.objectId,
                name: fields?.name || inputText || "My Memory",
                content: fields?.content || "",
                image_url: fields?.image_url || urlImage,
                latitude: fields?.latitude || position.latitude,
                longitude: fields?.longitude || position.longitude,
                rarity: fields?.rarity || 0,
                perfection: fields?.perfection || 0,
                created_at: new Date().toISOString(),
                digest: result.digest,
              });
            } else {
              // Fallback if object not found
              setNftInfo({
                name: inputText || "My Memory",
                image_url: urlImage,
                latitude: position.latitude,
                longitude: position.longitude,
                created_at: new Date().toISOString(),
                digest: result.digest,
              });
            }

            setInputText("");
            setLoading(false);
          },
          onError: (error) => {
            console.error("Mint failed:", error);
            alert(`Mint failed: ${error.message}`);
            setLoading(false);
          },
        }
      );
    } catch (error) {
      console.error("Error minting memory:", error);
      alert(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  const handleRetake = () => {
    setImageBlob(null);
    setImagePreview("");
    setNftInfo(null);
  };

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
      <div className="container text-center py-12">
        <Meta title="Create NFT with Walrus" />
        <h1 className="text-jacarta-700 lg:pt-0 pt-10 font-bold font-display mb-6 text-center text-3xl dark:text-white lg:text-4xl">
          Checkin and mint NFT
        </h1>

        {!imageBlob && <CameraCapture onCapture={handleCapture} />}

        {imageBlob && (
          <div className="flex flex-col items-center gap-4">
            {!nftInfo && (
              <img
                src={imagePreview}
                alt="preview"
                className="w-64 h-64 object-cover rounded shadow-md"
              />
            )}

            <div className="flex gap-2 items-center">
              <input
                type="search"
                className="text-jacarta-700 placeholder-jacarta-500 focus:ring-accent border-jacarta-100 w-full rounded-2xl border py-[0.6875rem] px-4  dark:border-transparent dark:bg-white/[.15] dark:text-white dark:placeholder-white"
                placeholder="Tên NFT của bạn"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={uploading || loading}
                className="bg-accent shadow-accent-volume hover:bg-accent-dark rounded-full py-2 px-6 text-center font-semibold text-white transition-all disabled:opacity-50"
              >
                {uploading
                  ? "Uploading..."
                  : loading
                  ? "Minting..."
                  : "Upload & Mint"}
              </button>

              <button
                onClick={handleRetake}
                className="text-accent font-display text-sm font-semibold"
              >
                🔄 Chụp lại
              </button>
            </div>

            {uploading && (
              <p className="text-gray-500 animate-pulse mt-2">
                Đang upload ảnh lên Walrus...
              </p>
            )}

            {nftInfo && (
              <div className="mt-6 border-t pt-6 w-full max-w-md text-left">
                <h2 className="text-xl font-semibold mb-3">
                  🎉 Memory NFT Minted!
                </h2>

                {nftInfo.image_url && (
                  <img
                    src={nftInfo.image_url}
                    alt={nftInfo.name}
                    className="w-full rounded-lg shadow-md mb-4 max-h-64 object-cover"
                    onError={(e) => {
                      e.target.src =
                        "https://via.placeholder.com/200?text=Memory";
                    }}
                  />
                )}

                {/* NFT Stats Card */}
                {(nftInfo.rarity !== undefined ||
                  nftInfo.perfection !== undefined) && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-300">
                    <div className="grid grid-cols-2 gap-4">
                      {nftInfo.rarity !== undefined && (
                        <div className="text-center">
                          <p className="text-xs text-gray-600 font-semibold mb-1">
                            RARITY
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-bold text-white ${
                                nftInfo.rarity === 0
                                  ? "bg-gray-500"
                                  : nftInfo.rarity === 1
                                  ? "bg-blue-500"
                                  : nftInfo.rarity === 2
                                  ? "bg-purple-500"
                                  : "bg-yellow-500"
                              }`}
                            >
                              {["Common", "Rare", "Epic", "Legendary"][
                                nftInfo.rarity
                              ] || "Unknown"}
                            </span>
                          </div>
                        </div>
                      )}
                      {nftInfo.perfection !== undefined && (
                        <div className="text-center">
                          <p className="text-xs text-gray-600 font-semibold mb-1">
                            PERFECTION
                          </p>
                          <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">
                            {nftInfo.perfection}
                          </div>
                          <p className="text-xs text-gray-500">/1000</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <ul className="space-y-2 text-gray-700 break-words text-sm">
                  <li>
                    <strong>Name:</strong> {nftInfo.name}
                  </li>
                  {nftInfo.id && (
                    <li>
                      <strong>NFT ID:</strong> {nftInfo.id.substring(0, 16)}...
                    </li>
                  )}
                  {nftInfo.content && (
                    <li>
                      <strong>Content:</strong> {nftInfo.content}
                    </li>
                  )}
                  <li>
                    <strong>Latitude:</strong> {nftInfo.latitude}
                  </li>
                  <li>
                    <strong>Longitude:</strong> {nftInfo.longitude}
                  </li>
                  <li>
                    <strong>Created:</strong>{" "}
                    {new Date(nftInfo.created_at).toLocaleString()}
                  </li>
                </ul>

                <div className="mt-4 flex flex-col gap-2">
                  {nftInfo.latitude && nftInfo.longitude && (
                    <iframe
                      title="Map Preview"
                      width="100%"
                      height="200"
                      className="rounded-lg shadow"
                      loading="lazy"
                      allowFullScreen
                      src={`https://www.google.com/maps?q=${nftInfo.latitude},${nftInfo.longitude}&z=15&output=embed`}
                    />
                  )}
                  {nftInfo.digest && (
                    <a
                      href={`https://suiexplorer.com/txblock/${nftInfo.digest}?network=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 underline text-sm"
                    >
                      View on Sui Explorer
                    </a>
                  )}
                  {nftInfo.id && (
                    <a
                      href={`https://suiexplorer.com/object/${nftInfo.id}?network=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline text-sm"
                    >
                      View NFT on Sui Explorer
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
