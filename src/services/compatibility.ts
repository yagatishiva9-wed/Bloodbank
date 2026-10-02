/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BloodComponent,
  BloodGroup,
  BloodSource,
  isDonorSource,
  isHospitalSource,
  MatchScoreResult,
} from '../types/blood';

export const ALL_BLOOD_GROUPS: BloodGroup[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

/**
 * Standard Red Blood Cell (PRBC) Compatibility Matrix
 * Recipient Blood Group -> Compatible Donor Blood Groups (ranked from exact to acceptable)
 */
export const RBC_COMPATIBILITY_MAP: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'], // Universal Recipient
};

/**
 * Plasma (FFP) Compatibility Matrix
 * (Opposite of Red Blood Cells: AB plasma has no anti-A or anti-B antibodies, making it the universal plasma donor!)
 */
export const PLASMA_COMPATIBILITY_MAP: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // O can receive plasma from any group
  'O+': ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'],
  'A-': ['A-', 'AB-', 'A+', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'AB-', 'B+', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'], // AB can only safely receive AB plasma
};

/**
 * Platelet compatibility generally prefers ABO-identical, but in critical trauma
 * allows ABO-compatible RBC or Plasma equivalents.
 */
export const PLATELET_COMPATIBILITY_MAP: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-', 'O+', 'A-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-', 'A+'],
  'A+': ['A+', 'A-', 'O+'],
  'B-': ['B-', 'O-', 'B+'],
  'B+': ['B+', 'B-', 'O+'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'A+', 'B+', 'O+'],
};

/**
 * Check if donorGroup can donate to recipientGroup given the specific component
 */
export function isBloodCompatible(
  recipientGroup: BloodGroup,
  donorGroup: BloodGroup,
  component: BloodComponent
): boolean {
  if (recipientGroup === donorGroup) return true;

  if (component === 'Fresh Frozen Plasma (FFP)') {
    const valid = PLASMA_COMPATIBILITY_MAP[recipientGroup];
    return valid ? valid.includes(donorGroup) : false;
  }

  if (component === 'Platelets (SDP/RDP)') {
    const valid = PLATELET_COMPATIBILITY_MAP[recipientGroup];
    return valid ? valid.includes(donorGroup) : false;
  }

  // PRBC, Whole Blood, Cryoprecipitate follow RBC compatibility rules
  const valid = RBC_COMPATIBILITY_MAP[recipientGroup];
  return valid ? valid.includes(donorGroup) : false;
}

/**
 * Return all clinically compatible donor groups for a recipient and component
 */
export function getCompatibleDonorGroups(
  recipientGroup: BloodGroup,
  component: BloodComponent
): BloodGroup[] {
  if (component === 'Fresh Frozen Plasma (FFP)') {
    return PLASMA_COMPATIBILITY_MAP[recipientGroup] || [recipientGroup];
  }
  if (component === 'Platelets (SDP/RDP)') {
    return PLATELET_COMPATIBILITY_MAP[recipientGroup] || [recipientGroup];
  }
  return RBC_COMPATIBILITY_MAP[recipientGroup] || [recipientGroup];
}

/**
 * Evaluates a BloodSource (discriminated union: Hospital or Donor)
 * and computes match scores, ETA, readiness, and compatibility ranking.
 */
