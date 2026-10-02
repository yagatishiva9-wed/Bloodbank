/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BloodGroup, BloodComponent, BloodInventoryUnit } from '../types/blood';

export interface ParsedBloodBagData {
  isHemaSyncPayload: boolean;
  bagBarcode: string;
  unitId?: string;
  bloodGroup?: BloodGroup;
  component?: BloodComponent;
  volumeMl?: number;
  collectionDate?: string;
  expirationDate?: string;
  donor_name?: string;
  storageLocation?: string;
  status?: BloodInventoryUnit['status'];
  testedClear?: boolean;
  rawText: string;
}

/**
 * Parses raw text from a scanned QR code or barcode into structured blood bag metadata
 */
export function parseScannedBagQr(rawText: string): ParsedBloodBagData {
  const trimmed = rawText.trim();

  // 1. Try parsing JSON format
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const data = JSON.parse(trimmed);
      const isHemaSync = data.type === 'hemasync_blood_bag' || Boolean(data.bagBarcode || data.bloodGroup);
      return {
        isHemaSyncPayload: isHemaSync,
        bagBarcode: data.bagBarcode || data.barcode || data.din || `DIN-${Math.floor(1000 + Math.random() * 9000)}`,
        unitId: data.unitId || data.id,
        bloodGroup: data.bloodGroup || data.bloodType,
        component: data.component,
        volumeMl: Number(data.volumeMl) || Number(data.volume) || 450,
        collectionDate: data.collectionDate,
        expirationDate: data.expirationDate,
        donor_name: data.donor_name || data.donorName,
        storageLocation: data.storageLocation,
        status: data.status || 'available',
        testedClear: data.testedClear !== undefined ? Boolean(data.testedClear) : true,
        rawText,
      };
    } catch {
      // Continue to string parsing
    }
  }

  // 2. Try parsing URL format: https://hemasync.med/bag/DIN-O-NEG-8492
  if (trimmed.includes('/bag/')) {
    const parts = trimmed.split('/bag/');
    const barcode = parts[1]?.split('?')[0] || trimmed;
    return {
      isHemaSyncPayload: true,
      bagBarcode: barcode,
      rawText,
    };
  }

  // 3. Plain ISBT-128 or DIN barcode string
  return {
    isHemaSyncPayload: false,
    bagBarcode: trimmed,
    rawText,
  };
}

/**
 * Play a high-precision medical confirmation beep on scan
 */
export function playScannerBeep(frequency = 880, durationMs = 120) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch (err) {
    console.debug('Audio feedback not available:', err);
  }
}

/**
 * Trigger mobile haptic feedback on successful scan
 */
export function triggerHapticFeedback() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([60, 40, 80]);
    }
  } catch (err) {
    console.debug('Haptics not supported:', err);
  }
}
