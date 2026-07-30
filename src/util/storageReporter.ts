import { AccountData } from '../elvenar/Accounts';

/**
 * Interface representing a detailed storage breakdown for an individual key.
 */
export interface StorageItemReport {
  key: string;
  label: string; // User-friendly formatted name
  bytes: number;
  formattedSize: string;
  isAccount?: boolean; // Flag to identify user layouts cleanly after key re-mapping
}

/**
 * Overall diagnostic report of the Chrome extension local storage.
 */
export interface StorageReport {
  totalBytes: number;
  formattedTotal: string;
  percentageOfQuota: number; // Percentage used based on standard 10MB limit
  breakdown: StorageItemReport[];
}

/**
 * Converts a raw byte count into a formatted human-readable string.
 * e.g., 1048576 -> "1.00 MB"
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Helper to measure the string size in bytes using UTF-8 encoding.
 */
function estimateObjectSize(obj: unknown): number {
  try {
    const encoder = new TextEncoder();
    const stringContent = typeof obj === 'string' ? obj : JSON.stringify(obj);
    return encoder.encode(stringContent).length;
  } catch {
    return 0;
  }
}

/**
 * Generates a full storage footprint diagnostic report of the chrome.storage.local area.
 */
export async function generateStorageReport(): Promise<StorageReport> {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    throw new Error('Chrome Storage API is not available. This must run inside a browser extension context.');
  }

  // Omitting parameters entirely retrieves all entries (solves TS overload errors)
  const allData = await chrome.storage.local.get();

  let totalBytes: number;
  try {
    // Omitting parameters entirely queries the overall storage area size
    totalBytes = await chrome.storage.local.getBytesInUse();
  } catch {
    // Safe fallback estimation if getBytesInUse fails
    totalBytes = estimateObjectSize(allData);
  }

  const breakdown: StorageItemReport[] = [];
  const encoder = new TextEncoder();

  // Loop through each physical key in storage to analyze individual footprints
  for (const [key, value] of Object.entries(allData)) {
    let bytes: number;
    try {
      bytes = await chrome.storage.local.getBytesInUse([key]);
      // Fix Chrome returning 0 if a key is microscopic but stored
      if (bytes === 0 && value) {
        const stringContent = typeof value === 'string' ? value : JSON.stringify(value);
        bytes = encoder.encode(stringContent).length;
      }
    } catch {
      // Fallback measurement if key-specific getBytesInUse throws
      const stringContent = typeof value === 'string' ? value : JSON.stringify(value);
      bytes = encoder.encode(stringContent).length;
    }

    // --- Dynamic JSON Parsing Shield ---
    // Safely parse stringified objects before checking object structures
    let parsedValue: unknown = value;
    if (typeof value === 'string') {
      try {
        parsedValue = JSON.parse(value);
      } catch {
        // Fall back to original raw string if it is not valid JSON
        parsedValue = value;
      }
    }

    const isAccount = key.startsWith('accounts_') && !key.startsWith('accounts_last_saved');

    // Produce friendly human-readable label based on extension naming architecture
    let label = key;
    if (isAccount) {
      // Extract the city name directly from .cityQuery.accountName for the label
      const cityName = (parsedValue as AccountData)?.cityQuery?.accountName;
      if (cityName) {
        label = cityName;
      } else {
        const accountId = key.replace('accounts_', '');
        label = `City Data (${accountId})`;
      }
    } else if (key.startsWith('account_')) {
      const accountId = key.replace('account_', '');
      const rawName = (parsedValue as AccountData)?.cityQuery?.userData?.user_name || '<unknown>';
      label = rawName ? `City Layout: ${rawName} (${accountId})` : `City Data (${accountId})`;
    } else if (key.startsWith('overlay-store-')) {
      const accountId = key.replace('overlay-store-', '');
      label = `Overlay Settings (${accountId})`;
    } else if (key.startsWith('importedFaStock_')) {
      const accountId = key.replace('importedFaStock_', '');
      label = `FA Imported Stocks (${accountId})`;
    } else if (key.startsWith('faParameters_')) {
      const accountId = key.replace('faParameters_', '');
      label = `FA Configuration (${accountId})`;
    } else if (key === 'tab-store') {
      label = 'Primary Tab Workspace Store';
    }

    breakdown.push({
      key, // Keeps raw, unique, and stable key (e.g. "accounts_12345")
      label, // Uses the beautifully extracted cityName (e.g. "My Elvenar Oasis")
      bytes,
      formattedSize: formatBytes(bytes),
      isAccount,
    });
  }

  // Sort breakdown descending by byte size
  breakdown.sort((a, b) => b.bytes - a.bytes);

  // The standard local storage limit for MV3 extensions is 10MB (10,485,760 bytes)
  const MV3_LOCAL_STORAGE_QUOTA = 10 * 1024 * 1024;
  const percentageOfQuota = parseFloat(((totalBytes / MV3_LOCAL_STORAGE_QUOTA) * 100).toFixed(2));

  return {
    totalBytes,
    formattedTotal: formatBytes(totalBytes),
    percentageOfQuota: Math.min(100, percentageOfQuota),
    breakdown,
  };
}
