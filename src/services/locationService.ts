/**
 * Location Service
 * Các functions để tương tác với Location Registry
 */

import { Transaction } from "@mysten/sui/transactions";
import { CONTRACT_CONFIG } from "@/config/contracts";
import { suiClient } from "./suiClient";

/**
 * Add location (Admin only)
 */
export const addLocation = async (location: {
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  imageCommon: string;
  imageRare: string;
  imageEpic: string;
  imageLegendary: string;
}) => {
  const tx = new Transaction();

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::profiles::add_location`,
    arguments: [
      tx.object(CONTRACT_CONFIG.LOCATION_REGISTRY_ID),
      tx.pure.string(location.name),
      tx.pure.string(location.description),
      tx.pure.string(location.latitude),
      tx.pure.string(location.longitude),
      tx.pure.string(location.imageCommon),
      tx.pure.string(location.imageRare),
      tx.pure.string(location.imageEpic),
      tx.pure.string(location.imageLegendary),
    ],
  });

  return tx;
};

/**
 * Get all locations
 */
export const getAllLocations = async () => {
  try {
    const registry = await suiClient.getObject({
      id: CONTRACT_CONFIG.LOCATION_REGISTRY_ID,
      options: {
        showContent: true,
      },
    });

    if (
      !registry.data?.content ||
      registry.data.content.dataType !== "moveObject"
    ) {
      return [];
    }

    const fields = registry.data.content.fields as Record<string, unknown>;
    const totalLocations = parseInt((fields.total_locations as string) || "0");

    // Get locations table
    const locationsTable = fields.locations as {
      type: string;
      fields: { id: { id: string } };
    };

    const tableId = locationsTable.fields.id.id;

    // Fetch each location from the table
    const locations = [];
    for (let i = 0; i < totalLocations; i++) {
      try {
        const locationField = await suiClient.getDynamicFieldObject({
          parentId: tableId,
          name: {
            type: "u64",
            value: i.toString(),
          },
        });

        if (locationField.data?.content) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const locationData = (locationField.data.content as any).fields.value
            .fields;
          locations.push({
            id: i,
            name: locationData.location_name,
            description: locationData.description,
            latitude: parseFloat(locationData.latitude.replace(/,/g, ".")),
            longitude: parseFloat(locationData.longitude.replace(/,/g, ".")),
            imageCommon: locationData.image_common,
            imageRare: locationData.image_rare,
            imageEpic: locationData.image_epic,
            imageLegendary: locationData.image_legendary,
          });
        }
      } catch (error) {
        console.error(`Error fetching location ${i}:`, error);
      }
    }

    return locations;
  } catch (error) {
    console.error("Error getting locations:", error);
    return [];
  }
};

/**
 * Get location by ID
 */
export const getLocationById = async (locationId: number) => {
  try {
    // TODO: Implement dynamic field lookup
    const registry = await suiClient.getObject({
      id: CONTRACT_CONFIG.LOCATION_REGISTRY_ID,
      options: {
        showContent: true,
      },
    });

    return registry;
  } catch (error) {
    console.error("Error getting location:", error);
    return null;
  }
};

/**
 * Get total locations count
 */
export const getTotalLocations = async () => {
  try {
    const registry = await suiClient.getObject({
      id: CONTRACT_CONFIG.LOCATION_REGISTRY_ID,
      options: {
        showContent: true,
      },
    });

    if (
      !registry.data?.content ||
      registry.data.content.dataType !== "moveObject"
    ) {
      return 0;
    }

    const fields = registry.data.content.fields as Record<string, unknown>;
    return parseInt((fields.total_locations as string) || "0");
  } catch (error) {
    console.error("Error getting total locations:", error);
    return 0;
  }
};

/**
 * Convert GPS coordinates to u64 format
 * Multiply by 1,000,000 to preserve 6 decimal places
 */
export const gpsToU64 = (coordinate: number): string => {
  return Math.round(coordinate * 1_000_000).toString();
};

/**
 * Convert u64 format back to GPS coordinates
 */
export const u64ToGps = (value: string | number): number => {
  return parseInt(value.toString()) / 1_000_000;
};
