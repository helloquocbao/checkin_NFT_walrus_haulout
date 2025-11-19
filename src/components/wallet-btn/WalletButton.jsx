"use client";
import { ConnectButton } from "@mysten/dapp-kit";
import { Wallet } from "lucide-react";

export default function WalletButton() {
  return (
    <>
      <ConnectButton connectText={<Wallet />} />
    </>
  );
}
