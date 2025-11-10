"use client";
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { walletModalhide } from "../../redux/counterSlice";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";

const Wallet_modal = () => {
  const walletModal = useSelector((state) => state.counter.walletModal);
  const dispatch = useDispatch();
  const account = useCurrentAccount();

  const suiWalletUrl = "https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil";

  return (
    <div>
      {/* <!-- Wallet Modal --> */}
      <div
        className={
          walletModal
            ? "block modal fade show fixed inset-0 z-50 overflow-y-auto bg-black/50"
            : "modal fade hidden"
        }
      >
        <div className="modal-dialog max-w-lg mx-auto mt-20">
          <div className="modal-content bg-white dark:bg-jacarta-800 rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="modal-header flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-jacarta-600">
              <h5 className="modal-title text-lg font-semibold text-jacarta-700 dark:text-white">
                Connect your Sui wallet
              </h5>
              <button
                type="button"
                className="btn-close text-gray-500 hover:text-gray-700 dark:text-gray-300"
                onClick={() => dispatch(walletModalhide())}
              >
                ✖
              </button>
            </div>

            {/* Body */}
            <div className="modal-body p-6 text-center">
              {/* Nếu đã kết nối ví */}
              {account ? (
                <div>
                  <p className="dark:text-white mb-3">
                    ✅ Connected wallet:
                  </p>
                  <p className="font-mono text-sm text-accent">
                    {account.address.slice(0, 10)}...{account.address.slice(-6)}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">
                    You can now mint NFTs and interact with the Sui network.
                  </p>
                </div>
              ) : (
                <>
                  <svg
                    className="icon mb-4 inline-block h-8 w-8 text-blue-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <p className="text-center text-gray-700 dark:text-white mb-4">
                    Connect your Sui wallet to continue.
                  </p>

                  {/* Nút connect của dapp-kit */}
                  <div className="flex justify-center mb-4">
                    <ConnectButton />
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Don’t have Sui Wallet?{" "}
                    <a
                      href={suiWalletUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-accent underline"
                    >
                      Get it here
                    </a>
                    .
                  </p>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer p-4 border-t border-gray-200 dark:border-jacarta-600 flex justify-center">
              {!account && (
                <a
                  href={suiWalletUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="bg-accent shadow-accent-volume hover:bg-accent-dark rounded-full py-3 px-8 text-center font-semibold text-white transition-all"
                >
                  Install Sui Wallet
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet_modal;
