/**
 * Profile Service
 * Các functions để tương tác với Profile module
 */

import { Transaction } from "@mysten/sui/transactions";
import { CONTRACT_CONFIG, FEE_CONFIG } from "@/config/contracts";
import { suiClient } from "./suiClient";

/**
 * Mint profile mới
 */
export const mintProfile = async (
  walletAddress: string,
  profile: {
    name: string;
    bio: string;
    avatarUrl: string;
    socialLinks: string[];
    country: string;
  }
) => {
  const tx = new Transaction();

  // Split coin để trả phí
  const [feeCoin] = tx.splitCoins(tx.gas, [FEE_CONFIG.MINT_PROFILE_FEE]);

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::profiles::mint_profile`,
    arguments: [
      tx.object(CONTRACT_CONFIG.PROFILE_REGISTRY_ID),
      tx.pure.string(profile.name),
      tx.pure.string(profile.bio),
      tx.pure.string(profile.avatarUrl),
      tx.pure.vector("string", profile.socialLinks),
      tx.pure.string(profile.country),
      feeCoin,
      tx.object(CONTRACT_CONFIG.CLOCK_ID),
    ],
  });

  return tx;
};

/**
 * Update profile
 */
export const updateProfile = async (
  profileId: string,
  updates: {
    name: string;
    bio: string;
    avatarUrl: string;
    socialLinks: string[];
  }
) => {
  const tx = new Transaction();

  const [feeCoin] = tx.splitCoins(tx.gas, [FEE_CONFIG.UPDATE_PROFILE_FEE]);

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::profiles::update_profile`,
    arguments: [
      tx.object(CONTRACT_CONFIG.PROFILE_REGISTRY_ID),
      tx.object(profileId),
      tx.pure.string(updates.name),
      tx.pure.string(updates.bio),
      tx.pure.string(updates.avatarUrl),
      tx.pure.vector("string", updates.socialLinks),
      feeCoin,
    ],
  });

  return tx;
};

/**
 * Claim badge tại location (gacha)
 */
export const claimBadge = async (profileId: string, locationId: number) => {
  const tx = new Transaction();

  const [feeCoin] = tx.splitCoins(tx.gas, [FEE_CONFIG.CLAIM_BADGE_FEE]);

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::profiles::claim_badge`,
    arguments: [
      tx.object(profileId),
      tx.object(CONTRACT_CONFIG.LOCATION_REGISTRY_ID),
      tx.pure.u64(locationId),
      feeCoin,
      tx.object(CONTRACT_CONFIG.CLOCK_ID),
    ],
  });

  return tx;
};

/**
 * Vote cho profile để verify
 * @param targetProfileOwnerAddress - Địa chỉ (address) của chủ sở hữu profile cần vote, không phải object ID
 */
export const voteForProfile = async (targetProfileOwnerAddress: string) => {
  const tx = new Transaction();

  const [feeCoin] = tx.splitCoins(tx.gas, [FEE_CONFIG.VOTE_PROFILE_FEE]);

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::profiles::vote_for_profile`,
    arguments: [
      tx.object(CONTRACT_CONFIG.PROFILE_REGISTRY_ID),
      tx.object(CONTRACT_CONFIG.VOTER_REGISTRY_ID),
      tx.pure.address(targetProfileOwnerAddress),
      feeCoin,
    ],
  });

  return tx;
};

/**
 * Claim verification badge
 */