export function evaluateBloodSourceMatch(
  source: BloodSource,
  recipientGroup: BloodGroup,
  component: BloodComponent,
  unitsNeeded: number
): MatchScoreResult {
  const compatibleGroups = getCompatibleDonorGroups(recipientGroup, component);

  if (isHospitalSource(source)) {
    // Check hospital inventory for exact or compatible units
    const exactAvailable = source.inventoryUnits.filter(
      (u) =>
        u.bloodGroup === recipientGroup &&
        u.component === component &&
        u.status === 'available' &&
        u.testedClear &&
        !u.temperatureAlert
    ).length;

    const compatibleAvailable = source.inventoryUnits.filter(
      (u) =>
        compatibleGroups.includes(u.bloodGroup) &&
        u.component === component &&
        u.status === 'available' &&
        u.testedClear &&
        !u.temperatureAlert
    ).length;

    const totalAvailable = exactAvailable > 0 ? exactAvailable : compatibleAvailable;
    const isExact = exactAvailable >= unitsNeeded;
    const isCompatible = compatibleAvailable > 0;

    let rank: MatchScoreResult['compatibilityRank'] = 'INCOMPATIBLE';
    let notes = '';

    if (exactAvailable >= unitsNeeded) {
      rank = 'EXACT';
      notes = `Exact match available in certified cold storage (${exactAvailable} units in stock)`;
    } else if (exactAvailable > 0) {
      rank = 'COMPATIBLE';
      notes = `Partial exact match (${exactAvailable} units) + compatible alternative available`;
    } else if (isCompatible) {
      rank = 'COMPATIBLE';
      notes = `Compatible donor group units available (${compatibleAvailable} units). Standard pre-transfusion crossmatch required.`;
    } else {
      rank = 'INCOMPATIBLE';
      notes = 'No compatible component units currently in stock at this facility';
    }

    // Lead time = base cold chain verification + transit (approx 1.5 min per km)
    const transitMins = Math.round(source.distanceKm * 1.6);
    const totalLeadTime = source.leadTimeMinutes + transitMins;

    // Score calculation (lower is better)
    const rankPenalty = rank === 'EXACT' ? 0 : rank === 'COMPATIBLE' ? 30 : 999;
    const distancePenalty = source.distanceKm * 1.2;
    const timePenalty = totalLeadTime * 0.8;
    const coldChainPenalty = source.coldChainStatus === 'optimal' ? 0 : 50;

    const compositeScore = rankPenalty + distancePenalty + timePenalty + coldChainPenalty;

    return {
      source,
      compatibilityRank: rank,
      compatibleGroups,
      availableUnits: totalAvailable,
      leadTimeMinutes: totalLeadTime,
      distanceKm: source.distanceKm,
      compositeScore: Math.round(compositeScore),
      canFulfillImmediately: totalAvailable >= unitsNeeded && rank !== 'INCOMPATIBLE',
      notes,
    };
  }

  if (isDonorSource(source)) {
    // Individual donor evaluation
    const isExact = source.bloodGroup === recipientGroup;
    const isCompatible = compatibleGroups.includes(source.bloodGroup);

    let rank: MatchScoreResult['compatibilityRank'] = 'INCOMPATIBLE';
    let notes = '';

    const isAvailableStatus = source.availabilityStatus === 'Available';
    const isOutTown = source.availabilityStatus === 'Out of Town';
    const isUnavailable = source.availabilityStatus === 'Unavailable';
    const isResting = source.availabilityStatus === 'Resting';

    if (!source.isEligible || isResting) {
      rank = 'INCOMPATIBLE';
      notes = `Donor currently deferred: ${source.eligibilityNotes || 'Mandatory recovery interval active'}`;
    } else if (isOutTown) {
      rank = isExact ? 'EXACT' : isCompatible ? 'COMPATIBLE' : 'INCOMPATIBLE';
      notes = `Donor is Out of Town (expected back ${source.outOfTownUntil || 'shortly'}). ${source.availabilityNotes || ''}`;
    } else if (isUnavailable) {
      rank = isExact ? 'EXACT' : isCompatible ? 'COMPATIBLE' : 'INCOMPATIBLE';
      notes = `Donor marked Unavailable: ${source.availabilityNotes || 'Temporarily off-duty'}`;
    } else if (isExact) {
      rank = 'EXACT';
      notes = `Exact blood group volunteer donor (${source.bloodGroup}). Real-time status: Available (Reliability ${source.reliabilityRatePct}%).`;
    } else if (isCompatible) {
      rank = 'COMPATIBLE';
      notes = `Compatible blood group donor (${source.bloodGroup}). Real-time status: Available. Phlebotomy + rapid crossmatch required.`;
    } else {
      rank = 'INCOMPATIBLE';
      notes = `Blood group ${source.bloodGroup} not compatible for ${recipientGroup} ${component}`;
    }

    const transitMins = Math.round(source.distanceKm * 2.0);
    const totalLeadTime = source.mobilizationLeadTimeMinutes + transitMins;

    const rankPenalty = rank === 'EXACT' ? 15 : rank === 'COMPATIBLE' ? 45 : 999;
    const distancePenalty = source.distanceKm * 1.5;
    const timePenalty = totalLeadTime * 1.0;
    const availabilityPenalty = isAvailableStatus ? 0 : 400; // Deprioritize unavailable/out-of-town donors
    const reliabilityBonus = (100 - source.reliabilityRatePct) * 0.5;

    const compositeScore = rankPenalty + distancePenalty + timePenalty + availabilityPenalty + reliabilityBonus;

    return {
      source,
      compatibilityRank: rank,
      compatibleGroups,
      availableUnits: source.isEligible && isAvailableStatus && rank !== 'INCOMPATIBLE' ? 1 : 0, // individual donor donates 1 unit
      leadTimeMinutes: totalLeadTime,
      distanceKm: source.distanceKm,
      compositeScore: Math.round(compositeScore),
      canFulfillImmediately: isAvailableStatus && source.isEligible && rank !== 'INCOMPATIBLE',
      notes,
    };
  }

  // Fallback
  return {
    source,
    compatibilityRank: 'INCOMPATIBLE',
    compatibleGroups: [],
    availableUnits: 0,
    leadTimeMinutes: 999,
    distanceKm: 999,
    compositeScore: 999,
    canFulfillImmediately: false,
    notes: 'Unknown source category',
  };
}

