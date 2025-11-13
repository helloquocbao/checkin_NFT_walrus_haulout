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
} from "@/services/profileService";

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

export default function UserProfilePage() {
  const params = useParams();
  const profileId = params.id as string;
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [loading, setLoading] = useState(true);
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [verifyThreshold, setVerifyThreshold] = useState(3);
  const [canClaimVerify, setCanClaimVerify] = useState(false);
  const [voting, setVoting] = useState(false);
  const [claimingVerify, setClaimingVerify] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
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
            console.log(
              `Actual votes for ${profileOwnerAddress}: ${actualVotes}`
            );
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
      setToastMessage({
        type: "error",
        message: "Please connect your wallet first",
      });
      return;
    }

    if (!userProfile?.address) {
      setToastMessage({
        type: "error",
        message: "Profile owner address not found",
      });
      return;
    }

    if (currentAccount.address === userProfile.address) {
      setToastMessage({
        type: "error",
        message: "You cannot vote for yourself",
      });
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
          onSuccess: (result) => {
            console.log("Vote successful:", result);
            setToastMessage({
              type: "success",
              message: "Vote successful! ✓",
            });
            setHasVoted(true);
            // Reload profile to update vote count
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          },
          onError: (error) => {
            console.error("Vote failed:", error);
            setToastMessage({
              type: "error",
              message: `Vote failed: ${error.message}`,
            });
          },
        }
      );
    } catch (error) {
      console.error("Error voting:", error);
      setToastMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Vote failed",
      });
    } finally {
      setVoting(false);
    }
  };

  // Handle claim verification
  const handleClaimVerification = async () => {
    if (!currentAccount?.address) {
      setToastMessage({
        type: "error",
        message: "Please connect your wallet first",
      });
      return;
    }

    if (!userProfile?.objectId) {
      setToastMessage({
        type: "error",
        message: "Profile not found",
      });
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
          onSuccess: (result) => {
            console.log("Claim verification successful:", result);
            setToastMessage({
              type: "success",
              message: "Verification claimed! ✓",
            });
            // Reload profile to update verified status
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          },
          onError: (error) => {
            console.error("Claim verification failed:", error);
            setToastMessage({
              type: "error",
              message: `Claim failed: ${error.message}`,
            });
          },
        }
      );
    } catch (error) {
      console.error("Error claiming verification:", error);
      setToastMessage({
        type: "error",
        message:
          error instanceof Error ? error.message : "Claim verification failed",
      });
    } finally {
      setClaimingVerify(false);
    }
  };

  // Hide toast message after 5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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

  return (
    <div className="min-h-screen bg-white pt-20 py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* Profile Info Section - Top */}
        <div className="mb-12">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Cover Background */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-40 sm:h-48"></div>

            {/* Profile Content */}
            <div className="px-4 sm:px-8 pb-8">
              <div className="flex flex-col sm:flex-row gap-6 -mt-20 sm:-mt-24">
                {/* Avatar */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    profileInfo.avatar_url || "https://via.placeholder.com/150"
                  }
                  alt={profileInfo.name}
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-full mx-auto sm:mx-0 border-4 border-white shadow-lg object-cover flex-shrink-0"
                />

                {/* Profile Info */}
                <div className="flex-1 text-center sm:text-left pt-4 sm:pt-8">
                  {/* Name */}
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                    {profileInfo.name}
                  </h1>

                  {/* Verification Badge */}
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
                    {profileInfo.is_verified && (
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  {/* Verification Status Section */}
                  {!profileInfo.is_verified && (
                    <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="flex items-start gap-3">
                        <div className="text-xl mt-1">🔐</div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-2">
                            Verification Status
                          </p>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-blue-500 h-full transition-all"
                                style={{
                                  width: `${Math.min(
                                    (profileInfo.verify_votes /
                                      verifyThreshold) *
                                      100,
                                    100
                                  )}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-700 min-w-fit">
                              {profileInfo.verify_votes}/{verifyThreshold}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-3">
                            {profileInfo.verify_votes < verifyThreshold
                              ? `${
                                  verifyThreshold - profileInfo.verify_votes
                                } more vote${
                                  verifyThreshold - profileInfo.verify_votes !==
                                  1
                                    ? "s"
                                    : ""
                                } needed for verification`
                              : "You can now claim your verification badge!"}
                          </p>
                          {canClaimVerify && (
                            <button
                              onClick={handleClaimVerification}
                              disabled={claimingVerify}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors w-full disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              {claimingVerify
                                ? "Processing..."
                                : "Claim Verification"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  <p className="text-gray-600 text-lg mb-4">
                    {profileInfo.bio}
                  </p>

                  {/* Country & Stats */}
                  <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                    {/* Country */}
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🌍</span>
                      <div>
                        <div className="text-sm text-gray-600">Country</div>
                        <div className="font-semibold text-gray-900">
                          {profileInfo.country}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-8">
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                          {profileInfo.badge_count}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          Unique Badges
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                          {profileInfo.total_claims}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          Total Claims
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Join Date */}
                  <div className="mt-6 text-sm text-gray-500">
                    📅 Joined {formatDate(profileInfo.created_at)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Badge List Section - Bottom */}
        <div className="mb-12">
          <div className="mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              🏅 Claimed Badges ({badges.length})
            </h2>
            <p className="text-gray-600">
              {badges.length} badge{badges.length !== 1 ? "s" : ""} claimed
            </p>
          </div>

          {badges.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
              <div className="text-4xl mb-4">🎖️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Badges Yet
              </h3>
              <p className="text-gray-600 mb-6">
                This user hasn&apos;t claimed any badges yet. Start exploring
                locations to earn badges!
              </p>
              <Link
                href="/claim-badge"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Claim Your First Badge
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {badges.map((badge) => (
                <div
                  key={badge.location_id}
                  className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow border-l-4 border-blue-500"
                >
                  {/* Badge Image */}
                  <div className="relative h-40 sm:h-48 bg-gray-200 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={badge.image_url || "https://via.placeholder.com/300"}
                      alt={badge.location_name}
                      className="w-full h-full object-cover"
                    />

                    {/* Rarity Badge */}
                    <div
                      className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${getRarityColor(
                        badge.rarity
                      )}`}
                    >
                      {getRarityName(badge.rarity)}
                    </div>
                  </div>

                  {/* Badge Info */}
                  <div className="p-4">
                    <Link
                      href={`/location/${badge.location_id}`}
                      className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {badge.location_name}
                    </Link>

                    <div className="mt-3 space-y-2 text-sm text-gray-600">
                      <div>
                        <span className="font-semibold">Perfection:</span>{" "}
                        <span className="text-blue-600">
                          {badge.perfection}/1000 (
                          {((badge.perfection / 1000) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold">📅 Claimed:</span>{" "}
                        {formatDate(badge.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="text-center pt-8 border-t border-gray-200">
          <Link
            href="/claim-badge"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← Back to Claim Badges
          </Link>
        </div>

        {/* Verification Voting Section */}
        <div className="mt-12 mb-12">
          <div className="mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              🗳️ Help Verify This User
            </h2>
            <p className="text-gray-600">
              Verified users have been trusted by the community
            </p>
          </div>

          {profileInfo?.is_verified ? (
            <div className="bg-green-50 rounded-lg p-8 border border-green-200 text-center">
              <div className="text-4xl mb-3">✓</div>
              <p className="text-lg font-semibold text-green-700">
                This user is already verified!
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  How Verification Works
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-1">1</span>
                    <span>Review this user&apos;s profile and badges</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-1">2</span>
                    <span>Click the vote button if you trust them</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-1">3</span>
                    <span>
                      When they reach {verifyThreshold} votes, they can claim
                      their verification badge
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="text-center">
                  <p className="text-gray-600 mb-2">
                    Current Verification Votes
                  </p>
                  <div className="text-4xl font-bold text-blue-600">
                    {profileInfo?.verify_votes || 0}/{verifyThreshold}
                  </div>
                </div>
              </div>

              {!currentAccount?.address && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-800 text-sm">
                    💼 Connect your wallet to vote
                  </p>
                </div>
              )}

              <button
                onClick={handleVoteForProfile}
                disabled={voting || hasVoted}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {voting
                  ? "Processing..."
                  : hasVoted
                  ? "✓ Voted"
                  : "👍 Vote for This User"}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                You can vote for up to 2 different users
              </p>
            </div>
          )}
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`fixed bottom-4 right-4 p-4 rounded-lg text-white shadow-lg animate-fade-in ${
              toastMessage.type === "success" ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {toastMessage.message}
          </div>
        )}
      </div>
    </div>
  );
}