export const claimVerification = async (profileId: string) => {
  const tx = new Transaction();

  const [feeCoin] = tx.splitCoins(tx.gas, [FEE_CONFIG.CLAIM_VERIFY_FEE]);

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::profiles::claim_verification`,
    arguments: [
      tx.object(CONTRACT_CONFIG.PROFILE_REGISTRY_ID),
      tx.object(CONTRACT_CONFIG.VOTER_REGISTRY_ID),
      tx.object(profileId),
      feeCoin,
    ],
  });

  return tx;
};

/**
 * Get profile object từ address
 */
export const getProfileByAddress = async (address: string) => {
  try {
    const objects = await suiClient.getOwnedObjects({
      owner: address,
      filter: {
        StructType: `${CONTRACT_CONFIG.PACKAGE_ID}::profiles::ProfileNFT`,
      },
      options: {
        showContent: true,
        showDisplay: true,
      },
    });

    if (objects.data.length === 0) return null;

    return objects.data[0];
  } catch (error) {
    console.error("Error getting profile:", error);
    return null;
  }
};

/**
 * Get profile details
 */
export const getProfileDetails = async (profileId: string) => {
  try {
    const object = await suiClient.getObject({
      id: profileId,
      options: {
        showContent: true,
        showDisplay: true,
        showOwner: true,
      },
    });

    return object;
  } catch (error) {
    console.error("Error getting profile details:", error);
    return null;
  }
};

/**
 * Check if user has minted profile
 */
export const hasProfile = async (address: string) => {
  const profile = await getProfileByAddress(address);
  return profile !== null;
};

/**
 * Get badge details từ profile
 * Trả về array of badges với location_id, location_name, image_url, rarity, perfection, created_at
 */
export const getBadgesFromProfile = async (address: string) => {
  try {
    const profile = await getProfileByAddress(address);
    if (!profile || !profile.data?.content) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileFields = (profile.data.content as any).fields;
    const claimedBadges = profileFields.claimed_badges || [];

    // Map ClaimedBadgeInfo objects directly
    const badges = Array.isArray(claimedBadges)
      ? claimedBadges.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (badgeInfo: any) => {
            // Handle both plain object and Sui object with .fields
            const data = badgeInfo.fields ? badgeInfo.fields : badgeInfo;

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
        )
      : [];

    return badges;
  } catch (error) {
    console.error("Error getting badges from profile:", error);
    return [];
  }
};

/**
 * Get verification status
 */
export const getVerificationStatus = async (profileId: string) => {
  try {
    const profile = await getProfileDetails(profileId);
    if (!profile || !profile.data?.content) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = profile.data.content as any;
    return {
      isVerified: content.fields.is_verified || false,
      verifyVotes: parseInt(content.fields.verify_votes || "0"),
      badgeCount: parseInt(content.fields.badge_count || "0"),
    };
  } catch (error) {
    console.error("Error getting verification status:", error);
    return null;
  }
};

/**
 * Get actual vote count for a profile owner from VoterRegistry
 * Uses Sui's dynamic field API to query the votes_received table
 */
export const getActualVoteCount = async (profileOwnerAddress: string) => {
  try {
    // First, fetch VoterRegistry to get votes_received table ID
    const voterRegistry = await suiClient.getObject({
      id: CONTRACT_CONFIG.VOTER_REGISTRY_ID,
      options: {
        showContent: true,
      },
    });

    if (!voterRegistry.data?.content) return 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const registryContent = voterRegistry.data.content as any;

    // Get votes_received table object ID
    const votesReceivedTableId =
      registryContent.fields?.votes_received?.fields?.id?.id;
    if (!votesReceivedTableId) {
      console.error("votes_received table ID not found");
      return 0;
    }

    // Query the table for the specific address key
    try {
      const tableData = await suiClient.getDynamicFieldObject({
        parentId: votesReceivedTableId,
        name: {
          type: "address",
          value: profileOwnerAddress,
        },
      });

      if (!tableData.data?.content) return 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fieldContent = tableData.data.content as any;
      const voteCount = parseInt(fieldContent.fields?.value || "0");
      return voteCount;
    } catch {
      return 0;
    }
  } catch (error) {
    console.error("Error getting actual vote count:", error);
    return 0;
  }
};

/**
 * Get all memory NFTs owned by a user
 */
export const getUserMemoryNFTs = async (userAddress: string) => {
  try {
    // Query owned objects that are MemoryNFT type
    const objects = await suiClient.getOwnedObjects({
      owner: userAddress,
      filter: {
        StructType: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_nft::MemoryNFT`,
      },
      options: {
        showContent: true,
      },
    });

    const userNFTs = [];

    for (const obj of objects.data) {
      try {
        if (obj.data?.content) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fields = (obj.data.content as any).fields;
          userNFTs.push({
            id: obj.data.objectId,
            name: fields.name || "",
            content: fields.content || "",
            image_url: fields.image_url || "",
            latitude: fields.latitude || "0",
            longitude: fields.longitude || "0",
            rarity: fields.rarity || 0,
            perfection: fields.perfection || 0,
            created_at: fields.created_at || new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(`Failed to fetch NFT:`, error);
      }
    }

    return userNFTs;
  } catch (error) {
    console.error("Error getting user memory NFTs:", error);
    return [];
  }
};

/**
 * Get profile badges from claimed_badges vector
 */
