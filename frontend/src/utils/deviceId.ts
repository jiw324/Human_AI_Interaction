/**
 * Device ID Management
 * Generates a unique ID based on device fingerprint
 * Uses device characteristics to create consistent ID across sessions
 */

const DEVICE_ID_KEY = 'device_unique_id';

/**
 * Generate device fingerprint based on device characteristics
 * This creates a consistent ID for the same device/browser
 */
async function generateDeviceFingerprint(): Promise<string> {
  const fingerprint: string[] = [];
  
  // Screen characteristics
  fingerprint.push(`screen:${screen.width}x${screen.height}x${screen.colorDepth}`);
  fingerprint.push(`avail:${screen.availWidth}x${screen.availHeight}`);
  
  // Timezone
  fingerprint.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  fingerprint.push(`tzOffset:${new Date().getTimezoneOffset()}`);
  
  // Language
  fingerprint.push(`lang:${navigator.language}`);
  fingerprint.push(`langs:${navigator.languages.join(',')}`);
  
  // Platform & User Agent
  fingerprint.push(`platform:${navigator.platform}`);
  fingerprint.push(`ua:${navigator.userAgent}`);
  
  // Hardware concurrency (CPU cores)
  fingerprint.push(`cores:${navigator.hardwareConcurrency || 'unknown'}`);
  
  // Device memory (if available)
  fingerprint.push(`memory:${(navigator as any).deviceMemory || 'unknown'}`);
  
  // Canvas fingerprint (unique to device GPU/driver)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Device ID', 2, 15);
      fingerprint.push(`canvas:${canvas.toDataURL().substring(0, 100)}`);
    }
  } catch (e) {
    fingerprint.push('canvas:error');
  }
  
  // WebGL fingerprint
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        fingerprint.push(`gpu:${gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)}`);
        fingerprint.push(`vendor:${gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)}`);
      }
    }
  } catch (e) {
    fingerprint.push('webgl:error');
  }
  
  // Combine all fingerprint data
  const fingerprintString = fingerprint.join('|');
  
  // Generate hash from fingerprint (simple hash function)
  const hash = await simpleHash(fingerprintString);
  
  return `device_${hash}`;
}

/**
 * Simple hash function to convert fingerprint string to consistent ID
 */
async function simpleHash(str: string): Promise<string> {
  // Use SubtleCrypto if available for better hashing
  if (window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex.substring(0, 32); // Use first 32 chars
    } catch (e) {
      // Fall back to simple hash if crypto.subtle fails
    }
  }
  
  // Fallback: Simple string hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Get or create device ID using hybrid approach
 * - Priority 1: localStorage (random UUID for uniqueness)
 * - Priority 2: IndexedDB backup (survives localStorage clear)
 * - Priority 3: Fingerprint-based recovery (if all else fails)
 */
export async function getDeviceId(): Promise<string> {
  // Priority 1: Check localStorage (fastest)
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (deviceId) {
    console.log('🆔 Using cached device ID from localStorage:', deviceId);
    // Ensure it's also backed up in IndexedDB
    await saveToIndexedDB(deviceId);
    return deviceId;
  }
  
  // Priority 2: Check IndexedDB backup (survives localStorage clear)
  console.log('🔍 localStorage empty, checking IndexedDB backup...');
  deviceId = await loadFromIndexedDB();
  
  if (deviceId) {
    console.log('💾 Restored device ID from IndexedDB:', deviceId);
    // Restore to localStorage
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  }
  
  // Priority 3: Generate fingerprint-based ID (stable per device)
  console.log('✨ First time visit - generating new fingerprint-based device ID...');
  try {
    deviceId = await generateDeviceFingerprint();
  } catch (e) {
    // Fallback: random UUID if fingerprinting fails for any reason
    console.warn('⚠️ Fingerprint generation failed, falling back to random ID:', e);
    deviceId = generateRandomDeviceId();
  }
  
  // Store in both places
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
  await saveToIndexedDB(deviceId);
  
  console.log('🆔 Generated new device ID:', deviceId);
  console.log('💾 Stored in localStorage and IndexedDB');
  
  return deviceId;
}

/**
 * Generate random device ID (UUID v4 based)
 * This ensures uniqueness even for identical devices
 */
function generateRandomDeviceId(): string {
  return 'device_' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Save device ID to IndexedDB for persistence
 */
async function saveToIndexedDB(deviceId: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(['deviceId'], 'readwrite');
    const store = transaction.objectStore('deviceId');
    
    // Wrap IDBRequest in a Promise
    await new Promise<void>((resolve, reject) => {
      const request = store.put({ id: 1, deviceId });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    console.log('💾 Device ID backed up to IndexedDB');
  } catch (error) {
    console.warn('⚠️ Could not save to IndexedDB:', error);
    // Non-critical - continue without IndexedDB backup
  }
}

/**
 * Load device ID from IndexedDB
 */
async function loadFromIndexedDB(): Promise<string | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(['deviceId'], 'readonly');
    const store = transaction.objectStore('deviceId');
    
    // Wrap IDBRequest in a Promise
    const result = await new Promise<any>((resolve, reject) => {
      const request = store.get(1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    return result?.deviceId || null;
  } catch (error) {
    console.warn('⚠️ Could not load from IndexedDB:', error);
    return null;
  }
}

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('DeviceIdentity', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('deviceId')) {
        db.createObjectStore('deviceId', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Synchronous version that returns cached ID or placeholder
 * Use this only when you need immediate access
 * Prefer the async version for accurate fingerprinting
 */
export function getDeviceIdSync(): string {
  const cached = localStorage.getItem(DEVICE_ID_KEY);
  if (cached) {
    return cached;
  }
  // Return placeholder - should regenerate with async version
  return 'device_loading';
}

/**
 * Reset device ID (regenerates from fingerprint)
 * Useful for testing or if user wants to reset their identity
 */
export async function resetDeviceId(): Promise<string> {
  localStorage.removeItem(DEVICE_ID_KEY);
  return await getDeviceId();
}

/**
 * Get device info for debugging
 */
export async function getDeviceInfo(): Promise<{
  deviceId: string;
  browser: string;
  platform: string;
  screen: string;
  timezone: string;
  language: string;
  cores: number;
  cached: boolean;
}> {
  const cached = localStorage.getItem(DEVICE_ID_KEY);
  const deviceId = await getDeviceId();
  
  return {
    deviceId,
    browser: navigator.userAgent,
    platform: navigator.platform,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    cores: navigator.hardwareConcurrency || 0,
    cached: cached !== null
  };
}

