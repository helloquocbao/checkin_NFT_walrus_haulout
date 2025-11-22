"use client";

import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getProfileByAddress,
  hasProfile,
  claimBadge,
} from "@/services/profileService";
import { getAllLocations } from "@/services/locationService";

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
        claimed_badges: Badge[];
      };
    };
  };
}

export default function LocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const locationId = parseInt(params.id as string);

  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location | null>(null);
  const [userProfile, setUserProfile] = useState<ProfileData | null>(null);
  const [userBadges, setUserBadges] = useState<Badge[]>([]);
  const [claiming, setClaiming] = useState(false);

  // Load location and user profile
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load all locations to find the specific one
        const locationsData = await getAllLocations();
        const foundLocation = locationsData.find(
          (loc) => loc.id === locationId
        );

        if (!foundLocation) {
          router.push("/claim-badge");
          return;
        }

        setLocation(foundLocation as Location);

        // Load user profile if connected
        if (currentAccount?.address) {
          try {
            const profileExists = await hasProfile(currentAccount.address);
            if (profileExists) {
              const profile = await getProfileByAddress(currentAccount.address);
              if (profile?.data?.content) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const profileFields = (profile.data.content as any).fields;

                setUserProfile(profile as unknown as ProfileData);

                // Extract badges - handle both direct objects and nested .fields

                const badges = (profileFields.claimed_badges || []).map(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (badge: any) => {
                    // If badge has .fields, extract them
                    return badge.fields ? badge.fields : badge;
                  }
                );

                setUserBadges(badges);
              }
            }
          } catch (err) {
            console.error("Error loading profile:", err);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentAccount?.address, locationId, router]);

  // Handle claim/reclaim badge
  const handleClaimBadge = async () => {
    if (!currentAccount?.address) {
      alert("Please connect your wallet first");
      return;
    }

    if (!userProfile) {
      alert("Please create a profile first to claim badges");
      return;
    }

    if (!location) {
      alert("Location not found");
      return;
    }

    try {
      setClaiming(true);

      const tx = await claimBadge(userProfile.data.objectId, location.id);

      signAndExecute(
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          transaction: tx as any,
        },
        {
          onSuccess: () => {
            alert(
              "Badge claimed successfully! Check your profile for the new badge."
            );

            // Reload the page to get updated badge info
            setTimeout(() => {
              window.location.reload();
            }, 1500); // Wait 1.5s for blockchain to update
          },
          onError: (error) => {
            console.error("Claim failed:", error);
            alert("Failed to claim badge: " + error.message);
            setClaiming(false);
          },
        }
      );
    } catch (error) {
      console.error("Error claiming badge:", error);
      alert("Error: " + (error as Error).message);
      setClaiming(false);
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
        return "text-gray-600 bg-gray-100 border-gray-300";
      case 1:
        return "text-blue-600 bg-blue-100 border-blue-300";
      case 2:
        return "text-purple-600 bg-purple-100 border-purple-300";
      case 3:
        return "text-yellow-600 bg-yellow-100 border-yellow-300";
      default:
        return "text-gray-600 bg-gray-100 border-gray-300";
    }
  };

  // Get location image based on rarity
  const getLocationImage = (rarity?: number) => {
    if (!location) return "";
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

  const userBadge = userBadges.find((badge) => {
    // Ép kiểu location_id về số nếu cần
    return Number(badge.location_id) === Number(locationId);
  });
  const hasBadge = !!userBadge;

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
            <p className="text-gray-600">Loading location...</p>
          </div>
        </div>
      </section>
    );
  }

  // No location found
  if (!location) {
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Location Not Found
            </h2>
            <p className="text-gray-600 mb-4">
              The location you&apos;re looking for doesn&apos;t exist.
            </p>
            <Link
              href="/claim-badge"
              className="bg-blue-500 text-blue-50 px-6 py-2 rounded-lg hover:bg-blue-600 inline-block"
            >
              Back to Locations
            </Link>
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-12 pt-2">
        <div className="w-full max-w-xl mx-auto px-4">
          {/* Back Button */}
          <div className="mb-6 text-center">
            <Link
              href="/claim-badge"
              className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-2 text-lg font-semibold"
            >
              ← Back to All Locations
            </Link>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="relative h-64 md:h-80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getLocationImage(userBadge?.rarity)}
                alt={location.name}
                className="w-full h-full object-cover"
              />

              {/* Badge Overlay */}
              <div className="absolute top-4 right-4">
                {hasBadge ? (
                  <div
                    className={`px-4 py-2 rounded-full text-sm font-bold border shadow ${getRarityColor(
                      userBadge.rarity
                    )}`}
                  >
                    ✓ {getRarityName(userBadge.rarity)} Badge
                  </div>
                ) : (
                  <div className="bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-bold border border-red-300 shadow mt-2">
                    Not Claimed
                  </div>
                )}
              </div>
              {/* Location ID */}
              <div className="absolute top-4 left-4 bg-black bg-opacity-60 text-gray-100 px-3 py-2 rounded text-sm font-semibold shadow"></div>
            </div>

            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
                {location.name}
              </h1>
              <p className="text-gray-600 text-center mb-4 text-lg">
                {location.description}
              </p>

              {/* Coordinates */}
              <div className="flex items-center justify-center gap-2 text-gray-500 mb-6">
                <span className="text-lg">📍</span>
                <span className="text-sm">
                  Lat: {location.latitude.toFixed(6)} • Long:{" "}
                  {location.longitude.toFixed(6)}
                </span>
              </div>

              {/* Current Badge Info - block nổi bật */}
              {hasBadge && (
                <div className="mb-6 p-5 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300 rounded-xl shadow text-center">
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-2">
                    <div
                      className={`px-4 py-2 rounded-full text-sm font-bold border ${getRarityColor(
                        userBadge.rarity
                      )}`}
                    >
                      {getRarityName(userBadge.rarity)}
                    </div>
                    <div className="text-green-700 font-semibold">
                      Perfection: {userBadge.perfection}/1000
                    </div>
                    <div className="text-blue-700 font-semibold">
                      Score: {((userBadge.perfection / 1000) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-green-800 font-semibold">
                    You have claimed this badge!
                  </div>
                </div>
              )}

              {/* Rarity Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
                  Badge Rarity Chances
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xl font-bold text-gray-600">60%</div>
                    <div className="text-sm text-gray-500">Common</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">25%</div>
                    <div className="text-sm text-blue-500">Rare</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-xl font-bold text-purple-600">12%</div>
                    <div className="text-sm text-purple-500">Epic</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-xl font-bold text-yellow-600">3%</div>
                    <div className="text-sm text-yellow-500">Legendary</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col md:flex-row gap-4 mb-2">
                <button
                  style={{ backgroundColor: "#E19898" }}
                  onClick={handleClaimBadge}
                  disabled={claiming}
                  className={`flex-1 py-3 rounded-lg font-semibold text-lg transition-colors ${
                    claiming
                      ? "bg-blue-300 text-blue-900 cursor-not-allowed"
                      : hasBadge
                      ? "bg-green-500 text-green-50 hover:bg-green-600"
                      : "bg-blue-500 text-blue-50 hover:bg-blue-600"
                  }`}
                >
                  {claiming
                    ? "Claiming..."
                    : hasBadge
                    ? "Reclaim Badge (0.01 SUI)"
                    : "Claim Badge (0.01 SUI)"}
                </button>
                <Link
                  style={{ backgroundColor: "#AEDEFC" }}
                  href="/my-profile"
                  className="flex-1 py-3 bg-gray-500 text-gray-50 rounded-lg hover:bg-gray-600 text-center font-semibold"
                >
                  View My Profile
                </Link>
              </div>

              {/* Help Text */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <h4 className="font-semibold text-blue-800 mb-2">
                  {hasBadge
                    ? "Want to Improve Your Badge?"
                    : "How Badge Claiming Works"}
                </h4>
                <ul className="text-sm text-blue-700 space-y-1 text-left inline-block">
                  {hasBadge ? (
                    <>
                      <li>
                        • You can reclaim this badge to potentially get better
                        rarity
                      </li>
                      <li>
                        • Each reclaim costs 0.01 SUI and gives you a new random
                        badge
                      </li>
                      <li>
                        • Your old badge will be replaced with the new one
                      </li>
                      <li>• Higher rarity badges are more valuable and rare</li>
                    </>
                  ) : (
                    <>
                      <li>
                        • Each claim costs 0.01 SUI and gives you a random
                        rarity badge
                      </li>
                      <li>• Common badges are most frequent (60% chance)</li>
                      <li>• Legendary badges are extremely rare (3% chance)</li>
                      <li>
                        • Each badge has a unique perfection score (0-1000)
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
