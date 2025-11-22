"use client";
// import BidsModal from "./modal/bidsModal";
import BuyModal from "./modal/buyModal";
import Header01 from "./header/Header01";
import { Toaster } from "react-hot-toast";

export default function Layout({ children }) {
  return (
    <>
      <Header01 />
      {/* <BidsModal /> */}
      <Toaster />
      <BuyModal />
      <main>{children}</main>
      {/* <Footer /> */}
    </>
  );
}
