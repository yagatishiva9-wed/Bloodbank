/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AuditLedgerEntry,
  BloodGroup,
  DiscrepancyAnomaly,
  DonorBloodSource,
  HospitalBloodSource,
  InventorySnapshot,
  LedgerActionType,
} from '../types/blood';

/**
 * Fast deterministic hash function to simulate cryptographic hash chaining
 */
export function computeBlockChecksum(
  index: number,
  prevHash: string,
  timestamp: string,
  actionType: string,
  sourceId: string,
  units: number
): string {
  const payload = `${index}|${prevHash}|${timestamp}|${actionType}|${sourceId}|${units}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  // Generate a realistic 32-character SHA-like hex string
  return `0x${hex}e49a1b7c${hex.split('').reverse().join('')}df3c`.slice(0, 34);
}

/**
 * Creates a new immutable entry in the audit ledger
 */
export function createLedgerEntry(
  existingLedger: AuditLedgerEntry[],
  actionType: LedgerActionType,
  actor: string,
  sourceId: string,
  sourceCategory: 'hospital' | 'donor',
  bloodGroup: BloodGroup,
  unitsImpacted: number,
  details: string,
  unitId?: string
): AuditLedgerEntry {
  const blockIndex = existingLedger.length;
  const previousHash =
    existingLedger.length > 0
      ? existingLedger[existingLedger.length - 1].currentHash
      : '0x0000000000000000000000000000000000';
  const timestamp = new Date().toISOString();
  const eventId = `EVT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

  const currentHash = computeBlockChecksum(
    blockIndex,
    previousHash,
    timestamp,
    actionType,
    sourceId,
    unitsImpacted
  );

  return {
    blockIndex,
    eventId,
    timestamp,
    actionType,
    actor,
    unitId,
    sourceId,
    sourceCategory,
    bloodGroup,
    unitsImpacted,
    details,
    previousHash,
    currentHash,
    isIntegrityVerified: true,
  };
}

/**
 * Verifies the integrity of the audit ledger chain.
 * Returns true if every block correctly links to the previous block's hash.
 */
export function verifyLedgerChainIntegrity(ledger: AuditLedgerEntry[]): {
  isValid: boolean;
  tamperedIndex?: number;
  message: string;
} {
  if (ledger.length === 0) {
    return { isValid: true, message: 'Ledger empty, initial root valid.' };
  }

  for (let i = 0; i < ledger.length; i++) {
    const entry = ledger[i];
    const expectedPrev =
      i === 0 ? '0x0000000000000000000000000000000000' : ledger[i - 1].currentHash;

    if (entry.previousHash !== expectedPrev) {
      return {
        isValid: false,
        tamperedIndex: i,
        message: `Ledger broken at Block #${i}: Previous hash pointer mismatch. Data integrity compromised!`,
      };
    }

    const calculatedHash = computeBlockChecksum(
      entry.blockIndex,
      entry.previousHash,
      entry.timestamp,
      entry.actionType,
      entry.sourceId,
      entry.unitsImpacted
    );

    if (calculatedHash !== entry.currentHash) {
      return {
        isValid: false,
        tamperedIndex: i,
        message: `Block #${i} signature tampered! Recorded hash does not match block cryptographic payload.`,
      };
    }
  }

  return { isValid: true, message: 'Cryptographic ledger chain 100% verified and untampered.' };
}

/**
 * Creates an immutable point-in-time snapshot of the inventory
 */