export const getProfileBadges = async (profileId: string) => {
  try {
    const profile = await suiClient.getObject({
      id: profileId,
      options: { showContent: true },
    });

    if (!profile.data?.content) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields = (profile.data.content as any).fields;
    const claimedBadges = fields.claimed_badges || [];

    if (!Array.isArray(claimedBadges)) return [];

    // Convert vector of ClaimedBadgeInfo to Badge format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return claimedBadges.map((badge: any) => ({
      location_id: Number(badge.location_id) || 0,
      location_name: badge.location_name || "",
      image_url: badge.image_url || "",
      rarity: badge.rarity || 0,
      perfection: Number(badge.perfection) || 0,
      created_at: badge.created_at || "",
    }));
  } catch (error) {
    console.error("Error getting profile badges:", error);
    return [];
  }
};

/**
 * List Memory NFT to Kiosk for selling
 * User needs to have a Kiosk first and its KioskOwnerCap
 */
export const listMemoryNFTToKiosk = async (
  kioskId: string,
  kioskCapId: string,
  memoryNFTId: string,
  price: bigint
) => {
  const tx = new Transaction();

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::list_memory`,
    arguments: [
      tx.object(CONTRACT_CONFIG.MEMORY_MAKET_PLACE_ID), // registry
      tx.object(kioskId), // kiosk
      tx.object(kioskCapId), // cap (KioskOwnerCap for kiosk ownership)
      tx.object(memoryNFTId), // memory NFT to list
      tx.pure.u64(price), // price
      tx.object(CONTRACT_CONFIG.CLOCK_ID), // clock
    ],
  });

  return tx;
};

/**
 * Get user's Kiosk ID by checking if they have a KioskOwnerCap
 * Since Kiosk is a shared object, we identify ownership via the cap
 */
export const getUserKiosks = async (userAddress: string) => {
  try {
    // Check if user has KioskOwnerCap (proof of kiosk ownership)
    const caps = await suiClient.getOwnedObjects({
      owner: userAddress,
      filter: {
        StructType: "0x2::kiosk::KioskOwnerCap",
      },
      options: {
        showContent: true,
      },
    });

    if (!caps.data || caps.data.length === 0) {
      return [];
    }

    // User has a KioskOwnerCap - extract the kiosk ID from cap content
    const kioskList = caps.data
      .map((cap) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const capContent = cap.data?.content as any;
        const kioskId = capContent?.fields?.for;
        return {
          id: kioskId || "",
          capId: cap.data?.objectId || "",
        };
      })
      .filter((k) => k.id);

    return kioskList;
  } catch (error) {
    console.error("Error getting user kiosks:", error);
    return [];
  }
};

/**
 * Get user's KioskOwnerCap objects (needed to manage kiosk)
 */
export const getUserKioskCaps = async (userAddress: string) => {
  try {
    const objects = await suiClient.getOwnedObjects({
      owner: userAddress,
      filter: {
        StructType: "0x2::kiosk::KioskOwnerCap",
      },
      options: {
        showContent: true,
      },
    });

    return objects.data.map((obj) => ({
      id: obj.data?.objectId || "",
      ...obj.data?.content,
    }));
  } catch (error) {
    console.error("Error getting user kiosk caps:", error);
    return [];
  }
};

/**
 * Create a new Kiosk for user
 * Uses custom contract helper function for proper Move handling
 * Enforces 1 kiosk per user via Table tracking
 */
export const createKiosk = async () => {
  const tx = new Transaction();

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::create_kiosk`,
    arguments: [
      tx.object(CONTRACT_CONFIG.MEMORY_MAKET_PLACE_ID), // registry
    ],
  });

  return tx;
};

/**
 * Get all Memory Listings from all kiosks
 * Queries MemoryListing objects by event history
 */
export const getAllListings = async () => {
  try {
    // Query MemoryListed events to find all listings
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::MemoryListed`,
      },
      limit: 100,
      order: "descending",
    });

    const listings = [];

    // For each event, try to get the listing object
    for (const event of events.data) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const eventData = event.parsedJson as any;
        if (eventData?.listing_id) {
          const listing = await suiClient.getObject({
            id: eventData.listing_id,
            options: {
              showContent: true,
              showOwner: true,
            },
          });

          if (listing.data?.content) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fields = (listing.data.content as any).fields;
            listings.push({
              id: listing.data.objectId,
              seller: fields.seller,
              memoryId: fields.memory_id,
              price: fields.price,
              listedAt: fields.listed_at,
              ...eventData,
            });
          }
        }
      } catch (err) {
        // Skip if listing object not found
        console.debug("Could not fetch listing object", err);
      }
    }

    return listings;
  } catch (error) {
    console.error("Error getting all listings:", error);
    return [];
  }
};

/**
 * Buy Memory NFT from marketplace
 * User can either place in their kiosk or receive directly
 */
export const buyMemory = async (
  listingId: string,
  sellerKioskId: string,
  buyerKioskId: string,
  buyerCapId: string,
  priceInMist: bigint
) => {
  const tx = new Transaction();

  // Split payment coin
  const [paymentCoin] = tx.splitCoins(tx.gas, [priceInMist]);

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::buy_memory`,
    arguments: [
      tx.object(CONTRACT_CONFIG.MEMORY_MAKET_PLACE_ID), // registry
      tx.object(listingId), // listing (will be consumed)
      tx.object(sellerKioskId), // seller_kiosk
      tx.object(buyerKioskId), // buyer_kiosk
      tx.object(buyerCapId), // buyer_cap
      tx.object(CONTRACT_CONFIG.TRANSFER_POLICY_ID), // policy
      paymentCoin, // payment
    ],
  });

  return tx;
};

