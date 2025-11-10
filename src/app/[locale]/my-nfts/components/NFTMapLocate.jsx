"use client";

import dynamic from "next/dynamic";
import React from "react";

const NFTMapCore = dynamic(() => import("./NFTMapCore"), {
  ssr: false,
  loading: () => <p className="text-center text-gray-500">Loading map...</p>,
});

export default function NFTMapLocate() {
  return (
    <div className="mt-8 h-[500px] rounded-xl overflow-hidden shadow-lg animate-fade-in">
      <NFTMapCore />
    </div>
  );
}
