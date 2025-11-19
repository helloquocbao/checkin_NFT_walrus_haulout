"use client";
// import BidsModal from "./modal/bidsModal";
import BuyModal from "./modal/buyModal";
import Header01 from "./header/Header01";

export default function Layout({ children }) {
  return (
    <>
      <Header01 />
      {/* <BidsModal /> */}
      <BuyModal />
      <main>{children}</main>
      {/* <Footer /> */}
    </>
  );
}
