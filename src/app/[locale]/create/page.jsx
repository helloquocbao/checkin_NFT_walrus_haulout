"use client";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import CameraCapture from "@/components/cameraCapture/CameraCapture";
import Meta from "@/components/Meta";
import { walletModalShow } from "@/redux/counterSlice";
import {
  useSignAndExecuteTransaction,
  useCurrentAccount,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

export default function Create() {
  const dispatch = useDispatch();
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

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
      dispatch(walletModalShow());
      return;
    }

    if (!imageBlob) {
      alert("Vui lòng chụp ảnh trước khi upload!");
      return;
    }

    if (!position.latitude || !position.longitude) {
      alert(
        "⚠️ Vui lòng bật GPS và cấp quyền truy cập vị trí trước khi mint NFT!"
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
      console.log("✅ Walrus upload info:", info);

      const newBlobId =
        info?.newlyCreated?.blobObject?.blobId || info?.blobObject?.blobId;

      if (!newBlobId) {
        throw new Error("Không tìm thấy blobId trong phản hồi từ Walrus!");
      }

      console.log("🆔 Blob ID:", newBlobId);

      await handleMint(newBlobId);
    } catch (err) {
      console.error("❌ Upload error:", err);
      alert(`Upload lỗi: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // 🧩 Mint NFT
  const handleMint = async (newBlobId) => {
    if (!account) {
      dispatch(walletModalShow());
      return;
    }

    setLoading(true);
    try {
      console.log("🚀 Bắt đầu mint NFT với blobId:", newBlobId);
      const tx = new Transaction();

      tx.moveCall({
        target: `0xcc84871dc79970f2dab50400699552c2ebeba058c8e6a8a4e9f5ace44464311f::checkin_nft::mint`,
        arguments: [
          tx.pure.string(inputText || "My NFT"),
          tx.pure.string(newBlobId),
          tx.pure.string(position.latitude),
          tx.pure.string(position.longitude),
        ],
      });

      const result = await signAndExecute({
        transaction: tx,
        chain: "sui:testnet",
      });

      // Chờ transaction hoàn tất
      const txDetails = await client.waitForTransaction({
        digest: result.digest,
        options: { showEvents: true, showObjectChanges: true },
      });

      console.log("📜 Tx details:", txDetails);
      setInputText("");
      const created = txDetails.objectChanges?.find(
        (c) => c.type === "created"
      );
      const objectId = created?.objectId;

      if (objectId) {
        const nftObject = await client.getObject({
          id: objectId,
          options: { showContent: true },
        });

        console.log("🎨 NFT Object:", nftObject);

        const fields = nftObject.data?.content?.fields;

        setNftInfo({
          id: objectId,
          name: fields?.name,
          image_url: fields?.image_url,
          rarity: fields?.rarity,
          completion: fields?.completion,
          latitude: fields?.latitude,
          longitude: fields?.longitude,
          owner: fields?.owner,
          digest: result.digest,
        });
      } else {
        alert("Không tìm thấy objectId trong transaction!");
      }
    } catch (err) {
      console.error("Mint error:", err);
      alert("Mint thất bại!");
    } finally {
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
                className="bg-accent shadow-accent-volume hover:bg-accent-dark rounded-full py-2 px-6 text-center font-semibold text-white transition-all"
              >
                {uploading
                  ? "Uploading..."
                  : loading
                  ? "Minting..."
                  : "✨ Upload & Mint"}
              </button>

              <button
                onClick={handleRetake}
                className="text-accent font-display text-sm font-semibold"
              >
                🔄 Chụp lại
              </button>
            </div>

            {loading && (
              <p className="text-gray-500 animate-pulse mt-2">
                Đang xử lý mint NFT...
              </p>
            )}

            {nftInfo && (
              <div className="mt-6 border-t pt-6 w-full max-w-md text-left">
                <h2 className="text-xl font-semibold mb-3">🎉 NFT Minted!</h2>

                <img
                  src={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${nftInfo.image_url}`}
                  alt={nftInfo.name}
                  className="w-full rounded-lg shadow-md mb-4"
                />

                <ul className="space-y-1 text-gray-700 break-words">
                  <li>
                    <strong>ID:</strong> {nftInfo.id}
                  </li>
                  <li>
                    <strong>Name:</strong> {nftInfo.name}
                  </li>
                  <li>
                    <strong>Rarity:</strong> {nftInfo.rarity}
                  </li>
                  <li>
                    <strong>Completion:</strong> {nftInfo.completion}
                  </li>
                  <li>
                    <strong>Latitude:</strong> {nftInfo.latitude}
                  </li>
                  <li>
                    <strong>Longitude:</strong> {nftInfo.longitude}
                  </li>
                  <li>
                    <strong>Owner:</strong> {nftInfo.owner}
                  </li>
                </ul>

                <div className="mt-4 flex flex-col gap-2">
                  {nftInfo.latitude && nftInfo.longitude && (
                    <iframe
                      title="Map Preview"
                      width="100%"
                      height="250"
                      className="rounded-lg shadow"
                      loading="lazy"
                      allowFullScreen
                      src={`https://www.google.com/maps?q=${nftInfo.latitude},${nftInfo.longitude}&z=15&output=embed`}
                    />
                  )}
                  <a
                    href={`https://suiexplorer.com/txblock/${nftInfo.digest}?network=testnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 underline"
                  >
                    🔍 View on Sui Explorer
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
