"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import {
  getProfileDetails,
  voteForProfile,
  claimVerification,
  getActualVoteCount,
  getUserMemoryNFTs,
  getKioskItems,
} from "@/services/profileService";

import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";
import GridLayout from "./GridLayout";
import CardBadge from "./CardBadge";
import CardMemoryNFT from "./CardMemoryNFT";
import CardKiosk from "./CardKiosk";
import Tippy from "@tippyjs/react";
import toast from "react-hot-toast";

interface Badge {
  location_id: number;
  location_name: string;
  image_url: string;
  rarity: number;
  perfection: number;
  created_at: number;
}

interface ProfileInfo {
  name: string;
  bio: string;
  avatar_url: string;
  country: string;
  created_at: number;
  badge_count: number;
  total_claims: number;
  is_verified: boolean;
  verify_votes: number;
}

interface MemoryNFT {
  id: string;
  name: string;
  content: string;
  image_url: string;
  latitude: string;
  longitude: string;
  rarity: number;
  perfection: number;
  created_at: string;
}

interface KioskListing {
  listingId: string;
  memoryId: string;
  seller: string;
  price: string;
  listedAt: string;
  name: string;
  content: string;
  imageUrl: string;
  latitude: string;
  longitude: string;
  rarity: number;
  perfection: number;
}