/**
 * Filter and rank all blood sources for an emergency request
 */
export function rankSourcesForEmergency(
  sources: BloodSource[],
  recipientGroup: BloodGroup,
  component: BloodComponent,
  unitsNeeded: number
): MatchScoreResult[] {
  const evaluated = sources.map((source) =>
    evaluateBloodSourceMatch(source, recipientGroup, component, unitsNeeded)
  );

  // Filter out completely incompatible ones unless no candidates exist
  const candidates = evaluated.filter((e) => e.compatibilityRank !== 'INCOMPATIBLE');

  // Sort by composite score (lowest first), prioritizing exact matches and immediate fulfillment
  candidates.sort((a, b) => {
    if (a.canFulfillImmediately && !b.canFulfillImmediately) return -1;
    if (!a.canFulfillImmediately && b.canFulfillImmediately) return 1;
    return a.compositeScore - b.compositeScore;
  });

  return candidates;
}

/**
 * Automated Search & Notification Engine:
 * Searches for and generates alerts for:
 * 1. Nearby compatible blood banks (hospitals with available tested stock)
 * 2. Compatible, available registered donors (real-time availability = 'Available')
 */
export function generateAutomatedEmergencyNotifications(
  sources: BloodSource[],
  requestingHospitalId: string,
  requestingHospitalName: string,
  patientBloodGroup: BloodGroup,
  component: BloodComponent,
  unitsRequested: number,
  urgency: string,
  patientName: string
): {
  notifications: import('../types/blood').DispatchedNotification[];
  notifiedCount: number;
} {
  const compatibleGroups = getCompatibleDonorGroups(patientBloodGroup, component);
  const now = new Date().toISOString();
  const notifications: import('../types/blood').DispatchedNotification[] = [];

  // 1. Search and notify nearby compatible blood banks (hospitals)
  const hospitalSources = sources.filter(isHospitalSource);
  hospitalSources.forEach((hosp) => {
    // Count available matching units in this hospital
    const exactUnits = hosp.inventoryUnits.filter(
      (u) =>
        u.bloodGroup === patientBloodGroup &&
        u.component === component &&
        u.status === 'available' &&
        u.testedClear &&
        !u.temperatureAlert
    ).length;

    const compatibleUnits = hosp.inventoryUnits.filter(
      (u) =>
        compatibleGroups.includes(u.bloodGroup) &&
        u.component === component &&
        u.status === 'available' &&
        u.testedClear &&
        !u.temperatureAlert
    ).length;

    const totalStock = exactUnits > 0 ? exactUnits : compatibleUnits;

    if (totalStock > 0) {
      const isExact = exactUnits > 0;
      const eta = hosp.leadTimeMinutes + Math.round(hosp.distanceKm * 1.5);
      const isLocalHost = hosp.id === requestingHospitalId;

      notifications.push({
        id: `NOTIF-AUTO-HOSP-${hosp.id}-${Date.now().toString(36).toUpperCase()}`,
        recipientType: 'hospital',
        recipientId: hosp.id,
        recipientName: `${hosp.name} (${hosp.facilityType})`,
        contactInfo: hosp.emergencyDirectLine,
        channel: isLocalHost ? 'DIRECT_SYSTEM_DISPATCH' : 'DIRECT_SYSTEM_DISPATCH',
        status: isLocalHost ? 'CONFIRMED' : 'ACKNOWLEDGED',
        timestamp: now,
        message: `${urgency} ALERT: ${unitsRequested}u of ${patientBloodGroup} ${component} needed at ${requestingHospitalName} for patient ${patientName}. Automatic cross-depot reservation query dispatched.`,
        etaMinutes: eta,
        distanceKm: hosp.distanceKm,
        unitsAvailableOrPledged: Math.min(unitsRequested, totalStock),
        isExactMatch: isExact,
        responseNote: isLocalHost
          ? `Local depot vault confirmed reservation of ${Math.min(unitsRequested, totalStock)} units.`
          : `Depot acknowledged alert. ${totalStock} compatible units flagged in cold vault.`,
      });
    }
  });

  // 2. Search and notify compatible, available registered donors
  const donorSources = sources.filter(isDonorSource);
  donorSources.forEach((donor) => {
    const isExact = donor.bloodGroup === patientBloodGroup;
    const isCompatible = compatibleGroups.includes(donor.bloodGroup);

    // Only notify if donor is compatible, eligible, AND has real-time availability === 'Available'
    if ((isExact || isCompatible) && donor.isEligible && donor.availabilityStatus === 'Available') {
      const eta = donor.mobilizationLeadTimeMinutes + Math.round(donor.distanceKm * 2.0);

      notifications.push({
        id: `NOTIF-AUTO-DONOR-${donor.id}-${Date.now().toString(36).toUpperCase()}`,
        recipientType: 'donor',
        recipientId: donor.id,
        recipientName: `${donor.name} (${donor.bloodGroup} ${donor.donorType})`,
        contactInfo: donor.phone,
        channel: 'SMS_EMERGENCY_BROADCAST',
        status: 'SENT',
        timestamp: now,
        message: `EMERGENCY STAT: Urgent request for ${patientBloodGroup} blood at ${requestingHospitalName}. As a registered available donor, please reply YES to mobilize for emergency phlebotomy.`,
        etaMinutes: eta,
        distanceKm: donor.distanceKm,
        unitsAvailableOrPledged: 1,
        isExactMatch: isExact,
        responseNote: `Automated SMS beacon broadcast to mobile terminal. Status: Available (ETA ~${eta}m).`,
      });
    }
  });

  // Sort notifications: hospitals first (cold storage is faster), then nearest donors
  notifications.sort((a, b) => {
    if (a.recipientType === 'hospital' && b.recipientType !== 'hospital') return -1;
    if (a.recipientType !== 'hospital' && b.recipientType === 'hospital') return 1;
    return a.etaMinutes - b.etaMinutes;
  });

  return {
    notifications,
    notifiedCount: notifications.length,
  };
}
