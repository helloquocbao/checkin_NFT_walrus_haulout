"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getProfileByAddress,
  hasProfile,
  mintProfile,
  updateProfile,
} from "@/services/profileService";
import { getAllLocations } from "@/services/locationService";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";

interface Badge {
  location_id: number;
  rarity: number;
  perfection: number;
}

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

interface ProfileData {
  objectId: string;
  name: string;
  bio: string;
  avatarUrl: string;
  badges: Badge[];
}

export default function MyProfilePage() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [minting, setMinting] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    avatarUrl: "",
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load all locations
        const locationsData = await getAllLocations();
        setLocations(locationsData as Location[]);

        // Load profile if wallet connected
        if (currentAccount?.address) {
          const profileExists = await hasProfile(currentAccount.address);
          if (profileExists) {
            const profile = await getProfileByAddress(currentAccount.address);
            if (profile?.data?.content) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const fields = (profile.data.content as any).fields;
              const profileInfo = {
                objectId: profile.data.objectId,
                name: fields.name || "",
                bio: fields.bio || "",
                avatarUrl: fields.avatar_url || "",
                badges: fields.badges || [],
              };
              setProfileData(profileInfo);
              setFormData({
                name: profileInfo.name,
                bio: profileInfo.bio,
                avatarUrl: profileInfo.avatarUrl,
              });
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

  // Handle mint profile
  const handleMintProfile = async () => {
    if (!currentAccount?.address) {
      alert("Please connect wallet first");
      return;
    }

    if (!formData.name.trim()) {
      alert("Please enter your name");
      return;
    }

    try {
      setMinting(true);
      const tx = await mintProfile(currentAccount.address, {
        name: formData.name,
        bio: formData.bio,
        avatarUrl: formData.avatarUrl,
        socialLinks: [],
        country: "",
      });

      signAndExecute(
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          transaction: tx as any,
        },
        {
          onSuccess: () => {
            alert("Profile created successfully!");
            window.location.reload();
          },
          onError: (error) => {
            console.error("Mint failed:", error);
            alert("Failed to create profile: " + error.message);
            setMinting(false);
          },
        }
      );
    } catch (error) {
      console.error("Error creating profile:", error);
      alert("Error: " + (error as Error).message);
      setMinting(false);
    }
  };

  // Handle update profile
  const handleUpdateProfile = async () => {
    if (!currentAccount?.address || !profileData) {
      alert("Please connect wallet first");
      return;
    }

    if (!formData.name.trim()) {
      alert("Please enter your name");
      return;
    }

    try {
      setUpdating(true);
      const tx = await updateProfile(profileData.objectId, {
        name: formData.name,
        bio: formData.bio,
        avatarUrl: formData.avatarUrl,
        socialLinks: [],
      });

      signAndExecute(
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          transaction: tx as any,
        },
        {
          onSuccess: () => {
            alert("Profile updated successfully!");
            window.location.reload();
          },
          onError: (error) => {
            console.error("Update failed:", error);
            alert("Failed to update profile: " + error.message);
            setUpdating(false);
          },
        }
      );
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error: " + (error as Error).message);
      setUpdating(false);
    }
  };

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

  // Get location by ID
  const getLocationById = (locationId: number) => {
    return locations.find((loc) => loc.id === locationId);
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
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // 1. NO WALLET - Show form to create profile when they connect
  // ============================================
  if (!currentAccount?.address) {
    return (
      <div className="min-h-screen bg-white pt-20 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2 text-center">
              Create Your Profile
            </h1>
            <p className="text-gray-600 text-center mb-8">
              Connect your wallet to start collecting badges from locations
            </p>

            {/* Placeholder form showing what will happen */}
            <div className="space-y-6 opacity-60 pointer-events-none">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Bio
                </label>
                <textarea
                  placeholder="Tell us about yourself (optional)"
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed h-24 resize-none"
                />
              </div>

              <button
                disabled
                className="w-full py-3 rounded-lg font-semibold text-lg bg-gray-300 text-gray-600 cursor-not-allowed"
              >
                Create Profile
              </button>
            </div>

            <div className="text-center mt-8">
              <p className="text-gray-600">
                <Link
                  href="/claim-badge"
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  browse locations first
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // 2. WALLET + NO PROFILE - Show mint form
  // ============================================
  if (!profileData) {
    return (
      <div className="min-h-screen bg-white pt-20 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2 text-center">
              Create Your Profile
            </h1>
            <p className="text-gray-600 text-center mb-8">
              Set up your profile to start collecting badges from locations
            </p>

            {/* Form */}
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 placeholder-gray-400"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Bio
                </label>
                <textarea
                  placeholder="Tell us about yourself (optional)"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 placeholder-gray-400"
                />
              </div>

              {/* Avatar URL */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Avatar URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg (optional)"
                  value={formData.avatarUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, avatarUrl: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 placeholder-gray-400"
                />
              </div>

              {/* Preview */}
              {(formData.name || formData.bio) && (
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-blue-50">
                  <h3 className="text-lg font-semibold mb-3">
                    Profile Preview
                  </h3>
                  <div className="flex gap-4">
                    {formData.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formData.avatarUrl}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-blue-400 flex items-center justify-center text-2xl">
                        👤
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-lg">{formData.name}</h4>
                      <p className="text-blue-100 text-sm">{formData.bio}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleMintProfile}
                disabled={minting || !formData.name.trim()}
                className={`w-full py-3 rounded-lg font-semibold text-lg transition-colors ${
                  minting || !formData.name.trim()
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-blue-500 text-blue-50 hover:bg-blue-600"
                }`}
              >
                {minting ? "Creating Profile..." : "Create Profile"}
              </button>

              {/* Links */}
              <div className="text-center space-y-2">
                <p>
                  <Link
                    href="/claim-badge"
                    className="text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Browse locations first
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // 3. WALLET + HAS PROFILE - Show profile view + update form
  // ============================================
  return (
    <div className="min-h-screen bg-white pt-20 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-8 mb-8 text-blue-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Avatar */}
            <div className="flex justify-center md:justify-start">
              {profileData.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileData.avatarUrl}
                  alt={profileData.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-50"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-blue-400 flex items-center justify-center text-5xl">
                  👤
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="md:col-span-2">
              <h1 className="text-4xl font-bold mb-2">{profileData.name}</h1>
              <p className="text-blue-100 mb-6 text-lg">{profileData.bio}</p>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold">
                    {profileData.badges.length}
                  </div>
                  <div className="text-blue-100">Badges</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">
                    {(
                      profileData.badges.reduce(
                        (sum, b) => sum + b.perfection,
                        0
                      ) / Math.max(profileData.badges.length, 1)
                    ).toFixed(0)}
                  </div>
                  <div className="text-blue-100">Avg Perfection</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">
                    {(
                      (profileData.badges.reduce(
                        (sum, b) => sum + b.perfection,
                        0
                      ) /
                        Math.max(profileData.badges.length, 1) /
                        10) *
                      100
                    ).toFixed(0)}
                    %
                  </div>
                  <div className="text-blue-100">Overall Score</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Badges Collection */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              My Badges Collection ({profileData.badges.length})
            </h2>

            {profileData.badges.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profileData.badges.map((badge, index) => {
                  const location = getLocationById(badge.location_id);
                  if (!location) return null;

                  return (
                    <Link
                      key={index}
                      href={`/location/${badge.location_id}`}
                      className="group"
                    >
                      <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                        {/* Image */}
                        <div className="relative h-48">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getLocationImage(location, badge.rarity)}
                            alt={location.name}
                            className="w-full h-full object-cover"
                          />

                          {/* Rarity Badge */}
                          <div
                            className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold ${getRarityColor(
                              badge.rarity
                            )}`}
                          >
                            {getRarityName(badge.rarity)}
                          </div>

                          {/* Location ID */}
                          <div className="absolute top-4 left-4 bg-black bg-opacity-60 text-gray-100 px-2 py-1 rounded text-sm">
                            #{badge.location_id}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-4">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {location.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {location.description}
                          </p>

                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-blue-50 rounded p-2 text-center">
                              <div className="text-xs text-blue-600 font-semibold">
                                {badge.perfection}
                              </div>
                              <div className="text-xs text-blue-500">
                                Perfection
                              </div>
                            </div>
                            <div className="bg-green-50 rounded p-2 text-center">
                              <div className="text-xs text-green-600 font-semibold">
                                {((badge.perfection / 1000) * 100).toFixed(0)}%
                              </div>
                              <div className="text-xs text-green-500">
                                Score
                              </div>
                            </div>
                            <div className="bg-purple-50 rounded p-2 text-center">
                              <div className="text-xs text-purple-600 font-semibold">
                                ⭐
                              </div>
                              <div className="text-xs text-purple-500">
                                Badge
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No badges yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Start collecting badges by visiting locations!
                </p>
                <Link
                  href="/claim-badge"
                  className="inline-flex items-center px-4 py-2 bg-blue-500 text-blue-50 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Explore Locations
                </Link>
              </div>
            )}
          </div>

          {/* Right: Update Profile Form */}
          <div>
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-32">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Update Profile
              </h3>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 text-sm"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 text-sm"
                  />
                </div>

                {/* Avatar URL */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    value={formData.avatarUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, avatarUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 text-sm"
                  />
                </div>

                {/* Update Button */}
                <button
                  onClick={handleUpdateProfile}
                  disabled={updating || !formData.name.trim()}
                  className={`w-full py-2 rounded-lg font-semibold text-sm transition-colors ${
                    updating || !formData.name.trim()
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-blue-500 text-blue-50 hover:bg-blue-600"
                  }`}
                >
                  {updating ? "Updating..." : "Update Profile"}
                </button>
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-2 border-t border-gray-200 pt-6">
                <Link
                  href="/claim-badge"
                  className="block w-full text-center px-4 py-2 bg-blue-500 text-blue-50 rounded-lg hover:bg-blue-600 font-semibold transition-colors text-sm"
                >
                  Claim More Badges
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