/**
 * Buy Memory NFT and receive directly (not in kiosk)
 */
export const buyMemoryDirect = async (
  listingId: string,
  sellerKioskId: string,
  priceInMist: bigint
) => {
  const tx = new Transaction();

  const [paymentCoin] = tx.splitCoins(tx.gas, [priceInMist]);

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::buy_memory_direct`,
    arguments: [
      tx.object(CONTRACT_CONFIG.MEMORY_MAKET_PLACE_ID), // registry
      tx.object(listingId), // listing (will be consumed)
      tx.object(sellerKioskId), // seller_kiosk
      tx.object(CONTRACT_CONFIG.TRANSFER_POLICY_ID), // policy
      paymentCoin, // payment
    ],
  });

  return tx;
};

/**
 * Get all listings in user's kiosk
 * Shows all Memory NFTs that user has listed for sale
 */
export const getUserKioskListings = async (userAddress: string) => {
  try {
    // First get user's kiosk
    const kiosks = await getUserKiosks(userAddress);

    if (!kiosks || kiosks.length === 0) {
      return [];
    }

    const kioskId = kiosks[0].id;

    // Query MemoryListed events to find listings in this kiosk
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::MemoryListed`,
      },
      limit: 100,
      order: "descending",
    });

    const kioskListings = [];

    // For each event, get listing and filter by seller address
    for (const event of events.data) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const eventData = event.parsedJson as any;

        // Get listing object by ID from event
        if (eventData?.listing_id) {
          const listing = await suiClient.getObject({
            id: eventData.listing_id,
            options: {
              showContent: true,
              showOwner: true,
            },
          });

          if (listing.data?.content) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fields = (listing.data.content as any).fields;

            // Filter by seller address - only show listings from this user

            if (fields.seller === userAddress) {
              try {
                const memoryNFT = await suiClient.getObject({
                  id: fields.memory_id,
                  options: {
                    showContent: true,
                  },
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const memoryFields = (memoryNFT.data?.content as any)?.fields;

                kioskListings.push({
                  listingId: listing.data.objectId,
                  memoryId: fields.memory_id,
                  kioskId: kioskId,
                  seller: fields.seller,
                  price: fields.price,
                  listedAt: fields.listed_at,
                  // Memory NFT fields
                  name: memoryFields?.name || "Unknown",
                  content: memoryFields?.content || "",
                  imageUrl: memoryFields?.image_url || "",
                  latitude: memoryFields?.latitude || "",
                  longitude: memoryFields?.longitude || "",
                  rarity: memoryFields?.rarity || 0,
                  perfection: memoryFields?.perfection || 0,
                });
              } catch (err) {
                console.debug("Could not fetch memory NFT details:", err);
                // If can't get memory details, still add listing with minimal info
                kioskListings.push({
                  listingId: listing.data.objectId,
                  memoryId: fields.memory_id,
                  kioskId: kioskId,
                  seller: fields.seller,
                  price: fields.price,
                  listedAt: fields.listed_at,
                  name: "Memory NFT",
                  content: "",
                  imageUrl: "",
                  latitude: "",
                  longitude: "",
                  rarity: 0,
                  perfection: 0,
                });
              }
            }
          }
        }
      } catch (err) {
        console.debug("Could not fetch kiosk listing", err);
      }
    }

    return kioskListings;
  } catch (error) {
    console.error("Error getting user kiosk listings:", error);
    return [];
  }
};

/**
 * Alternative approach: Get kiosk listings by querying MemoryListing objects
 * This is a fallback if event-based query doesn't work
 */
