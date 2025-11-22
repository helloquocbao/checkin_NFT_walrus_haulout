"use client";

import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getProfileByAddress,
  hasProfile,
  claimBadge,
} from "@/services/profileService";
import { getAllLocations } from "@/services/locationService";
import toast from "react-hot-toast";

interface Location {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  imageCommon: string;
  imageRare: string;
  imageEpic: string;
  imageLegendary: string;
}

interface Badge {
  location_id: number;
  location_name: string;
  image_url: string;
  rarity: number;
  perfection: number;
  created_at: number;
}

interface ProfileData {
  data: {
    objectId: string;
    content: {
      fields: {
        badges: Badge[];
      };
    };
  };
}

export default function ClaimBadgePage() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [userProfile, setUserProfile] = useState<ProfileData | null>(null);
  const [userBadges, setUserBadges] = useState<Badge[]>([]);
  const [claiming, setClaiming] = useState<number | null>(null);

  // Load locations and user profile
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load all locations from contract (always load regardless of wallet connection)
        const locationsData = await getAllLocations();
        setLocations(locationsData as Location[]);

        // Load user profile only if connected
        if (currentAccount?.address) {
          const profileExists = await hasProfile(currentAccount.address);

          if (profileExists) {
            const profile = await getProfileByAddress(currentAccount.address);

            if (profile?.data?.content) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const profileFields = (profile.data.content as any).fields;

              // claimed_badges giờ là array of ClaimedBadgeInfo objects
              const claimedBadges = profileFields.claimed_badges || [];

              // Map ClaimedBadgeInfo objects directly
              const badgesWithDetails: Badge[] = Array.isArray(claimedBadges)
                ? claimedBadges.map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (badgeInfo: any) => {
                      // Handle both plain object and Sui object with .fields
                      const data = badgeInfo.fields
                        ? badgeInfo.fields
                        : badgeInfo;

                      const locationId =
                        typeof data.location_id === "string"
                          ? parseInt(data.location_id)
                          : data.location_id;
                      const rarity =
                        typeof data.rarity === "string"
                          ? parseInt(data.rarity)
                          : data.rarity;
                      const perfection =
                        typeof data.perfection === "string"
                          ? parseInt(data.perfection)
                          : data.perfection;
                      const createdAt =
                        typeof data.created_at === "string"
                          ? parseInt(data.created_at)
                          : data.created_at;

                      const badge = {
                        location_id: locationId,
                        location_name: data.location_name || "",
                        image_url: data.image_url || "",
                        rarity,
                        perfection,
                        created_at: createdAt,
                      };

                      return badge;
                    }
                  )
                : [];

              setUserProfile(profile as unknown as ProfileData);
              setUserBadges(badgesWithDetails);
            }
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentAccount?.address]);

  // Handle claim badge
  const handleClaimBadge = async (locationId: number) => {
    if (!currentAccount?.address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!userProfile) {
      toast.error("Please create a profile first to claim badges");
      return;
    }

    try {
      setClaiming(locationId);

      const tx = await claimBadge(userProfile.data.objectId, locationId);

      signAndExecute(
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          transaction: tx as any,
        },
        {
          onSuccess: async () => {
            toast.success(`🎉 Badge Claimed! `);

            // Reload profile to get updated badges with location_name, image_url
            setTimeout(async () => {
              try {
                const updatedProfile = await getProfileByAddress(
                  currentAccount.address
                );

                if (updatedProfile?.data?.content && currentAccount?.address) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const profileFields = (updatedProfile.data.content as any)
                    .fields;
                  const claimedBadges = profileFields.claimed_badges || [];

                  // Map to Badge objects with all info
                  const updatedBadges: Badge[] = claimedBadges.map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (badgeInfo: any) => {
                      // Handle both plain object and Sui object with .fields
                      const data = badgeInfo.fields
                        ? badgeInfo.fields
                        : badgeInfo;

                      const locationId =
                        typeof data.location_id === "string"
                          ? parseInt(data.location_id)
                          : data.location_id;
                      const rarity =
                        typeof data.rarity === "string"
                          ? parseInt(data.rarity)
                          : data.rarity;
                      const perfection =
                        typeof data.perfection === "string"
                          ? parseInt(data.perfection)
                          : data.perfection;
                      const createdAt =
                        typeof data.created_at === "string"
                          ? parseInt(data.created_at)
                          : data.created_at;

                      return {
                        location_id: locationId,
                        location_name: data.location_name || "",
                        image_url: data.image_url || "",
                        rarity,
                        perfection,
                        created_at: createdAt,
                      };
                    }
                  );

                  setUserProfile(updatedProfile as unknown as ProfileData);
                  setUserBadges(updatedBadges);
                }
              } catch (error) {
                console.error("Error reloading profile:", error);
              } finally {
                setClaiming(null);
              }
            }, 1000); // Wait 1 second for blockchain to finalize
          },
          onError: (error) => {
            console.error("Claim failed:", error);
            toast.error("Failed to claim badge: " + error.message);
            setClaiming(null);
          },
        }
      );
    } catch (error) {
      console.error("Error claiming badge:", error);
      toast.error("Error: " + (error as Error).message);
      setClaiming(null);
    }
  };

  // Get badge rarity name
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

  // Get badge rarity color
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

  // Get location image based on rarity
  const getLocationImage = (location: Location, rarity?: number) => {
    if (rarity === undefined) return location.imageCommon;
    switch (rarity) {
      case 0:
        return location.imageCommon;
      case 1:
        return location.imageRare;
      case 2:
        return location.imageEpic;
      case 3:
        return location.imageLegendary;
      default:
        return location.imageCommon;
    }
  };

  // Format timestamp to date
  const formatClaimDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Loading state
  if (loading) {
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
        <div className="min-h-screen flex items-center justify-center pt-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading locations...</p>
          </div>
        </div>
      </section>
    );
  }

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
      <div className="min-h-screen  pt-20 py-12 container mx-auto">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Claim Badges
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600">
              Visit locations to claim unique badges. Each claim costs 0.01 SUI
              and gives you a random rarity badge!
            </p>
            <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">
              <span className="font-semibold text-gray-700">
                Rarity chances:
              </span>{" "}
              Common (60%), Rare (25%), Epic (12%), Legendary (3%)
            </div>
          </div>

          {/* Locations Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {locations.map((location) => {
              const userBadge = userBadges.find(
                (badge) => badge.location_id === location.id
              );
              const hasBadge = !!userBadge;
              console.log("Rendering location:", userBadge);
              return (
                <div
                  key={location.id}
                  style={{ backgroundColor: "#fcfdf6", borderColor: "#BED754" }}
                  className="rounded-lg shadow-lg overflow-hidden border hover:shadow-xl transition-shadow mr-4"
                >
                  {/* Location Image */}
                  <div className="relative sm:h-48 md:h-56 lg:h-48">
                    <img
                      src={location?.imageLegendary}
                      alt={location.name}
                      className="w-full  object-cover"
                    />

                    <div className="flex justify-between p-2">
                      <div className="flex flex-col items-center">
                        <img
                          src={location?.imageCommon}
                          className="w-12 h-12 object-contain"
                        />
                        <span className="text-sm font-semibold ">Common</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <img
                          src={location?.imageEpic}
                          className="w-12 h-12 object-contain"
                        />
                        <span className="text-sm font-semibold ">Epic</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <img
                          src={location?.imageRare}
                          className="w-12 h-12 object-contain"
                        />
                        <span className="text-sm font-semibold ">Rare</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <img
                          src={location?.imageLegendary}
                          className="w-12 h-12 object-contain"
                        />
                        <span className="text-sm font-semibold ">
                          Legendary
                        </span>
                      </div>
                    </div>

                    {/* Badge Status Medal - Circular Badge */}
                    <div className="rounded-full bg-accent-lighter">
                      {hasBadge ? (
                        <div
                          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center ml-2 py-2 shadow-lg border-4 `}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={userBadge.image_url}
                            alt={getRarityName(userBadge.rarity)}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full "
                          />
                          <div className="ml-2 text-green-600 text-xs mt-2 space-y-1">
                            <div>
                              Rarity:{" "}
                              <span className="font-semibold">
                                {getRarityName(userBadge.rarity)}
                              </span>
                            </div>
                            <div>
                              Perfection:{" "}
                              <span className="font-semibold">
                                {userBadge.perfection}/1000
                              </span>{" "}
                              (
                              {((userBadge.perfection / 1000) * 100).toFixed(1)}
                              %)
                            </div>
                            <div>
                              📅 Claimed:{" "}
                              <span className="font-semibold">
                                {formatClaimDate(userBadge.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-20 py-2 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-lg border-4 border-white bg-gray-100 text-gray-600">
                          <div className="text-center">
                            <div className="text-lg sm:text-xl font-bold">
                              🔒
                            </div>
                            <div className="text-xs font-semibold">
                              {currentAccount
                                ? "Not Claimed"
                                : "Connect Wallet"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="p-4 sm:p-5 md:p-6">
                    <Link
                      href={`/location/${location.id}`}
                      className="text-lg sm:text-xl font-bold text-gray-900 mb-2 inline-block hover:text-blue-600 transition-colors"
                    >
                      {location.name}
                    </Link>
                    <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-3 sm:mb-4">
                      {location.description}
                    </p>

                    {/* Coordinates */}
                    <div className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                      📍 {location.latitude.toFixed(6)},{" "}
                      {location.longitude.toFixed(6)}
                    </div>

                    {/* Badge Info */}
                    {hasBadge ? (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-sm">
                          <div className="font-semibold text-green-800">
                            ✓ Badge Claimed!
                          </div>
                          <div className="text-green-600 text-xs mt-2 space-y-1">
                            <div>
                              Rarity:{" "}
                              <span className="font-semibold">
                                {getRarityName(userBadge.rarity)}
                              </span>
                            </div>
                            <div>
                              Perfection:{" "}
                              <span className="font-semibold">
                                {userBadge.perfection}/1000
                              </span>{" "}
                              (
                              {((userBadge.perfection / 1000) * 100).toFixed(1)}
                              %)
                            </div>
                            <div>
                              📅 Claimed:{" "}
                              <span className="font-semibold">
                                {formatClaimDate(userBadge.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <></>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2 sm:space-y-2.5">
                      {hasBadge ? (
                        <>
                          <button
                            style={{ backgroundColor: "#59AC77" }}
                            onClick={() => handleClaimBadge(location.id)}
                            disabled={claiming === location.id}
                            className={`w-full py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-colors ${
                              claiming === location.id
                                ? "bg-green-300 text-green-900 cursor-not-allowed"
                                : "bg-green-500 text-green-50 hover:bg-green-600"
                            }`}
                          >
                            {claiming === location.id
                              ? "Reclaiming..."
                              : "Reclaim Badge (0.01 SUI)"}
                          </button>
                          <Link
                            style={{ backgroundColor: "#F5D2D2" }}
                            href={`/location/${location.id}`}
                            className="w-full block text-center py-2.5 sm:py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold text-sm sm:text-base transition-colors"
                          >
                            View Details
                          </Link>
                        </>
                      ) : (
                        <>
                          <button
                            style={{ backgroundColor: "#59AC77" }}
                            onClick={() => handleClaimBadge(location.id)}
                            disabled={claiming === location.id}
                            className={`w-full py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-colors ${
                              claiming === location.id
                                ? "bg-blue-300 text-blue-900 cursor-not-allowed"
                                : "bg-blue-500 text-blue-50 hover:bg-blue-600"
                            }`}
                          >
                            {claiming === location.id
                              ? "Claiming..."
                              : "Claim Badge (0.01 SUI)"}
                          </button>
                          <Link
                            style={{ backgroundColor: "#F5D2D2" }}
                            href={`/location/${location.id}`}
                            className="w-full block text-center py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs sm:text-sm transition-colors"
                          >
                            View Location
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* No Locations */}
          {locations.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Locations Available
              </h3>
              <p className="text-gray-600">
                Locations will be added by the admin soon!
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