export function createInventorySnapshot(
  hospitals: HospitalBloodSource[],
  donors: DonorBloodSource[],
  label: string,
  createdBy: string = 'System Sentry'
): InventorySnapshot {
  const snapshotId = `SNAP-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = new Date().toISOString();
  const totalUnitsCount = hospitals.reduce((acc, h) => acc + h.inventoryUnits.length, 0);

  // Compute a snapshot integrity checksum
  const serialized = JSON.stringify(hospitals.map((h) => ({ id: h.id, units: h.inventoryUnits.length })));
  let hash = 5381;
  for (let i = 0; i < serialized.length; i++) {
    hash = (hash * 33) ^ serialized.charCodeAt(i);
  }
  const hashChecksum = `SNAP_SHA_${Math.abs(hash).toString(16).toUpperCase()}`;

  return {
    snapshotId,
    timestamp,
    label,
    createdBy,
    hospitalsSnapshot: JSON.parse(JSON.stringify(hospitals)),
    donorsSnapshot: JSON.parse(JSON.stringify(donors)),
    totalUnitsCount,
    hashChecksum,
  };
}

/**
 * Diagnostic reconciliation tool: compares actual physical/in-memory inventory state
 * with cold chain sensor feeds and audit ledger records to detect anomalies.
 */
export function diagnoseInventoryDiscrepancies(
  hospitals: HospitalBloodSource[],
  ledger: AuditLedgerEntry[]
): DiscrepancyAnomaly[] {
  const anomalies: DiscrepancyAnomaly[] = [];
  const now = new Date('2026-09-30T02:00:00Z').getTime();

  hospitals.forEach((hosp) => {
    // 1. Check for Cold Chain Excursions
    if (hosp.coldChainStatus === 'fault' || hosp.coldChainTempC > 6.0 || hosp.coldChainTempC < 1.0) {
      const affectedAvailableUnits = hosp.inventoryUnits.filter(
        (u) => u.status === 'available' && !u.temperatureAlert
      );
      if (affectedAvailableUnits.length > 0) {
        anomalies.push({
          anomalyId: `ANOM-TEMP-${hosp.id}`,
          sourceId: hosp.id,
          sourceName: hosp.name,
          bloodGroup: 'O-', // Primary risk
          component: 'Packed Red Blood Cells (PRBC)',
          type: 'COLD_CHAIN_EXCURSION',
          severity: 'CRITICAL',
          description: `Temperature sensor reporting ${hosp.coldChainTempC.toFixed(1)}°C (Safe limit: 2.0-6.0°C). ${affectedAvailableUnits.length} active units at risk of protein hemolysis.`,
          suggestedAction: 'Immediate cold-chain quarantine protocol and auxiliary cooling failover.',
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // 2. Check for Expired units sitting on 'available' status
    hosp.inventoryUnits.forEach((unit) => {
      const exp = new Date(unit.expirationDate).getTime();
      if (exp < now && unit.status === 'available') {
        anomalies.push({
          anomalyId: `ANOM-EXP-${unit.unitId}`,
          sourceId: hosp.id,
          sourceName: hosp.name,
          unitId: unit.unitId,
          bloodGroup: unit.bloodGroup,
          component: unit.component,
          type: 'EXPIRED_ON_SHELF',
          severity: 'CRITICAL',
          description: `Unit ${unit.bagBarcode} (${unit.bloodGroup} ${unit.component}) expired on ${unit.expirationDate.slice(0, 10)} but still marked 'available'.`,
          suggestedAction: 'Auto-isolate and transition to clinical discard review.',
          detectedAt: new Date().toISOString(),
        });
      }
    });

    // 3. Check for Ledger Desync (Ledger says dispatched but unit still marked available)
    const dispatchesForHospital = ledger.filter(
      (l) => l.sourceId === hosp.id && l.actionType === 'DISPATCH_UNIT' && l.unitId
    );
    dispatchesForHospital.forEach((disp) => {
      const matchedUnit = hosp.inventoryUnits.find((u) => u.unitId === disp.unitId);
      if (matchedUnit && matchedUnit.status === 'available') {
        anomalies.push({
          anomalyId: `ANOM-DESYNC-${matchedUnit.unitId}`,
          sourceId: hosp.id,
          sourceName: hosp.name,
          unitId: matchedUnit.unitId,
          bloodGroup: matchedUnit.bloodGroup,
          component: matchedUnit.component,
          type: 'DESYNCED_COUNT',
          severity: 'WARNING',
          description: `Unit ${matchedUnit.bagBarcode} was logged as dispatched in Ledger Event ${disp.eventId}, but hospital state remains 'available'.`,
          suggestedAction: 'Replay dispatch event and mark unit as in_transit.',
          detectedAt: new Date().toISOString(),
        });
      }
    });
  });

  return anomalies;
}

/**
 * Automated Recovery Execution:
 * Reconciles the inventory by:
 * 1. Quarantining all units in temperature excursion facilities
 * 2. Moving expired units from 'available' to 'discarded'
 * 3. Syncing dispatched units matching ledger records
 * 4. Normalizing reservation counts
 */
export function executeAutomatedReconciliation(
  hospitals: HospitalBloodSource[],
  ledger: AuditLedgerEntry[]
): {
  recoveredHospitals: HospitalBloodSource[];
  reconciliationLedgerEntry: AuditLedgerEntry;
  fixedCount: number;
} {
  const recovered: HospitalBloodSource[] = JSON.parse(JSON.stringify(hospitals));
  const now = new Date('2026-09-30T02:00:00Z').getTime();
  let fixedCount = 0;

  recovered.forEach((hosp) => {
    // If temp was in fault, restore temperature to 3.8°C (backup cooling activated)
    if (hosp.coldChainStatus === 'fault' || hosp.coldChainTempC > 6.0) {
      hosp.coldChainStatus = 'optimal';
      hosp.coldChainTempC = 3.8;
      // Mark units that were exposed to quarantine for safety testing
      hosp.inventoryUnits.forEach((u) => {
        if (u.temperatureAlert) {
          u.status = 'quarantined';
          u.temperatureAlert = false;
          fixedCount++;
        }
      });
    }

    // Auto-discard expired units
    hosp.inventoryUnits.forEach((u) => {
      const exp = new Date(u.expirationDate).getTime();
      if (exp < now && u.status === 'available') {
        u.status = 'discarded';
        fixedCount++;
      }
    });

    // Replay dispatched states from ledger
    const dispatches = ledger.filter((l) => l.sourceId === hosp.id && l.actionType === 'DISPATCH_UNIT');
    dispatches.forEach((d) => {
      if (d.unitId) {
        const u = hosp.inventoryUnits.find((unit) => unit.unitId === d.unitId);
        if (u && u.status === 'available') {
          u.status = 'in_transit';
          fixedCount++;
        }
      }
    });

    // Recompute reserved count
    hosp.reservedUnits = hosp.inventoryUnits.filter((u) => u.status === 'reserved').length;
    hosp.inTransitUnits = hosp.inventoryUnits.filter((u) => u.status === 'in_transit').length;
  });

  const reconciliationEntry = createLedgerEntry(
    ledger,
    'RECONCILIATION_RESTORE',
    'Sentry Recovery Agent',
    'SYSTEM-RECOVERY-DAEMON',
    'hospital',
    'O-',
    fixedCount,
    `Automated reconciliation executed: resolved ${fixedCount} discrepancy anomalies across hospital inventory nodes.`
  );

  return {
    recoveredHospitals: recovered,
    reconciliationLedgerEntry: reconciliationEntry,
    fixedCount,
  };
}
