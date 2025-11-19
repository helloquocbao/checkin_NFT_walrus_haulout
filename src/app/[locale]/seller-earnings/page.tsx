"use client";

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

interface KioskInfo {
  id: string;
  proceeds: bigint;
}

export default function SellerEarningsPage() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [kiosk, setKiosk] = useState<KioskInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string>("");
  const [successTx, setSuccessTx] = useState<string>("");

  // 📥 Load kiosk and proceeds
  useEffect(() => {
    if (!account?.address) return;

    const loadKiosk = async () => {
      try {
        setLoading(true);
        setError("");

        console.log("🔍 Loading kiosk for:", account.address);

        // Get user's kiosk
        const kiosks = await getUserKiosks(account.address);

        if (!kiosks || kiosks.length === 0) {
          throw new Error(
            "You don't have a kiosk yet. Create one to start selling!"
          );
        }

        const kioskId = kiosks[0].id;
        console.log("✅ Found kiosk:", kioskId);

        // Get kiosk object to check proceeds
        const kioskObj = await client.getObject({
          id: kioskId,
          options: { showContent: true },
        });

        if (!kioskObj.data?.content) {
          throw new Error("Cannot fetch kiosk details");
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const kioskFields = (kioskObj.data.content as any).fields;

        console.log("📋 Full kiosk fields:", kioskFields);

        // Profits có thể là balance object
        let proceeds = BigInt(0);
        if (kioskFields.profits) {
          // Có thể là { value: string }
          if (
            typeof kioskFields.profits === "object" &&
            kioskFields.profits.value
          ) {
            proceeds = BigInt(kioskFields.profits.value);
          } else if (typeof kioskFields.profits === "string") {
            proceeds = BigInt(kioskFields.profits);
          }
        }

        console.log("💰 Proceeds:", proceeds.toString());

        setKiosk({
          id: kioskId,
          proceeds,
        });
      } catch (err) {
        console.error("❌ Error loading kiosk:", err);
        setError(err instanceof Error ? err.message : "Failed to load kiosk");
      } finally {
        setLoading(false);
      }
    };

    loadKiosk();
  }, [account, client]);

  // 💳 Handle withdraw
  const handleWithdraw = async () => {
    if (!account || !kiosk) {
      setError("Wallet not connected or kiosk not loaded");
      return;
    }

    if (kiosk.proceeds === BigInt(0)) {
      setError("No proceeds to withdraw");
      return;
    }

    setWithdrawing(true);
    setError("");

    try {
      console.log("💳 Starting withdraw...");
      console.log("📌 Kiosk ID:", kiosk.id);

      // Get KioskOwnerCap
      const caps = await client.getOwnedObjects({
        owner: account.address,
        options: { showType: true },
      });

      const capObj = caps.data.find((obj) =>
        obj.data?.type?.includes("KioskOwnerCap")
      );

      if (!capObj) {
        throw new Error(
          "KioskOwnerCap not found. Make sure you're the kiosk owner."
        );
      }

      const capId = capObj.data?.objectId;
      if (!capId) {
        throw new Error("Cannot find KioskOwnerCap ID");
      }
      console.log("✅ Found cap:", capId);

      // Create transaction
      const tx = new Transaction();

      // Call withdraw_profits (no Option parameter needed - always withdraws all)
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::withdraw_profits`,
        arguments: [
          tx.object(kiosk.id), // kiosk
          tx.object(capId), // cap
          // ctx is implicit, no need to pass
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
            console.log("✅ Withdraw successful!");
            console.log("📜 Transaction digest:", result.digest);
            setSuccessTx(result.digest);
            setWithdrawing(false);

            // Reload kiosk after 2 seconds
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          },
          onError: (err) => {
            console.error("❌ Withdraw failed:", err);
            setError(err instanceof Error ? err.message : "Withdraw failed");
            setWithdrawing(false);
          },
        }
      );
    } catch (err) {
      console.error("❌ Error during withdraw:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setWithdrawing(false);
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
              <p className="mt-4 text-lg">Loading earnings...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!account) {
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
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <p className="mt-4 text-lg text-red-500">
                Please connect your wallet
              </p>
              <Link
                href="/"
                className="mt-4 inline-block bg-accent text-white px-6 py-2 rounded-full"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error && !kiosk) {
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
            <div className="text-center max-w-md">
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
              <p className="mt-4 text-lg text-red-500">{error}</p>
              <Link
                href="/kiosk"
                className="mt-4 inline-block bg-accent text-white px-6 py-2 rounded-full"
              >
                Go to Marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!kiosk) {
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
              <p className="text-lg">Loading...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const proceedsInSUI = Number(kiosk.proceeds) / 1e9;

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
          <Link
            href="/"
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
          </Link>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="rounded-lg overflow-hidden shadow-lg bg-white dark:bg-jacarta-700 p-8">
            <h1 className="text-4xl font-bold mb-8 dark:text-white">
              💰 Seller Earnings
            </h1>

            {/* Earnings Display */}
            <div className="mb-8 p-8 bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg border border-accent/20">
              <p className="text-sm text-gray-600 dark:text-jacarta-300 mb-2">
                Available to Withdraw
              </p>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-5xl font-bold text-accent">
                  {proceedsInSUI.toFixed(4)}
                </span>
                <span className="text-2xl font-semibold dark:text-white">
                  SUI
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-jacarta-400">
                ≈ ${(proceedsInSUI * 2).toFixed(2)} USD (approx)
              </p>
            </div>

            {/* Info Box */}
            <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-blue-800 dark:text-blue-300 text-sm">
                ℹ️ These are your sales proceeds from marketplace purchases.
                Withdraw anytime to your wallet.
              </p>
            </div>

            {/* Withdraw Form - Always withdraw all */}
            <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-blue-800 dark:text-blue-300 text-sm">
                ℹ️ Click &quot;Withdraw Now&quot; to withdraw all available
                earnings ({proceedsInSUI.toFixed(4)} SUI)
              </p>
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
                <p className="text-green-600 dark:text-green-400 text-sm font-semibold mb-2">
                  ✅ Withdrawal Successful!
                </p>
                <p className="text-green-600 dark:text-green-400 text-xs font-mono break-all">
                  {successTx}
                </p>
                <p className="text-green-700 dark:text-green-300 text-xs mt-2">
                  Funds will arrive in your wallet shortly...
                </p>
              </div>
            )}

            {/* Withdraw Button */}
            <button
              onClick={handleWithdraw}
              disabled={withdrawing || proceedsInSUI === 0 || successTx !== ""}
              className={`w-full py-4 px-6 rounded-full font-semibold text-lg text-white transition-all ${
                withdrawing || proceedsInSUI === 0 || successTx
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-accent hover:bg-accent-dark shadow-accent-volume hover:shadow-lg"
              }`}
            >
              {withdrawing ? (
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
              ) : proceedsInSUI === 0 ? (
                "🎉 No Earnings Yet"
              ) : successTx ? (
                "✅ Withdrawn"
              ) : (
                "🏦 Withdraw Now"
              )}
            </button>

            {/* Links */}
            <div className="mt-8 pt-8 border-t border-jacarta-100 dark:border-jacarta-600 flex gap-4">
              <Link
                href="/kiosk"
                className="flex-1 py-3 px-4 text-center bg-jacarta-100 dark:bg-jacarta-600 text-gray-900 dark:text-white rounded-full font-medium hover:bg-jacarta-200 dark:hover:bg-jacarta-500 transition-colors"
              >
                📦 Browse Marketplace
              </Link>
              <Link
                href="/my-nfts"
                className="flex-1 py-3 px-4 text-center bg-jacarta-100 dark:bg-jacarta-600 text-gray-900 dark:text-white rounded-full font-medium hover:bg-jacarta-200 dark:hover:bg-jacarta-500 transition-colors"
              >
                🎨 My NFTs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
