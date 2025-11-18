"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getProfileByAddress,
  hasProfile,
  mintProfile,
  updateProfile,
  getUserMemoryNFTs,
  getProfileBadges,
  getUserKiosks,
  getUserKioskCaps,
  listMemoryNFTToKiosk,
  createKiosk,
} from "@/services/profileService";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";

interface Badge {
  location_id: number;
  location_name: string;
  image_url: string;
  rarity: number;
  perfection: number;
  created_at: string;
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
  const [memoryNFTs, setMemoryNFTs] = useState<MemoryNFT[]>([]);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [minting, setMinting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [listingNFT, setListingNFT] = useState<MemoryNFT | null>(null);
  const [listingPrice, setListingPrice] = useState("");
  const [listingLoading, setListingLoading] = useState(false);

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

              // Load badges from claimed_badges table
              const badges = await getProfileBadges(profile.data.objectId);
              console.log("Loaded badges:", badges);
              setProfileData({
                ...profileInfo,
                badges: badges as Badge[],
              });

              // Load user's memory NFTs
              const nfts = await getUserMemoryNFTs(currentAccount.address);
              console.log("Loaded memory NFTs:", nfts);
              setMemoryNFTs(nfts);
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

  // Handle image load error - prevent infinite loop
  const handleImageError = (nftId: string) => {
    setFailedImages((prev) => new Set(prev).add(nftId));
  };

  // List NFT to Kiosk
  const handleListNFT = async () => {
    if (!listingNFT || !listingPrice || !currentAccount?.address) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setListingLoading(true);

      // Get user's kiosks
      const kiosks = await getUserKiosks(currentAccount.address);

      // If no kiosk exists, ask user to create one
      if (kiosks.length === 0) {
        const shouldCreate = window.confirm(
          "You don't have a Kiosk yet. Do you want to create one now?"
        );

        if (!shouldCreate) {
          setListingLoading(false);
          return;
        }

        // Create kiosk
        alert("Creating your Kiosk...");
        try {
          const createKioskTx = await createKiosk();

          signAndExecute(
            { transaction: createKioskTx } as unknown as Parameters<
              typeof signAndExecute
            >[0],
            {
              onSuccess: async () => {
                alert(
                  "Kiosk created successfully! Please try listing your NFT again."
                );
                setListingNFT(null);
                setListingPrice("");
                setListingLoading(false);
                // Refresh page to load new kiosk
                setTimeout(() => window.location.reload(), 1000);
              },
              onError: (error) => {
                console.error("Create kiosk failed:", error);
                const errorMsg = error.message || String(error);
                if (
                  errorMsg.includes("rejected") ||
                  errorMsg.includes("User rejected")
                ) {
                  alert("Transaction cancelled. You can try again anytime.");
                } else {
                  alert("Failed to create Kiosk: " + errorMsg);
                }
                setListingLoading(false);
              },
            }
          );
        } catch (txError) {
          console.error("Error building kiosk transaction:", txError);
          alert(
            "Error building transaction: " +
              (txError instanceof Error ? txError.message : String(txError))
          );
          setListingLoading(false);
        }
        return;
      }

      // Use first kiosk
      const kioskId = kiosks[0]?.id || "";

      // Get user's kiosk caps
      const caps = await getUserKioskCaps(currentAccount.address);
      const capId = caps[0]?.id || "";

      if (!capId) {
        alert(
          "Error: Could not find your KioskOwnerCap. Please try creating kiosk again."
        );
        setListingLoading(false);
        return;
      }

      // Price in MIST (multiply by 10^9 for SUI)
      const priceInMist = BigInt(parseFloat(listingPrice) * 1e9);

      // Build transaction using service function
      const tx = await listMemoryNFTToKiosk(
        kioskId,
        capId,
        listingNFT.id,
        priceInMist
      );

      signAndExecute(
        { transaction: tx } as unknown as Parameters<typeof signAndExecute>[0],
        {
          onSuccess: () => {
            alert(`NFT "${listingNFT.name}" listed for ${listingPrice} SUI`);
            setListingNFT(null);
            setListingPrice("");
          },
          onError: (error) => {
            console.error("List failed:", error);
            alert("Failed to list NFT: " + error.message);
            setListingLoading(false);
          },
        }
      );
    } catch (error) {
      console.error("Error listing NFT:", error);
      alert("Error: " + (error as Error).message);
      setListingLoading(false);
    }
  };
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
                    : "bg-blue-500 text-gray-900 hover:bg-blue-600"
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

