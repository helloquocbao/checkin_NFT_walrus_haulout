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
  getUserKiosks,
  getUserKioskCaps,
  listMemoryNFTToKiosk,
  createKiosk,
  getUserKioskListings,
  getUserKioskListingsAlt,
  getKioskItems,
} from "@/services/profileService";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { uploadImageToTusky } from "@/utils/tuskyUpload";
import Tippy from "@tippyjs/react";
import { useRouter } from "next-intl/client";
import toast from "react-hot-toast";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  badges: any[];
  created_at: string;
  country: string;
  isVerified?: boolean;
}

interface KioskListing {
  listingId: string;
  memoryId: string;
  kioskId: string;
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

export default function MyProfilePage() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [imageModal, setImageModal] = useState(false);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profileData, setProfileData] = useState<any>(null);
  const [memoryNFTs, setMemoryNFTs] = useState<MemoryNFT[]>([]);
  const [kioskListings, setKioskListings] = useState<KioskListing[]>([]);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [minting, setMinting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [listingNFT, setListingNFT] = useState<MemoryNFT | null>(null);
  const [listingPrice, setListingPrice] = useState("");
  const [listingLoading, setListingLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null
  );

  const { push } = useRouter();
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };
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
              const profileData: any = {
                objectId: profile.data.objectId,
                name: fields.name || "",
                bio: fields.bio || "",
                avatarUrl: fields.avatar_url || "",
                badges:
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  fields.claimed_badges.map((badge: any) => ({
                    ...badge.fields,
                  })) || [],
                created_at: fields.created_at,
                country: fields.country || "",
                isVerified: fields.isVerified || false,
              };
              console.log("Loaded profile data:", profileData);
              setProfileData(profileData);
              setFormData({
                name: profileData.name,
                bio: profileData.bio,
                avatarUrl: profileData.avatarUrl,
              });

              // Load user's memory NFTs
              const nfts = await getUserMemoryNFTs(currentAccount.address);

              setMemoryNFTs(nfts);

              // Load user's kiosk listings
              // Try multiple methods in order of reliability
              let listings: KioskListing[] = [];

              // Method 1: Query all MemoryListing objects and filter by seller
              const allListings = await getKioskItems();

              const userListings = allListings.filter(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (item: any) => item.seller === currentAccount.address
              );

              if (userListings.length > 0) {
                listings = userListings as KioskListing[];
              }

              // Method 2: Try alternative listings query
              if (listings.length === 0) {
                listings = await getUserKioskListingsAlt(
                  currentAccount.address
                );
              }

              // Method 3: Fallback to event-based method
              if (listings.length === 0) {
                listings = await getUserKioskListings(currentAccount.address);
              }

              setKioskListings(listings);
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
      toast.error("Please connect wallet first");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    try {
      setMinting(true);

      // If user selected a new avatar file, upload it first
      let finalAvatarUrl = formData.avatarUrl;
      if (selectedAvatarFile && !formData.avatarUrl.includes("walrus")) {
        try {
          // Upload to Tusky
          const uploadResult = await toast.promise(
            uploadImageToTusky(selectedAvatarFile),
            {
              loading: "Uploading avatar to Tusky...",
              success: "Avatar uploaded successfully!",
              error: "Failed to upload avatar",
            }
          );
          finalAvatarUrl = uploadResult.url;
        } catch (uploadError) {
          toast.error(
            "Failed to upload avatar: " +
              (uploadError instanceof Error
                ? uploadError.message
                : String(uploadError))
          );
          setMinting(false);
          return;
        }
      }

      const tx = await mintProfile(currentAccount.address, {
        name: formData.name,
        bio: formData.bio,
        avatarUrl: finalAvatarUrl,
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
            toast.success("Profile created successfully!");
            window.location.reload();
          },
          onError: (error) => {
            console.error("Mint failed:", error);
            toast.error("Failed to create profile: " + error.message);
            setMinting(false);
          },
        }
      );
    } catch (error) {
      console.error("Error creating profile:", error);
      toast.error("Error: " + (error as Error).message);
      setMinting(false);
    }
  };

  // Handle update profile
  const handleUpdateProfile = async () => {
    if (!currentAccount?.address || !profileData) {
      toast.error("Please connect wallet first");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    try {
      setUpdating(true);

      // If user selected a new avatar file, upload it first
      let finalAvatarUrl = formData.avatarUrl;
      if (selectedAvatarFile) {
        try {
          // Upload to Tusky
          const uploadResult = await toast.promise(
            uploadImageToTusky(selectedAvatarFile),
            {
              loading: "Uploading avatar to Tusky...",
              success: "Avatar uploaded successfully!",
              error: "Failed to upload avatar",
            }
          );
          finalAvatarUrl = uploadResult.url;
        } catch (uploadError) {
          toast.error(
            "Failed to upload avatar: " +
              (uploadError instanceof Error
                ? uploadError.message
                : String(uploadError))
          );
          setUpdating(false);
          return;
        }
      }

      const tx = await updateProfile(profileData.objectId, {
        name: formData.name,
        bio: formData.bio,
        avatarUrl: finalAvatarUrl,
        socialLinks: [],
      });

      signAndExecute(
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          transaction: tx as any,
        },
        {
          onSuccess: () => {
            toast.success("Profile updated successfully!");
            window.location.reload();
          },
          onError: (error) => {
            console.error("Update failed:", error);
            toast.error("Failed to update profile: " + error.message);
            setUpdating(false);
          },
        }
      );
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error: " + (error as Error).message);
      setUpdating(false);
    }
  };

  // Handle image load error - prevent infinite loop
  const handleImageError = (nftId: string) => {
    setFailedImages((prev) => new Set(prev).add(nftId));
  };

  // Handle avatar image upload to Walrus
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error("Image size must be less than 10MB");
        return;
      }

      // Show preview
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      setSelectedAvatarFile(file);
    } catch (error) {
      console.error("Error selecting avatar:", error);
      toast.error("Error: " + (error as Error).message);
    }
  };

  // List NFT to Kiosk
  const handleListNFT = async () => {
    if (!listingNFT || !listingPrice || !currentAccount?.address) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setListingLoading(true);

      // Get user's kiosks
      const kiosks = await getUserKiosks(currentAccount.address);

      // If no kiosk exists, ask user to create one
      if (!kiosks || kiosks.length === 0) {
        const shouldCreate = window.confirm(
          "You don't have a Kiosk yet. Do you want to create one now?"
        );

        if (!shouldCreate) {
          setListingLoading(false);
          return;
        }

        // Create kiosk
        toast.success("Creating your Kiosk...");

        try {
          const createKioskTx = await createKiosk();

          signAndExecute(
            { transaction: createKioskTx } as unknown as Parameters<
              typeof signAndExecute
            >[0],
            {
              onSuccess: async () => {
                toast.success(
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
                  toast.error(
                    "Transaction cancelled. You can try again anytime."
                  );
                } else if (errorMsg.includes("1001")) {
                  toast.error(
                    "You already have a Kiosk! Refreshing to load it..."
                  );
                  setTimeout(() => window.location.reload(), 1500);
                } else {
                  toast.error("Failed to create Kiosk: " + errorMsg);
                }
                setListingLoading(false);
              },
            }
          );
        } catch (txError) {
          console.error("Error building kiosk transaction:", txError);
          toast.error(
            "Error building transaction: " +
              (txError instanceof Error ? txError.message : String(txError))
          );
          setListingLoading(false);
        }
        return;
      }

      // Use first kiosk
      const kioskId = kiosks[0]?.id || "";

      if (!kioskId) {
        toast.error("Error: Could not find your Kiosk ID");
        setListingLoading(false);
        return;
      }

      // Get kiosk cap ID (either from kiosks array or from caps query)
      let capId = kiosks[0]?.capId || "";

      if (!capId) {
        // Fallback: query caps
        const caps = await getUserKioskCaps(currentAccount.address);
        capId = caps[0]?.id || "";
      }

      if (!capId) {
        toast.error(
          "Error: Could not find your KioskOwnerCap. Your kiosk may not be fully initialized."
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
            toast.success(
              `NFT "${listingNFT.name}" listed for ${listingPrice} SUI`
            );
            setListingNFT(null);
            setListingPrice("");
          },
          onError: (error) => {
            console.error("List failed:", error);
            toast.error("Failed to list NFT: " + error.message);
            setListingLoading(false);
          },
        }
      );
    } catch (error) {
      console.error("Error listing NFT:", error);
      toast.error("Error: " + (error as Error).message);
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
        <div className="min-h-screen bg-white pt-20 py-12">
          <div className="max-w-2xl mx-auto px-4">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2 text-center">
                Create Your Profile
              </h1>
              <p className="text-gray-600 text-center mb-8">
                Connect your wallet to start collecting badges from locations
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ============================================
  // 2. WALLET + NO PROFILE - Show mint form
  // ============================================
  if (!profileData) {
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

                {/* Avatar Upload (Tusky) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Avatar 🖼️{" "}
                    <span className="text-xs text-purple-600">
                      (Powered by Tusky)
                    </span>
                  </label>

                  {/* File Upload Button */}
                  <div className="mb-3">
                    <label className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer">
                      <span className="text-sm font-semibold text-blue-600">
                        📤 Select Image
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Preview */}
                  {avatarPreview && (
                    <div className="mb-3 flex flex-col items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        width={250}
                        height={250}
                        className="  object-cover border-2 border-blue-300"
                      />
                      <p className="text-xs text-blue-600 font-semibold">
                        ✓ Selected (will upload on Create)
                      </p>
                    </div>
                  )}
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
                  style={{ backgroundColor: "#C2E2FA" }}
                  // disabled={minting || !formData.name.trim()}
                  className={`w-full py-3 rounded-lg font-semibold text-lg transition-colors ${
                    minting || !formData.name.trim()
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-blue-500 text-gray-900 hover:bg-blue-600"
                  }`}
                >
                  {minting
                    ? avatarPreview
                      ? "📤 Uploading to Tusky..."
                      : "Creating Profile..."
                    : "Create Profile"}
                </button>

                {/* Links */}
                <div className="text-center space-y-2">
                  <p>
                    <Link
                      style={{ backgroundColor: "#898AC4" }}
                      href="/claim-badge"
                      className="text-blue-600 hover:text-blue-700 rounded-lg p-2 font-semibold"
                    >
                      Browse locations first
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
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
        <div className="md:flex md:flex-wrap">
          <figure className="mb-8 md:w-2/5 md:flex-shrink-0 md:flex-grow-0 md:basis-auto lg:w-1/2 w-full">
            <button className=" w-full" onClick={() => setImageModal(true)}>
              <img
                src={profileData?.avatarUrl}
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
                  src={profileData?.avatarUrl}
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
              {profileData?.name}
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
                Create: {profileData?.created_at}
              </span>
              <span className="dark:text-jacarta-300 text-jacarta-400 text-sm">
                Country:{" "}
                {profileData?.country !== "" ? profileData?.country : "N/A"}
              </span>
            </div>

            <p className="dark:text-jacarta-300 mb-10 line-clamp-3">
              {profileData?.bio}
            </p>

            {/* <!-- Creator / Owner --> */}
            <div className="mb-8 ml-2 flex flex-wrap">
              <div className="mr-8 mb-4 flex">
                <figure className="mr-4 shrink-0">
                  <a className="relative block">
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
                      {profileData?.badges?.length} badge
                    </span>
                  </a>
                </div>
              </div>

              <div className="mb-4 flex">
                <figure className="mr-4 shrink-0">
                  <a className="relative block">
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
                      {profileData?.badges?.length} Location
                    </span>
                  </a>
                </div>
              </div>
            </div>

            {/* <!-- Bid --> */}
            <div className="dark:bg-jacarta-700 dark:border-jacarta-600 border-jacarta-100 rounded-2lg border bg-white p-8 mb-3">
              <div className="mb-8 sm:flex sm:flex-wrap">
                {/* <!-- Highest bid --> */}
                <div className="w-full">
                  <div className="block overflow-hidden text-ellipsis whitespace-nowrap">
                    <a
                      href={`https://suiscan.xyz/testnet/object/${profileData?.objectId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="dark:text-jacarta-300 text-jacarta-400 text-sm">
                        NFT onchain:{" "}
                      </span>
                      <span className="text-accent text-sm font-bold">
                        {profileData?.objectId}
                      </span>
                    </a>
                  </div>
                  <div className="mt-3 ">
                    <p className="text-gray-600 text-center mb-4">
                      <span className="text-blue-600 font-bold">
                        <span>
                          Verified status:{" "}
                          {profileData?.isVerified ? (
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
                          ) : (
                            " Not Verified"
                          )}
                        </span>
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* <!-- end bid --> */}
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
                Avatart image
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Upload Box */}
              <label className="block text-xs text-gray-600 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />

                <div className="dark:bg-jacarta-700 dark:border-jacarta-600 border-jacarta-100 group flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-white py-20 px-5 text-center h-full">
                  <div className="relative z-10 cursor-pointer">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      className="fill-jacarta-500 mb-4 inline-block dark:fill-white"
                    >
                      <path fill="none" d="M0 0h24v24H0z" />
                      <path d="M16 13l6.964 4.062-2.973.85 2.125 3.681-1.732 1-2.125-3.68-2.223 2.15L16 13zm-2-7h2v2h5a1 1 0 0 1 1 1v4h-2v-3H10v10h4v2H9a1 1 0 0 1-1-1v-5H6v-2h2V9a1 1 0 0 1 1-1h5V6zM4 14v2H2v-2h2zm0-4v2H2v-2h2zm0-4v2H2V6h2zm0-4v2H2V2h2zm4 0v2H6V2h2zm4 0v2h-2V2h2zm4 0v2h-2V2h2z" />
                    </svg>

                    <p className="dark:text-jacarta-300 mx-auto max-w-xs text-xs">
                      JPG, PNG, GIF — Max size: 10MB
                    </p>
                  </div>
                </div>
              </label>

              {/* Image Preview */}
              {avatarPreview ? (
                <div className="flex flex-col items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarPreview}
                    alt="Avatar Preview"
                    width={250}
                    height={250}
                    className=" object-cover border shadow-md"
                  />
                  <p className="text-xs text-blue-600 mt-2 font-semibold">
                    ✓ Preview loaded (will upload on Save)
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center text-gray-400 text-sm">
                  No preview selected
                </div>
              )}
            </div>
            <button
              style={{ backgroundColor: "#78B9B5" }}
              onClick={handleUpdateProfile}
              disabled={updating || !formData.name.trim()}
              className={`w-full py-3 rounded-lg mt-3 font-semibold text-sm transition-colors ${
                updating || !formData.name.trim()
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-blue-500 text-gray-900 hover:bg-blue-600"
              }`}
            >
              {updating
                ? avatarPreview
                  ? "📤 Uploading to Tusky..."
                  : "Updating..."
                : "Save Changes"}
            </button>
          </div>
        </div>

        {/* ============ 3. BADGES COLLECTION ============ */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row items-center justify-between my-3">
            <h2 className="lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
              🏆 My Badges Collection
              <span className="lg:text-lg bg-blue-100 text-blue-600 px-3 py-1 rounded-full">
                ({profileData.badges.length})
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
              {profileData.badges.map((badge: any, index: number) => {
                console.log("Rendering badge:", profileData);
                return (
                  <Link
                    key={index}
                    href={`/location/${badge.location_id}`}
                    className="group"
                  >
                    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all hover:scale-105 border border-gray-200 mr-2 mb-2">
                      {/* Image */}
                      <div className="relative h-48 overflow-hidden bg-gray-200">
                        {badge.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={badge.image_url}
                            alt={badge.location_name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">
                            🏆
                          </div>
                        )}

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
                              {
                                ["Common", "Rare", "Epic", "Legendary"][
                                  badge.rarity
                                ]
                              }
                            </div>
                            <div className="text-xs text-blue-500 font-medium">
                              Rarity
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded p-2 text-center border border-blue-200">
                            <div className="text-sm font-bold text-blue-600">
                              {badge.perfection}
                            </div>
                            <div className="text-xs text-blue-500 font-medium">
                              Perfection
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded p-2 text-center border border-purple-200">
                            <div className="text-sm font-bold text-purple-600">
                              {formatDate(parseInt(badge.created_at))}
                            </div>
                            <div className="text-xs text-purple-500 font-medium">
                              Create at
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

        {/* ============ 3.5. KIOSK LISTINGS ============ */}
        {profileData && (
          <div className="space-y-4">
            <div className="flex lg:flex-row flex-col items-center justify-between">
              <h2 className="lg:text-3xl text-lg my-3 font-bold text-gray-900 flex items-center gap-2">
                🛍️ My Kiosk Listings
                <span className="lg:text-lg bg-green-100 text-green-600 px-3 py-1 rounded-full">
                  ({kioskListings.length})
                </span>
              </h2>
              <h2
                onClick={() => push("/seller-earnings")}
                className="lg:text-3xl text-lg mb-3 font-bold text-gray-900 flex items-center gap-2 hover:underline"
              >
                <span
                  style={{ color: "#FF6C0C" }}
                  className="  lg:text-lg bg-green-100 text-green-600 px-3 py-1 rounded-full"
                >
                  💰 Seller Earnings
                </span>
              </h2>
            </div>

            {kioskListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ">
                {kioskListings.map((listing) => (
                  <div
                    key={listing.listingId}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all border-2 border-green-200 mr-2 mb-2"
                  >
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden bg-gray-200">
                      {listing.imageUrl &&
                      !failedImages.has(listing.memoryId) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={listing.imageUrl}
                          alt={listing.name}
                          className="w-full h-full object-cover hover:scale-110 transition-transform"
                          onError={() =>
                            setFailedImages((prev) =>
                              new Set(prev).add(listing.memoryId)
                            )
                          }
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-gray-100 to-gray-200">
                          📸
                        </div>
                      )}

                      {/* Status Badge - Listed */}
                      <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                        ✓ Listed
                      </div>

                      {/* Rarity Badge */}
                      <div
                        className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-gray-900 shadow-lg ${
                          listing.rarity === 0
                            ? "bg-gray-200"
                            : listing.rarity === 1
                            ? "bg-blue-200"
                            : listing.rarity === 2
                            ? "bg-purple-200"
                            : "bg-yellow-200"
                        }`}
                      >
                        {
                          ["Common", "Rare", "Epic", "Legendary"][
                            listing.rarity
                          ]
                        }
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                        {listing.name}
                      </h3>
                      <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                        {listing.content}
                      </p>

                      {/* Location & Stats */}
                      <div className="mb-3 text-xs text-gray-500">
                        📍 {listing.latitude}, {listing.longitude}
                      </div>

                      {/* Price Display */}
                      <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                        <div className="text-sm text-gray-600 mb-1">
                          Listed Price:
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          {(BigInt(listing.price) / BigInt(1e9)).toString()} SUI
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded p-2 text-center border border-pink-200">
                          <div className="text-sm font-bold text-pink-600">
                            {listing.perfection}
                          </div>
                          <div className="text-xs text-pink-500 font-medium">
                            Perfection
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded p-2 text-center border border-yellow-200">
                          <div className="text-sm font-bold text-yellow-600">
                            {((listing.perfection / 1000) * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-yellow-500 font-medium">
                            Quality
                          </div>
                        </div>
                      </div>

                      {/* View on Explorer */}
                      <div className="space-y-2 mt-3">
                        <a
                          href={`https://suiexplorer.com/object/${listing.listingId}?network=testnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-center py-2 text-xs font-semibold text-green-600 hover:bg-green-50 rounded transition-colors border border-green-200"
                        >
                          View Listing →
                        </a>
                        <button
                          className="w-full py-2 text-xs font-semibold text-gray-900 bg-red-500 hover:bg-red-600 rounded transition-colors"
                          title="Unlist feature coming soon"
                          disabled
                        >
                          ❌ Unlist (Coming Soon)
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-dashed border-green-300">
                <div className="text-5xl mb-4">🛍️</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No listings yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Your memory NFTs are not listed on your kiosk yet. Use the
                  section below to list NFTs for sale!
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============ 4. MEMORY NFTs COLLECTION ============ */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row items-center justify-between my-3">
            <h2 className="lg:text-3xl text-lg font-bold text-gray-900 flex items-center gap-2">
              📸 My Memory NFTs
              <span className="lg:text-lg bg-purple-100 text-purple-600 px-3 py-1 rounded-full">
                ({memoryNFTs.length})
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
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all border border-gray-200 mr-2 mb-2"
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
                      <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded p-2 text-center ">
                        <span className="lg:text-xl text-xs">Rarity</span>
                        <div
                          className={`rounded-full text-xs font-bold text-gray-900 shadow-lg ${
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
                      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded p-2 text-center border border-yellow-200">
                        <div className="text-sm font-bold text-yellow-600">
                          {nft.perfection}
                        </div>
                        <div className="text-xs text-yellow-500 font-medium">
                          Perfection
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