export const getUserKioskListingsAlt = async (userAddress: string) => {
  try {
    // First get user's kiosk
    const kiosks = await getUserKiosks(userAddress);

    if (!kiosks || kiosks.length === 0) {
      return [];
    }

    const kioskId = kiosks[0].id;

    // Query MemoryListing objects by type
    const objects = await suiClient.getOwnedObjects({
      owner: kioskId, // Kiosk is the owner of listings
      filter: {
        StructType: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::MemoryListing`,
      },
      options: {
        showContent: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kioskListings: any[] = [];

    // Process each listing object
    for (const obj of objects.data) {
      try {
        if (obj.data?.content) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fields = (obj.data.content as any).fields;

          // Try to get Memory NFT details
          try {
            const memoryNFT = await suiClient.getObject({
              id: fields.memory_id,
              options: {
                showContent: true,
              },
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const memoryFields = (memoryNFT.data?.content as any)?.fields;

            kioskListings.push({
              listingId: obj.data.objectId,
              memoryId: fields.memory_id,
              kioskId: kioskId,
              seller: fields.seller,
              price: fields.price,
              listedAt: fields.listed_at,
              name: memoryFields?.name || "Unknown",
              content: memoryFields?.content || "",
              imageUrl: memoryFields?.image_url || "",
              latitude: memoryFields?.latitude || "",
              longitude: memoryFields?.longitude || "",
              rarity: memoryFields?.rarity || 0,
              perfection: memoryFields?.perfection || 0,
            });
          } catch (err) {
            console.debug("Could not fetch memory NFT details:", err);
            // Still add listing with minimal info
            kioskListings.push({
              listingId: obj.data.objectId,
              memoryId: fields.memory_id,
              kioskId: kioskId,
              seller: fields.seller,
              price: fields.price,
              listedAt: fields.listed_at,
              name: "Memory NFT",
              content: "",
              imageUrl: "",
              latitude: "",
              longitude: "",
              rarity: 0,
              perfection: 0,
            });
          }
        }
      } catch (err) {
        console.debug("Could not process listing object:", err);
      }
    }

    return kioskListings;
  } catch (error) {
    console.error("Error getting user kiosk listings (alt):", error);
    return [];
  }
};

/**
 * Get items directly from kiosk object using dynamic fields
 * This queries the kiosk's items table
 */
export const getKioskItems = async () => {
  try {
    // Query MemoryListed events to find all listings
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${CONTRACT_CONFIG.PACKAGE_ID}::memory_marketplace::MemoryListed`,
      },
      limit: 200,
      order: "descending",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = [];
    const processedListings = new Set<string>();

    // Process each event
    for (const event of events.data) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const eventData = event.parsedJson as any;

        if (
          eventData?.listing_id &&
          !processedListings.has(eventData.listing_id)
        ) {
          processedListings.add(eventData.listing_id);

          // Get listing object
          const listing = await suiClient.getObject({
            id: eventData.listing_id,
            options: {
              showContent: true,
            },
          });

          if (listing.data?.content) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fields = (listing.data.content as any).fields;

            // Try to get Memory NFT details
            try {
              const memoryNFT = await suiClient.getObject({
                id: fields.memory_id,
                options: {
                  showContent: true,
                },
              });

              if (memoryNFT.data?.content) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const memoryFields = (memoryNFT.data.content as any).fields;

                items.push({
                  listingId: listing.data.objectId,
                  memoryId: fields.memory_id,
                  seller: fields.seller,
                  price: fields.price,
                  listedAt: fields.listed_at,
                  name: memoryFields?.name || "Unknown",
                  content: memoryFields?.content || "",
                  imageUrl: memoryFields?.image_url || "",
                  latitude: memoryFields?.latitude || "",
                  longitude: memoryFields?.longitude || "",
                  rarity: memoryFields?.rarity || 0,
                  perfection: memoryFields?.perfection || 0,
                });
              }
            } catch (err) {
              console.debug("Could not fetch memory NFT details:", err);
              // Still add listing with minimal info
              items.push({
                listingId: listing.data.objectId,
                memoryId: fields.memory_id,
                seller: fields.seller,
                price: fields.price,
                listedAt: fields.listed_at,
                name: "Memory NFT",
                content: "",
                imageUrl: "",
                latitude: "",
                longitude: "",
                rarity: 0,
                perfection: 0,
              });
            }
          }
        }
      } catch (err) {
        console.debug("Could not process listing:", err);
      }
    }

    return items;
  } catch (error) {
    console.error("Error getting kiosk items:", error);
    return [];
  }
};