      <div className=" container mx-auto">
        {/* ============ 1. PROFILE HEADER ============ */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-8 text-blue-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Avatar */}
            <div className="flex justify-center md:justify-start">
              {profileData.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileData.avatarUrl}
                  alt={profileData.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-50 shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-blue-400 flex items-center justify-center text-5xl shadow-lg">
                  👤
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="md:col-span-3">
              <h1 className="text-4xl font-bold mb-2">{profileData.name}</h1>
              <p className="text-blue-100 mb-6 text-lg leading-relaxed">
                {profileData.bio}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-400 bg-opacity-30 rounded-lg p-3 backdrop-blur">
                  <div className="text-2xl font-bold">
                    {profileData.badges.length}
                  </div>
                  <div className="text-xs text-blue-100">Badges</div>
                </div>
                <div className="bg-blue-400 bg-opacity-30 rounded-lg p-3 backdrop-blur">
                  <div className="text-2xl font-bold">{memoryNFTs.length}</div>
                  <div className="text-xs text-blue-100">Memories</div>
                </div>
                <div className="bg-blue-400 bg-opacity-30 rounded-lg p-3 backdrop-blur">
                  <div className="text-2xl font-bold">
                    {(
                      profileData.badges.reduce(
                        (sum, b) => sum + b.perfection,
                        0
                      ) / Math.max(profileData.badges.length, 1)
                    ).toFixed(0)}
                  </div>
                  <div className="text-xs text-blue-100">Avg Perf.</div>
                </div>
                <div className="bg-blue-400 bg-opacity-30 rounded-lg p-3 backdrop-blur">
                  <div className="text-2xl font-bold">
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
                  <div className="text-xs text-blue-100">Overall</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============ 2. UPDATE PROFILE SIDEBAR ============ */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            ✏️ Update Profile
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
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
            <button
              onClick={handleUpdateProfile}
              disabled={updating || !formData.name.trim()}
              className={`w-full py-2 rounded-lg font-semibold text-sm transition-colors ${
                updating || !formData.name.trim()
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-blue-500 text-gray-900 hover:bg-blue-600"
              }`}
            >
              {updating ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* ============ 3. BADGES COLLECTION ============ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              🏆 My Badges Collection
              <span className="text-lg bg-blue-100 text-blue-600 px-3 py-1 rounded-full">
                {profileData.badges.length}
              </span>
            </h2>
            <Link
              href="/claim-badge"
              className="px-4 py-2 bg-green-500 text-gray-900 rounded-lg hover:bg-green-600 transition-colors font-semibold"
            >
              + Claim More
            </Link>
          </div>

          {profileData.badges.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profileData.badges.map((badge, index) => (
                <Link
                  key={index}
                  href={`/location/${badge.location_id}`}
                  className="group"
                >
                  <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all hover:scale-105 border border-gray-200">
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden bg-gray-200">
                      {badge.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={badge.image_url}
                          alt={badge.location_name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://via.placeholder.com/300?text=Badge";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          🏆
                        </div>
                      )}

                      {/* Rarity Badge */}
                      <div
                        className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${getRarityColor(
                          badge.rarity
                        )} shadow-lg`}
                      >
                        {getRarityName(badge.rarity)}
                      </div>

                      {/* Location ID */}
                      <div className="absolute top-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-semibold">
                        Location #{badge.location_id}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                        {badge.location_name}
                      </h3>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded p-2 text-center border border-blue-200">
                          <div className="text-sm font-bold text-blue-600">
                            {badge.perfection}
                          </div>
                          <div className="text-xs text-blue-500 font-medium">
                            Perfection
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded p-2 text-center border border-green-200">
                          <div className="text-sm font-bold text-green-600">
                            {((badge.perfection / 1000) * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-green-500 font-medium">
                            Score
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded p-2 text-center border border-purple-200">
                          <div className="text-sm font-bold text-purple-600">
                            ⭐
                          </div>
                          <div className="text-xs text-purple-500 font-medium">
                            Badge
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-5xl mb-4">🏆</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No badges yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start your journey by visiting locations and claiming badges!
              </p>
              <Link
                href="/claim-badge"
                className="inline-flex items-center px-6 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
              >
                Explore Locations
              </Link>
            </div>
          )}
        </div>

        {/* ============ 4. MEMORY NFTs COLLECTION ============ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              📸 My Memory NFTs
              <span className="text-lg bg-purple-100 text-purple-600 px-3 py-1 rounded-full">
                {memoryNFTs.length}
              </span>
            </h2>
            <Link
              href="/create"
              className="px-4 py-2 bg-purple-500 text-gray-900 rounded-lg hover:bg-purple-600 transition-colors font-semibold"
            >
              + Mint Memory
            </Link>
          </div>

          {memoryNFTs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {memoryNFTs.map((nft) => (
                <div
                  key={nft.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all border border-gray-200"
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden bg-gray-200">
                    {nft.image_url && !failedImages.has(nft.id) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={nft.image_url}
                        alt={nft.name}
                        className="w-full h-full object-cover hover:scale-110 transition-transform"
                        onError={() => handleImageError(nft.id)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-gray-100 to-gray-200">
                        📸
                      </div>
                    )}

                    {/* Rarity Badge */}
                    <div
                      className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-gray-900 shadow-lg ${
                        nft.rarity === 0
                          ? "bg-gray-200"
                          : nft.rarity === 1
                          ? "bg-blue-200"
                          : nft.rarity === 2
                          ? "bg-purple-200"
                          : "bg-yellow-200"
                      }`}
                    >
                      {["Common", "Rare", "Epic", "Legendary"][nft.rarity]}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                      {nft.name}
                    </h3>
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                      {nft.content}
                    </p>

                    {/* Location & Stats */}
                    <div className="mb-3 text-xs text-gray-500">
                      📍 {nft.latitude}, {nft.longitude}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded p-2 text-center border border-pink-200">
                        <div className="text-sm font-bold text-pink-600">
                          {nft.perfection}
                        </div>
                        <div className="text-xs text-pink-500 font-medium">
                          Perfection
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded p-2 text-center border border-yellow-200">
                        <div className="text-sm font-bold text-yellow-600">
                          {((nft.perfection / 1000) * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-yellow-500 font-medium">
                          Quality
                        </div>
                      </div>
                    </div>

                    {/* View on Explorer */}
                    <div className="space-y-2 mt-3">
                      <a
                        href={`https://suiexplorer.com/object/${nft.id}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded transition-colors border border-blue-200"
                      >
                        View on Sui Explorer →
                      </a>
                      <button
                        onClick={() => {
                          setListingNFT(nft);
                          setListingPrice("");
                        }}
                        className="w-full py-2 text-xs font-semibold text-gray-900 bg-purple-500 hover:bg-purple-600 rounded transition-colors"
                      >
                        🛍️ List on Kiosk
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-dashed border-purple-300">
              <div className="text-5xl mb-4">📸</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No memories yet
              </h3>
              <p className="text-gray-600 mb-4">
                Capture and mint your first memory NFT!
              </p>
              <Link
                href="/create"
                className="inline-flex items-center px-6 py-2 bg-purple-500 text-gray-900 rounded-lg hover:bg-purple-600 transition-colors font-semibold"
              >
                Create Memory
              </Link>
            </div>
          )}
        </div>

        {/* ============ LISTING MODAL ============ */}
        {listingNFT && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                📋 List NFT on Kiosk
              </h2>

              {/* NFT Preview */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {listingNFT.name}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {listingNFT.content}
                </p>
                <div className="mt-2 flex gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold text-gray-900 ${
                      listingNFT.rarity === 0
                        ? "bg-gray-200"
                        : listingNFT.rarity === 1
                        ? "bg-blue-200"
                        : listingNFT.rarity === 2
                        ? "bg-purple-200"
                        : "bg-yellow-200"
                    }`}
                  >
                    {["Common", "Rare", "Epic", "Legendary"][listingNFT.rarity]}
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-bold text-pink-600 bg-pink-100">
                    {listingNFT.perfection} Perfection
                  </span>
                </div>
              </div>

              {/* Price Input */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Price (SUI)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.50"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setListingNFT(null);
                    setListingPrice("");
                  }}
                  className="flex-1 py-2 rounded-lg font-semibold text-gray-900 bg-gray-200 hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleListNFT}
                  disabled={listingLoading || !listingPrice}
                  className={`flex-1 py-2 rounded-lg font-semibold text-gray-900 transition-colors ${
                    listingLoading || !listingPrice
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-purple-500 hover:bg-purple-600"
                  }`}
                >
                  {listingLoading ? "Listing..." : "List NFT"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
