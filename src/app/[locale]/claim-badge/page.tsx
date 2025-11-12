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
  rarity: number;
  perfection: number;
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
              setUserProfile(profile as unknown as ProfileData);
              setUserBadges(profileFields.badges || []);
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
    if (!currentAccount?.address || !userProfile) {
      alert("Please connect wallet and create profile first");
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
          onSuccess: (result) => {
            alert(
              "Badge claimed successfully! Check your profile for the new badge."
            );
            console.log("Badge claimed:", result);
            // Reload user profile to get updated badges
            window.location.reload();
          },
          onError: (error) => {
            console.error("Claim failed:", error);
            alert("Failed to claim badge: " + error.message);
            setClaiming(null);
          },
        }
      );
    } catch (error) {
      console.error("Error claiming badge:", error);
      alert("Error: " + (error as Error).message);
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading locations...</p>
        </div>
      </div>
    );
  }

  // No profile (only show if wallet is connected)
  if (currentAccount?.address && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-32">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            No Profile Found
          </h2>
          <p className="text-gray-600 mb-4">
            You need to create a profile first to claim badges
          </p>
          <Link
            href="/my-profile"
            className="bg-blue-500 text-blue-50 px-6 py-2 rounded-lg hover:bg-blue-600 inline-block"
          >
            Create Profile
          </Link>
        </div>
      </div>
    );
  }

  // Show claim badges if wallet connected and has profile
  if (currentAccount?.address && userProfile) {
    return (
      <div className="min-h-screen bg-white pt-20 py-12">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Claim Badges
            </h1>
            <p className="text-gray-600 text-lg">
              Visit locations to claim unique badges. Each claim costs 0.01 SUI
              and gives you a random rarity badge!
            </p>
            <div className="mt-4 text-sm text-gray-500">
              <span className="font-semibold text-gray-700">
                Rarity chances:
              </span>{" "}
              Common (60%), Rare (25%), Epic (12%), Legendary (3%)
            </div>
          </div>

          {/* Locations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {locations.map((location) => {
              const userBadge = userBadges.find(
                (badge) => badge.location_id === location.id
              );
              const hasBadge = !!userBadge;

              return (
                <div
                  key={location.id}
                  className="bg-white rounded-lg shadow-lg overflow-hidden"
                >
                  {/* Location Image */}
                  <div className="relative h-48">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getLocationImage(location, userBadge?.rarity)}
                      alt={location.name}
                      className="w-full h-full object-cover"
                    />

                    {/* Badge Status Overlay */}
                    <div className="absolute top-4 right-4">
                      {hasBadge ? (
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getRarityColor(
                            userBadge.rarity
                          )}`}
                        >
                          ✓ {getRarityName(userBadge.rarity)}
                        </div>
                      ) : (
                        <div className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-semibold">
                          Not Claimed
                        </div>
                      )}
                    </div>

                    {/* Location ID Badge */}
                    <div className="absolute top-4 left-4 bg-black bg-opacity-60 text-gray-100 px-2 py-1 rounded text-sm">
                      #{location.id}
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {location.name}
                    </h3>
                    <p className="text-gray-600 mb-4">{location.description}</p>

                    {/* Coordinates */}
                    <div className="text-sm text-gray-500 mb-4">
                      📍 {location.latitude.toFixed(6)},{" "}
                      {location.longitude.toFixed(6)}
                    </div>

                    {/* Badge Info */}
                    {hasBadge && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-sm">
                          <div className="font-semibold text-green-800">
                            Badge Claimed!
                          </div>
                          <div className="text-green-600">
                            Rarity: {getRarityName(userBadge.rarity)} •
                            Perfection: {userBadge.perfection}/1000
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <button
                        onClick={() => handleClaimBadge(location.id)}
                        disabled={!hasBadge && claiming === location.id}
                        className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                          hasBadge
                            ? "bg-green-500 text-green-50 hover:bg-green-600"
                            : claiming === location.id
                            ? "bg-blue-300 text-blue-900 cursor-not-allowed"
                            : "bg-blue-500 text-blue-50 hover:bg-blue-600"
                        }`}
                      >
                        {hasBadge
                          ? "Reclaim Badge (0.01 SUI)"
                          : claiming === location.id
                          ? "Claiming..."
                          : "Claim Badge (0.01 SUI)"}
                      </button>

                      {hasBadge && (
                        <Link
                          href={`/location/${location.id}`}
                          className="w-full block text-center py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm transition-colors"
                        >
                          View Details
                        </Link>
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
    );
  }

  // Browse mode - no wallet connected
  return (
    <div className="min-h-screen bg-white pt-20 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Browse Badges Collection
          </h1>
          <p className="text-gray-600 text-lg">
            Connect your wallet to start claiming badges from these amazing
            locations!
          </p>
          <div className="mt-4 text-sm text-gray-500">
            <span className="font-semibold text-gray-700">Rarity chances:</span>{" "}
            Common (60%), Rare (25%), Epic (12%), Legendary (3%)
          </div>
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {locations.map((location) => (
            <div
              key={location.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden"
            >
              {/* Location Image */}
              <div className="relative h-48">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={location.imageCommon}
                  alt={location.name}
                  className="w-full h-full object-cover"
                />

                {/* Browse Badge */}
                <div className="absolute top-4 right-4">
                  <div className="bg-blue-500 text-blue-50 px-3 py-1 rounded-full text-xs font-semibold">
                    Browse
                  </div>
                </div>

                {/* Location ID Badge */}
                <div className="absolute top-4 left-4 bg-black bg-opacity-60 text-gray-100 px-2 py-1 rounded text-sm">
                  #{location.id}
                </div>
              </div>

              {/* Location Info */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {location.name}
                </h3>
                <p className="text-gray-600 mb-4">{location.description}</p>

                {/* Coordinates */}
                <div className="text-sm text-gray-500 mb-4">
                  📍 {location.latitude.toFixed(6)},{" "}
                  {location.longitude.toFixed(6)}
                </div>

                {/* Rarity Info */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="text-center p-2 bg-purple-50 rounded">
                    <div className="text-xs text-purple-600 font-semibold">
                      60%
                    </div>
                    <div className="text-xs text-purple-500">Common</div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="text-xs text-blue-600 font-semibold">
                      25%
                    </div>
                    <div className="text-xs text-blue-500">Rare</div>
                  </div>
                </div>

                {/* Action Button */}
                <Link
                  href={`/location/${location.id}`}
                  className="w-full block text-center py-3 bg-blue-500 text-blue-50 rounded-lg hover:bg-blue-600 font-semibold transition-colors"
                >
                  View Location
                </Link>
              </div>
            </div>
          ))}
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
  );
}