export default function UserProfilePage() {
  const params = useParams();
  const profileId = params.id as string;
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [imageModal, setImageModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [memoryNFTs, setMemoryNFTs] = useState<MemoryNFT[]>([]);
  const [kioskListings, setKioskListings] = useState<KioskListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [verifyThreshold, setVerifyThreshold] = useState(3);
  const [canClaimVerify, setCanClaimVerify] = useState(false);
  const [voting, setVoting] = useState(false);
  const [claimingVerify, setClaimingVerify] = useState(false);

  const [userProfile, setUserProfile] = useState<{
    objectId: string;
    address: string;
  } | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load profile details
        const profile = await getProfileDetails(profileId);
        if (!profile || !profile.data?.content) {
          setError("Profile not found");
          setLoading(false);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fields = (profile.data.content as any).fields;

        // Extract profile info
        const profileData: ProfileInfo = {
          name: fields.name,
          bio: fields.bio,
          avatar_url: fields.avatar_url,
          country: fields.country,
          created_at: parseInt(fields.created_at),
          badge_count: parseInt(fields.badge_count),
          total_claims: parseInt(fields.total_claims),
          is_verified: fields.is_verified,
          verify_votes: parseInt(fields.verify_votes),
        };

        // Get actual vote count from VoterRegistry
        const profileOwnerAddress = fields.owner || "";
        if (profileOwnerAddress) {
          try {
            const actualVotes = await getActualVoteCount(profileOwnerAddress);
            profileData.verify_votes = actualVotes;
          } catch (err) {
            console.error("Failed to get actual votes:", err);
            // Keep the value from profile
          }
        }

        setProfileInfo(profileData);
        setUserProfile({
          objectId: profileId,
          address: fields.owner || "",
        });

        // Calculate if user can claim verification
        const threshold = 3; // Default verify threshold
        setVerifyThreshold(threshold);
        setCanClaimVerify(
          !profileData.is_verified && profileData.verify_votes >= threshold
        );

        // Extract badges
        const claimedBadges = fields.claimed_badges || [];
        const badgesData: Badge[] = Array.isArray(claimedBadges)
          ? claimedBadges.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (badgeInfo: any) => {
                const data = badgeInfo.fields ? badgeInfo.fields : badgeInfo;

                return {
                  location_id:
                    typeof data.location_id === "string"
                      ? parseInt(data.location_id)
                      : data.location_id,
                  location_name: data.location_name || "",
                  image_url: data.image_url || "",
                  rarity:
                    typeof data.rarity === "string"
                      ? parseInt(data.rarity)
                      : data.rarity,
                  perfection:
                    typeof data.perfection === "string"
                      ? parseInt(data.perfection)
                      : data.perfection,
                  created_at:
                    typeof data.created_at === "string"
                      ? parseInt(data.created_at)
                      : data.created_at,
                };
              }
            )
          : [];

        setBadges(badgesData);

        // Load user's memory NFTs
        if (fields.owner) {
          try {
            const nfts = await getUserMemoryNFTs(fields.owner);
            setMemoryNFTs(nfts);
          } catch (err) {
            console.error("Error loading memory NFTs:", err);
          }
        }

        // Load user's kiosk listings
        try {
          const allListings = await getKioskItems();

          const userListings = allListings.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (item: any) => item.seller === fields.owner
          );

          setKioskListings(userListings as KioskListing[]);
        } catch (err) {
          console.error("Error loading kiosk listings:", err);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    if (profileId) {
      loadData();
    }
  }, [profileId]);

  // Get rarity name
  const getRarityName = (rarity: number) => {
    switch (rarity) {
      case 0:
        return "Common";
      case 1:
        return "Rare";
      case 2:
        return "Epic";
      case 3:
        return "Legendary";
      default:
        return "Unknown";
    }
  };

  // Get rarity color
  const getRarityColor = (rarity: number) => {
    switch (rarity) {
      case 0:
        return "text-gray-600 bg-gray-100";
      case 1:
        return "text-blue-600 bg-blue-100";
      case 2:
        return "text-purple-600 bg-purple-100";
      case 3:
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle vote for profile
  const handleVoteForProfile = async () => {
    if (!currentAccount?.address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!userProfile?.address) {
      toast.error("Profile owner address not found");

      return;
    }

    if (currentAccount.address === userProfile.address) {
      toast.error("You cannot vote for yourself");

      return;
    }

    try {
      setVoting(true);
      // Pass the owner address, not the object ID
      const tx = await voteForProfile(userProfile.address);
      signAndExecute(
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          transaction: tx as any,
        },
        {
          onSuccess: () => {
            toast.success("Vote successful! ✓");

            setHasVoted(true);
            // Reload profile to update vote count
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          },
          onError: (error) => {
            console.error("Vote failed:", error);
            toast.error("Vote failed");
          },
        }
      );
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Vote failed");
    } finally {
      setVoting(false);
    }
  };

  // Handle claim verification
  const handleClaimVerification = async () => {
    if (!currentAccount?.address) {
      toast.error("Please connect your wallet first");

      return;
    }

    if (!userProfile?.objectId) {
      toast.error("Profile not found");
      return;
    }

    try {
      setClaimingVerify(true);
      const tx = await claimVerification(userProfile.objectId);
      signAndExecute(
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          transaction: tx as any,
        },
        {
          onSuccess: () => {
            toast.success("Transaction submitted! Awaiting confirmation...");

            // Reload profile to update verified status
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          },
          onError: (error) => {
            toast.error("Claim verification failed");
          },
        }
      );
    } catch (error) {
      console.error("Error claiming verification:", error);
      toast.error(
        error instanceof Error ? error.message : "Claim verification failed"
      );
    } finally {
      setClaimingVerify(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !profileInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-32">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || "Profile not found"}
          </h1>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  console.log("Profile Info:", profileInfo);

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
      <div className="container mx-auto min-h-screen bg-gray-50 pt-24 pb-16">
        <div className="md:flex md:flex-wrap">
          <figure className="mb-8 md:w-2/5 md:flex-shrink-0 md:flex-grow-0 md:basis-auto lg:w-1/2 w-full">
            <button className=" w-full" onClick={() => setImageModal(true)}>
              <img
                src={profileInfo?.avatar_url}
                alt={"title"}
                className="rounded-2xl cursor-pointer  w-full"
              />
            </button>

            {/* <!-- Modal --> */}
            <div
              className={imageModal ? "modal fade show block" : "modal fade"}
            >
              <div className="modal-dialog !my-0 flex h-full max-w-4xl items-center justify-center">
                <img
                  src={profileInfo?.avatar_url}
                  alt={"ád"}
                  className="h-full rounded-2xl"
                />
              </div>

              <button
                type="button"
                className="btn-close absolute top-6 right-6"
                onClick={() => setImageModal(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  className="h-6 w-6 fill-white"
                >
                  <path fill="none" d="M0 0h24v24H0z" />
                  <path d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z" />
                </svg>
              </button>
            </div>
            {/* <!-- end modal --> */}
          </figure>
          <div className="md:w-3/5 md:basis-auto md:pl-8 lg:w-1/2 lg:pl-[3.75rem]">
            {/* <!-- Collection / Likes / Actions --> */}
            <div className="mb-3 flex">
              {/* <!-- Collection --> */}
              <div className="flex items-center">
                <a className="text-accent mr-2 text-sm font-bold">
                  NFT Profile
                </a>
              </div>
            </div>

            <h1 className="font-display text-jacarta-700 mb-4 text-4xl font-semibold dark:text-white">
              {profileInfo?.name}
            </h1>

            <div className="mb-8 flex items-center space-x-4 whitespace-nowrap">
              <div className="flex items-center">
                <Tippy content={<span>SUI</span>}>
                  <span className="mr-1">
                    <svg
                      className=" w-4 h-4 "
                      viewBox="0 0 300 384"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M240.057 159.914C255.698 179.553 265.052 204.39 265.052 231.407C265.052 258.424 255.414 284.019 239.362 303.768L237.971 305.475L237.608 303.31C237.292 301.477 236.929 299.613 236.502 297.749C228.46 262.421 202.265 232.134 159.148 207.597C130.029 191.071 113.361 171.195 108.985 148.586C106.157 133.972 108.258 119.294 112.318 106.717C116.379 94.1569 122.414 83.6187 127.549 77.2831L144.328 56.7754C147.267 53.1731 152.781 53.1731 155.719 56.7754L240.073 159.914H240.057ZM266.584 139.422L154.155 1.96703C152.007 -0.655678 147.993 -0.655678 145.845 1.96703L33.4316 139.422L33.0683 139.881C12.3868 165.555 0 198.181 0 233.698C0 316.408 67.1635 383.461 150 383.461C232.837 383.461 300 316.408 300 233.698C300 198.181 287.613 165.555 266.932 139.896L266.568 139.438L266.584 139.422ZM60.3381 159.472L70.3866 147.164L70.6868 149.439C70.9237 151.24 71.2239 153.041 71.5715 154.858C78.0809 189.001 101.322 217.456 140.173 239.496C173.952 258.724 193.622 280.828 199.278 305.064C201.648 315.176 202.059 325.129 201.032 333.835L200.969 334.372L200.479 334.609C185.233 342.05 168.09 346.237 149.984 346.237C86.4546 346.237 34.9484 294.826 34.9484 231.391C34.9484 204.153 44.4439 179.142 60.3065 159.44L60.3381 159.472Z"
                        fill="#4DA2FF"
                      />
                    </svg>
                  </span>
                </Tippy>
                <span className="text-green text-sm font-medium tracking-tight">
                  SUI Chain NFT
                </span>
              </div>
              <span className="dark:text-jacarta-300 text-jacarta-400 text-sm">
                Create: {formatDate(profileInfo?.created_at)}
              </span>
              <span className="dark:text-jacarta-300 text-jacarta-400 text-sm">
                Country:{" "}
                {profileInfo?.country !== "" ? profileInfo?.country : "N/A"}
              </span>
            </div>

            <p className="dark:text-jacarta-300 mb-10 line-clamp-3">
              {profileInfo?.bio}
            </p>

            {/* <!-- Creator / Owner --> */}
            <div className="mb-8 flex flex-wrap">
              <div className="mr-8 mb-4 flex">
                <figure className="mr-4 shrink-0">
                  <a className="relative block">
                    <img
                      src={""}
                      alt={""}
                      className="rounded-2lg h-12 w-12"
                      loading="lazy"
                    />
                    <div
                      className="dark:border-jacarta-600 bg-green absolute -right-3 top-[60%] flex h-6 w-6 items-center justify-center rounded-full border-2 border-white"
                      data-tippy-content="Verified Collection"
                    >
                      <Tippy content={<span>Verified Collection</span>}>
                        <svg className="icon h-[.875rem] w-[.875rem] fill-white">
                          <use xlinkHref="/icons.svg#icon-right-sign"></use>
                        </svg>
                      </Tippy>
                    </div>
                  </a>
                </figure>
                <div className="flex flex-col justify-center">
                  <span className="text-jacarta-400 block text-sm dark:text-white">
                    Total <strong> claim Badge</strong>
                  </span>

                  <a className="text-accent block">
                    <span className="text-sm font-bold">
                      {profileInfo?.badge_count} badge
                    </span>
                  </a>
                </div>
              </div>

              <div className="mb-4 flex">
                <figure className="mr-4 shrink-0">
                  <a className="relative block">
                    <img
                      src={""}
                      alt={""}
                      className="rounded-2lg h-12 w-12"
                      loading="lazy"
                    />
                    <div
                      className="dark:border-jacarta-600 bg-green absolute -right-3 top-[60%] flex h-6 w-6 items-center justify-center rounded-full border-2 border-white"
                      data-tippy-content="Verified Collection"
                    >
                      <Tippy content={<span>Verified Collection</span>}>
                        <svg className="icon h-[.875rem] w-[.875rem] fill-white">
                          <use xlinkHref="/icons.svg#icon-right-sign"></use>
                        </svg>
                      </Tippy>
                    </div>
                  </a>
                </figure>
                <div className="flex flex-col justify-center">
                  <span className="text-jacarta-400 block text-sm dark:text-white">
                    Checkin
                  </span>

                  <a className="text-accent block">
                    <span className="text-sm font-bold">
                      {profileInfo?.badge_count} Location
                    </span>
                  </a>
                </div>
              </div>
            </div>

            {/* <!-- Bid --> */}
            <div className="dark:bg-jacarta-700 dark:border-jacarta-600 border-jacarta-100 rounded-2lg border bg-white p-8">
              <div className="mb-8 sm:flex sm:flex-wrap">
                {/* <!-- Highest bid --> */}
                <div className="w-full">
                  <div className="block overflow-hidden text-ellipsis whitespace-nowrap">
                    <a
                      href={`https://suiscan.xyz/testnet/object/${params?.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="dark:text-jacarta-300 text-jacarta-400 text-sm">
                        NFT onchain:{" "}
                      </span>
                      <span className="text-accent text-sm font-bold">
                        {params?.id}
                      </span>
                    </a>
                  </div>
                  <div className="mt-3 ">
                    <p className="text-gray-600 text-center mb-4">
                      <span className="text-blue-600 font-bold">
                        {profileInfo.verify_votes > verifyThreshold ? (
                          <span>
                            Verified status:{" "}
                            <span
                              className="dark:border-jacarta-600 bg-green inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white"
                              data-tippy-content="Verified Collection"
                            >
                              <Tippy content={<span>Verified Collection</span>}>
                                <svg className="icon h-[.875rem] w-[.875rem] fill-white">
                                  <use xlinkHref="/icons.svg#icon-right-sign"></use>
                                </svg>
                              </Tippy>
                            </span>
                          </span>
                        ) : (
                          <>
                            Current votes: {profileInfo.verify_votes}/
                            {verifyThreshold}
                          </>
                        )}
                      </span>
                    </p>

                    <p className="text-xs text-gray-500 mt-2 text-center">
                      You can vote for up to 2 users.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleVoteForProfile()}
                className="bg-accent shadow-accent-volume hover:bg-accent-dark inline-block w-full rounded-full py-3 px-8 text-center font-semibold text-white transition-all"
              >
                {currentAccount?.address
                  ? "👍 Vote for this user"
                  : "Connect wallet to Vote for this user"}
              </button>
            </div>
            {/* <!-- end bid --> */}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4">
          {/* ===================== BADGES ===================== */}
          <section className="mb-16">
            <SectionHeader
              title="🏅 Claimed Badges"
              subtitle={`${badges.length} badge${
                badges.length !== 1 ? "s" : ""
              } earned`}
            />

            {badges.length === 0 ? (
              <EmptyState
                icon="🎖️"
                title="No badges yet"
                message="Badges you claim will appear here."
                actionLabel="Claim Your First Badge"
                actionHref="/claim-badge"
              />
            ) : (
              <GridLayout>
                {badges.map((b) => (
                  <CardBadge
                    key={b.location_id}
                    badge={b}
                    getRarityColor={getRarityColor}
                    getRarityName={getRarityName}
                  />
                ))}
              </GridLayout>
            )}
          </section>

          {/* ===================== MEMORY NFTs ===================== */}
          <section className="mb-16">
            <SectionHeader
              title="📸 Memory NFTs"
              subtitle={`${memoryNFTs.length} memories recorded`}
            />

            {memoryNFTs.length === 0 ? (
              <EmptyState icon="📸" title="No memories yet" />
            ) : (
              <GridLayout>
                {memoryNFTs.map((nft) => (
                  <CardMemoryNFT
                    key={nft.id}
                    nft={nft}
                    getRarityColor={getRarityColor}
                    getRarityName={getRarityName}
                  />
                ))}
              </GridLayout>
            )}
          </section>

          {/* ===================== KIOSK LISTING ===================== */}
          <section className="mb-16">
            <SectionHeader
              title="🛍️ Kiosk Listings"
              subtitle={`${kioskListings.length} NFT listed for sale`}
            />

            {kioskListings.length === 0 ? (
              <EmptyState icon="🛍️" title="No items on sale" />
            ) : (
              <GridLayout>
                {kioskListings.map((item) => (
                  <CardKiosk
                    key={item.listingId}
                    listing={item}
                    getRarityColor={getRarityColor}
                    getRarityName={getRarityName}
                  />
                ))}
              </GridLayout>
            )}
          </section>

          {/* ===================== VOTING ===================== */}
          <section className="mb-20">
            <SectionHeader
              title="🗳️ Help Verify This User"
              subtitle="Vote to increase trust and transparency"
            />

            {profileInfo.is_verified ? (
              <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-center">
                <div className="text-5xl">✓</div>
                <p className="mt-2 text-green-700 font-semibold">
                  This user is already verified.
                </p>
              </div>
            ) : (
              <div className="bg-white shadow-md p-8 rounded-xl">
                <p className="text-gray-600 text-center mb-4">
                  Current votes:{" "}
                  <span className="text-blue-600 font-bold">
                    {profileInfo.verify_votes}/{verifyThreshold}
                  </span>
                </p>

                {profileInfo.verify_votes === verifyThreshold ? (
                  <>
                    <button
                      onClick={handleClaimVerification}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:bg-gray-400"
                    >
                      {claimingVerify
                        ? "Processing..."
                        : "✅ Claim Verification"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleVoteForProfile}
                    disabled={voting || hasVoted}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:bg-gray-400"
                  >
                    {voting
                      ? "Processing..."
                      : hasVoted
                      ? "✓ Voted"
                      : "👍 Vote for this user"}
                  </button>
                )}
                <p className="text-xs text-gray-500 mt-2 text-center">
                  You can vote for up to 2 users.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
