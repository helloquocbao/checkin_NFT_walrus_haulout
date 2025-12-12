"use client";

import {
  SuiClientProvider,
  createNetworkConfig,
  WalletProvider,
} from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRef } from "react";
import UserContext from "@/components/UserContext";

const { networkConfig } = createNetworkConfig({
  testnet: { url: "https://fullnode.testnet.sui.io:443" },
});

const queryClient = new QueryClient();

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef({
    scrollPos: 0,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <UserContext.Provider value={{ scrollRef: scrollRef }}>
          <WalletProvider autoConnect={true}>{children}</WalletProvider>
        </UserContext.Provider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
