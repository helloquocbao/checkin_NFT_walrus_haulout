"use client";
import Image from "next/image";
import Link from "next/link";
import Logo from "../../../public/images/logo.png";
import WhiteLogo from "../../../public/images/logo_white.png";
import { useRouter } from "next-intl/client";
import { UserCog } from "lucide-react";
import {
  isChildrenPageActive,
  isParentPageActive,
} from "@/utils/daynamicNavigation";
import WalletButton from "../wallet-btn/WalletButton";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
function shortenAddress(address, chars = 4) {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
export default function Header01() {
  const [toggle, setToggle] = useState(false);
  const [isCollapse, setCollapse] = useState(null);
  const account = useCurrentAccount(); // địa chỉ ví
  const client = useSuiClient();
  const [balance, setBalance] = useState(null);

  const { push } = useRouter();

  useEffect(() => {
    if (account?.address) {
      client.getBalance({ owner: account.address }).then((res) => {
        // res.balance là số micro-SUI (1 SUI = 10^9 microSUI)
        setBalance(Number(res.totalBalance) / 1_000_000_000);
      });
    }
  }, [account, client]);
  // window resize
  useEffect(() => {
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 1024) {
        setToggle(false);
      }
    });
  });

  const route = useRouter();
  /* -------------------------------------------------------------------------- */
  /*                            daynamic navigations                            */
  /* -------------------------------------------------------------------------- */

  const mobileCollapse = (id) => {
    if (isCollapse === id) {
      return setCollapse(null);
    }
    setCollapse(id);
  };

  return (
    <>
      {/* main desktop menu sart*/}
      <header className="js-page-header fixed top-0 z-20 w-full backdrop-blur transition-colors">
        <div className="flex items-center px-6 py-6 xl:px-24 ">
          <Link legacyBehavior className="shrink-0" href="/">
            <a>
              <Image
                src={Logo}
                height={68}
                width={250}
                alt="Xhibiter | NFT Marketplace"
                className=" h-auto "
              />
            </a>
          </Link>
          {/* End  logo */}

          <div className="js-mobile-menu invisible fixed inset-0 z-10 ml-auto items-center bg-white opacity-0 lg:visible lg:relative lg:inset-auto lg:flex lg:bg-transparent lg:opacity-100">
            <nav className="navbar w-full">
              <ul className="flex flex-col lg:flex-row">
                {/* claim badge */}
                <li className="group">
                  <Link legacyBehavior href="/claim-badge">
                    <a>
                      <button className="text-jacarta-700 font-display hover:text-accent focus:text-accent dark:hover:text-accent dark:focus:text-accent flex items-center justify-between py-3.5 text-base dark:text-white lg:px-5">
                        <span
                          className={
                            isChildrenPageActive(route.asPath, "/claim-badge")
                              ? "text-accent dark:text-accent"
                              : ""
                          }
                        >
                          Claim Badge
                        </span>
                      </button>
                    </a>
                  </Link>
                </li>
                {/* create */}
                <li className="group">
                  <Link legacyBehavior href="/create">
                    <a>
                      <button className="text-jacarta-700 font-display hover:text-accent focus:text-accent flex items-center justify-between py-3.5 text-base lg:px-5">
                        <span
                          className={
                            isChildrenPageActive(route.asPath, "/create")
                              ? "text-accent"
                              : ""
                          }
                        >
                          Check in and mint
                        </span>
                      </button>
                    </a>
                  </Link>
                </li>

                {/* my nfts */}
                <li className="group">
                  <Link legacyBehavior href="/my-nfts">
                    <a>
                      <button className="text-jacarta-700 font-display hover:text-accent focus:text-accent flex items-center justify-between py-3.5 text-base lg:px-5">
                        <span
                          className={
                            isChildrenPageActive(route.asPath, "/my-nfts")
                              ? "text-accent"
                              : ""
                          }
                        >
                          My NFTs
                        </span>
                      </button>
                    </a>
                  </Link>
                </li>

                {/* marketplace */}
                <li className="group">
                  <Link legacyBehavior href="/kiosk">
                    <a>
                      <button className="text-jacarta-700 font-display hover:text-accent focus:text-accent flex items-center justify-between py-3.5 text-base lg:px-5">
                        <span
                          className={
                            isChildrenPageActive(route.asPath, "/kiosk")
                              ? "text-accent"
                              : ""
                          }
                        >
                          Marketplace
                        </span>
                      </button>
                    </a>
                  </Link>
                </li>
              </ul>
            </nav>
            {/* End menu for desktop */}

            <div className="ml-8 hidden items-center lg:flex xl:ml-12">
              <WalletButton />
              {account && (
                <div onClick={() => push("/my-profile")}>
                  <UserCog className="ml-2" />
                </div>
              )}
            </div>
            {/* End header right content (metamask and other) for desktop */}
          </div>
          {/* header menu conent end for desktop */}

          <div className="ml-auto flex lg:hidden">
            <button
              className="js-mobile-toggle border-jacarta-100 hover:bg-accent focus:bg-accent group ml-2 flex h-10 w-10 items-center justify-center rounded-full border bg-white transition-colors hover:border-transparent focus:border-transparent"
              aria-label="open mobile menu"
              onClick={() => setToggle(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width={24}
                height={24}
                className="fill-jacarta-700 h-4 w-4 transition-colors group-hover:fill-white group-focus:fill-white"
              >
                <path fill="none" d="M0 0h24v24H0z" />
                <path d="M18 18v2H6v-2h12zm3-7v2H3v-2h18zm-3-7v2H6V4h12z" />
              </svg>
            </button>
          </div>
          {/* End header right content  for mobile */}
        </div>
        {/* End flex item */}
      </header>
      {/* main desktop menu end */}

      {/* start mobile menu and it's other materials  */}
      <div
        className={`lg:hidden js-mobile-menu dark:bg-jacarta-800 invisible fixed inset-0 z-20 ml-auto items-center bg-white opacity-0 lg:visible lg:relative lg:inset-auto lg:bg-transparent lg:opacity-100 dark:lg:bg-transparent ${
          toggle ? "nav-menu--is-open" : "hidden"
        }`}
      >
        <div className="t-0 dark:bg-jacarta-800 fixed left-0 z-10 flex w-full items-center justify-between bg-white p-6 lg:hidden">
          <div className="dark:hidden">
            <Image
              src={Logo}
              height={28}
              width={130}
              alt="Xhibiter | NFT Marketplace"
              className="max-h-7 h-auto "
            />
          </div>

          <div className="hidden dark:block">
            <Image
              src={WhiteLogo}
              height={28}
              width={130}
              alt="Xhibiter | NFT Marketplace"
            />
          </div>

          <button
            className="js-mobile-close border-jacarta-100 hover:bg-accent focus:bg-accent group dark:hover:bg-accent ml-2 flex h-10 w-10 items-center justify-center rounded-full border bg-white transition-colors hover:border-transparent focus:border-transparent dark:border-transparent dark:bg-white/[.15]"
            onClick={() => setToggle(false)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width={24}
              height={24}
              className="fill-jacarta-700 h-4 w-4 transition-colors group-hover:fill-white group-focus:fill-white dark:fill-white"
            >
              <path fill="none" d="M0 0h24v24H0z" />
              <path d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z" />
            </svg>
          </button>
        </div>
        {/* mobile menu top header content */}

        <nav className="navbar w-full">
          <ul className="flex flex-col lg:flex-row">
            <li className="group" onClick={() => setToggle(false)}>
              <Link legacyBehavior href="/create">
                <a>
                  <button className="text-jacarta-700 font-display hover:text-accent focus:text-accent dark:hover:text-accent dark:focus:text-accent flex items-center justify-between py-3.5 text-base dark:text-white lg:px-5">
                    <span
                      className={
                        isChildrenPageActive("/create", route.asPath)
                          ? "text-accent dark:text-accent"
                          : ""
                      }
                    >
                      Check in and mint
                    </span>
                  </button>
                </a>
              </Link>
            </li>

            <li className="group" onClick={() => setToggle(false)}>
              <Link legacyBehavior href="/my-nfts">
                <a>
                  <button className="text-jacarta-700 font-display hover:text-accent focus:text-accent dark:hover:text-accent dark:focus:text-accent flex items-center justify-between py-3.5 text-base dark:text-white lg:px-5">
                    <span
                      className={
                        isChildrenPageActive("/my-nfts", route.asPath)
                          ? "text-accent dark:text-accent"
                          : ""
                      }
                    >
                      My NFTs
                    </span>
                  </button>
                </a>
              </Link>
            </li>
            <li className="group" onClick={() => setToggle(false)}>
              <Link legacyBehavior href="/claim-badge">
                <a>
                  <button className="text-jacarta-700 font-display hover:text-accent focus:text-accent dark:hover:text-accent dark:focus:text-accent flex items-center justify-between py-3.5 text-base dark:text-white lg:px-5">
                    <span
                      className={
                        isChildrenPageActive("/kiosk", route.asPath)
                          ? "text-accent dark:text-accent"
                          : ""
                      }
                    >
                      Claim Badge
                    </span>
                  </button>
                </a>
              </Link>
            </li>
            <li className="group" onClick={() => setToggle(false)}>
              <Link legacyBehavior href="/create">
                <a>
                  <button className="text-jacarta-700 font-display hover:text-accent focus:text-accent dark:hover:text-accent dark:focus:text-accent flex items-center justify-between py-3.5 text-base dark:text-white lg:px-5">
                    <span
                      className={
                        isChildrenPageActive("/kiosk", route.asPath)
                          ? "text-accent dark:text-accent"
                          : ""
                      }
                    >
                      Check-in and Mint
                    </span>
                  </button>
                </a>
              </Link>
            </li>
            <li className="group" onClick={() => setToggle(false)}>
              <Link legacyBehavior href="/my-nfts">
                <a>
                  <button className="text-jacarta-700 font-display hover:text-accent focus:text-accent dark:hover:text-accent dark:focus:text-accent flex items-center justify-between py-3.5 text-base dark:text-white lg:px-5">
                    <span
                      className={
                        isChildrenPageActive("/kiosk", route.asPath)
                          ? "text-accent dark:text-accent"
                          : ""
                      }
                    >
                      My NFTs
                    </span>
                  </button>
                </a>
              </Link>
            </li>
            <li className="group" onClick={() => setToggle(false)}>
              <Link legacyBehavior href="/kiosk">
                <a>
                  <button className="text-jacarta-700 font-display hover:text-accent focus:text-accent dark:hover:text-accent dark:focus:text-accent flex items-center justify-between py-3.5 text-base dark:text-white lg:px-5">
                    <span
                      className={
                        isChildrenPageActive("/kiosk", route.asPath)
                          ? "text-accent dark:text-accent"
                          : ""
                      }
                    >
                      Marketplace
                    </span>
                  </button>
                </a>
              </Link>
            </li>

            <li className="group" onClick={() => setToggle(false)}>
              <Link legacyBehavior href="/seller-earnings">
                <a>
                  <button className="text-jacarta-700 font-display hover:text-accent focus:text-accent dark:hover:text-accent dark:focus:text-accent flex items-center justify-between py-3.5 text-base dark:text-white lg:px-5">
                    <span
                      className={
                        isChildrenPageActive("/seller-earnings", route.asPath)
                          ? "text-accent dark:text-accent"
                          : ""
                      }
                    >
                      Earnings
                    </span>
                  </button>
                </a>
              </Link>
            </li>
          </ul>
        </nav>
        {/* End navbar mobile menu  */}

        <div className="mt-10 w-full lg:hidden">
          <WalletButton />
        </div>
      </div>
      {/* End mobile menu and it's other materials */}
    </>
  );
}
