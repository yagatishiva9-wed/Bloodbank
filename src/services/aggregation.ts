/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BloodComponent,
  BloodGroup,
  BloodInventoryUnit,
  DonorBloodSource,
  HospitalBloodSource,
  RegionalStockAggregate,
  StockAggregateByComponent,
  StockAggregateByGroup,
} from '../types/blood';

export const ALL_BLOOD_GROUPS: BloodGroup[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

export const ALL_COMPONENTS: BloodComponent[] = [
  'Packed Red Blood Cells (PRBC)',
  'Fresh Frozen Plasma (FFP)',
  'Platelets (SDP/RDP)',
  'Cryoprecipitate',
  'Whole Blood',
];

// Safety stock thresholds for regional population emergency readiness
export const THRESHOLDS_BY_GROUP: Record<BloodGroup, { critical: number; optimal: number }> = {
  'O-': { critical: 16, optimal: 45 }, // Universal RBC donor, highest emergency consumption
  'O+': { critical: 24, optimal: 65 },
  'A-': { critical: 10, optimal: 25 },
  'A+': { critical: 20, optimal: 55 },
  'B-': { critical: 8, optimal: 20 },
  'B+': { critical: 15, optimal: 40 },
  'AB-': { critical: 5, optimal: 15 },
  'AB+': { critical: 8, optimal: 22 },
};

/**
 * Aggregates all hospital inventory units grouped by Blood Group
 */
export function aggregateStockByBloodGroup(hospitals: HospitalBloodSource[]): StockAggregateByGroup[] {
  const allUnits: BloodInventoryUnit[] = hospitals.flatMap((h) => h.inventoryUnits);

  return ALL_BLOOD_GROUPS.map((group) => {
    const units = allUnits.filter((u) => u.bloodGroup === group);
    const availableUnits = units.filter(
      (u) => u.status === 'available' && u.testedClear && !u.temperatureAlert
    ).length;
    const reservedUnits = units.filter((u) => u.status === 'reserved').length;
    const quarantinedUnits = units.filter(
      (u) => u.status === 'quarantined' || u.temperatureAlert || !u.testedClear
    ).length;
    const totalUnits = units.length;

    const threshold = THRESHOLDS_BY_GROUP[group];
    let status: StockAggregateByGroup['status'] = 'OPTIMAL';
    let deficitUnits = 0;

    if (availableUnits <= threshold.critical) {
      status = 'CRITICAL_DEFICIT';
      deficitUnits = threshold.critical - availableUnits;
    } else if (availableUnits < threshold.optimal) {
      status = 'LOW';
      deficitUnits = threshold.optimal - availableUnits;
    } else if (availableUnits > threshold.optimal * 1.5) {
      status = 'SURPLUS';
    }

    return {
      bloodGroup: group,
      totalUnits,
      availableUnits,
      reservedUnits,
      quarantinedUnits,
      criticalThreshold: threshold.critical,
      optimalThreshold: threshold.optimal,
      status,
      deficitUnits,
    };
  });
}

/**
 * Aggregates stock by Blood Component with shelf-life and expiration metrics
 */
export function aggregateStockByComponent(hospitals: HospitalBloodSource[]): StockAggregateByComponent[] {
  const allUnits: BloodInventoryUnit[] = hospitals.flatMap((h) => h.inventoryUnits);
  const now = new Date('2026-09-30T02:00:00Z').getTime();

  return ALL_COMPONENTS.map((comp) => {
    const units = allUnits.filter((u) => u.component === comp);
    const available = units.filter(
      (u) => u.status === 'available' && u.testedClear && !u.temperatureAlert
    );

    let expiringIn48Hours = 0;
    let expiringIn7Days = 0;

    available.forEach((u) => {
      const expTime = new Date(u.expirationDate).getTime();
      const diffHours = (expTime - now) / (1000 * 60 * 60);
      if (diffHours <= 48 && diffHours > 0) expiringIn48Hours++;
      if (diffHours <= 168 && diffHours > 0) expiringIn7Days++;
    });

    let shelfLifeDays = 42;
    let storageCondition: StockAggregateByComponent['storageCondition'] = 'Refrigerated 2-6°C';

    if (comp === 'Platelets (SDP/RDP)') {
      shelfLifeDays = 5;
      storageCondition = 'Room Temp Agitated 20-24°C';
    } else if (comp === 'Fresh Frozen Plasma (FFP)') {
      shelfLifeDays = 365;
      storageCondition = 'Frozen -18°C';
    } else if (comp === 'Cryoprecipitate') {
      shelfLifeDays = 365;
      storageCondition = 'Frozen -18°C';
    } else if (comp === 'Whole Blood') {
      shelfLifeDays = 35;
      storageCondition = 'Refrigerated 2-6°C';
    }

    return {
      component: comp,
      totalUnits: units.length,
      availableUnits: available.length,
      expiringIn48Hours,
      expiringIn7Days,
      shelfLifeDays,
      storageCondition,
    };
  });
}

/**
 * Aggregates stock and active donor coverage geographically across zones
 */
export function aggregateStockByRegion(
  hospitals: HospitalBloodSource[],
  donors: DonorBloodSource[]
): RegionalStockAggregate[] {
  const zones = Array.from(new Set([...hospitals.map((h) => h.zone), ...donors.map((d) => d.zone)]));

  return zones.map((zone) => {
    const zoneHospitals = hospitals.filter((h) => h.zone === zone);
    const zoneDonors = donors.filter((d) => d.zone === zone && d.isEligible);
    const zoneUnits = zoneHospitals.flatMap((h) => h.inventoryUnits);
    const availableUnits = zoneUnits.filter(
      (u) => u.status === 'available' && u.testedClear && !u.temperatureAlert
    );

    // Identify which blood groups have 0 available in this zone
    const criticalGroups = ALL_BLOOD_GROUPS.filter((bg) => {
      return !availableUnits.some((u) => u.bloodGroup === bg);
    });

    return {
      zone,
      hospitalCount: zoneHospitals.length,
      activeDonorsCount: zoneDonors.length,
      totalUnits: zoneUnits.length,
      availableUnits: availableUnits.length,
      criticalGroups,
    };
  });
}

/**
 * Dynamic Multi-Dimensional Aggregation Query Builder
 */
export interface DynamicAggregateRow {
  groupKey: string;
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
  quarantinedUnits: number;
  expiringSoonUnits: number;
  coldChainHealthPct: number;
  donorPoolCount: number;
}

export type GroupByDimension =
  | 'bloodGroup'
  | 'component'
  | 'facilityType'
  | 'zone'
  | 'coldChainStatus';

export function runDynamicStockQuery(
  hospitals: HospitalBloodSource[],
  donors: DonorBloodSource[],
  groupBy: GroupByDimension,
  filters: {
    bloodGroups?: BloodGroup[];
    components?: BloodComponent[];
    zones?: string[];
  }
): DynamicAggregateRow[] {
  const now = new Date('2026-09-30T02:00:00Z').getTime();

  // Filter hospitals
  const filteredHospitals = hospitals.filter((h) => {
    if (filters.zones && filters.zones.length > 0 && !filters.zones.includes(h.zone)) return false;
    return true;
  });

  const resultMap = new Map<string, DynamicAggregateRow>();

  // Helper to get or init row
  const getRow = (key: string): DynamicAggregateRow => {
    if (!resultMap.has(key)) {
      resultMap.set(key, {
        groupKey: key,
        totalUnits: 0,
        availableUnits: 0,
        reservedUnits: 0,
        quarantinedUnits: 0,
        expiringSoonUnits: 0,
        coldChainHealthPct: 100,
        donorPoolCount: 0,
      });
    }
    return resultMap.get(key)!;
  };

  // Process hospital inventory units
  for (const h of filteredHospitals) {
    for (const u of h.inventoryUnits) {
      if (filters.bloodGroups && filters.bloodGroups.length > 0 && !filters.bloodGroups.includes(u.bloodGroup)) {
        continue;
      }
      if (filters.components && filters.components.length > 0 && !filters.components.includes(u.component)) {
        continue;
      }

      let key = 'Other';
      if (groupBy === 'bloodGroup') key = u.bloodGroup;
      else if (groupBy === 'component') key = u.component;
      else if (groupBy === 'facilityType') key = h.facilityType;
      else if (groupBy === 'zone') key = h.zone;
      else if (groupBy === 'coldChainStatus') key = h.coldChainStatus.toUpperCase();

      const row = getRow(key);
      row.totalUnits++;

      const isAvail = u.status === 'available' && u.testedClear && !u.temperatureAlert;
      if (isAvail) row.availableUnits++;
      if (u.status === 'reserved') row.reservedUnits++;
      if (u.status === 'quarantined' || u.temperatureAlert || !u.testedClear) row.quarantinedUnits++;

      const expTime = new Date(u.expirationDate).getTime();
      if ((expTime - now) / (1000 * 60 * 60) <= 72 && isAvail) {
        row.expiringSoonUnits++;
      }
    }
  }

  // Correlate Donors if grouping by bloodGroup or zone
  if (groupBy === 'bloodGroup') {
    donors.forEach((d) => {
      if (d.isEligible) {
        const row = getRow(d.bloodGroup);
        row.donorPoolCount++;
      }
    });
  } else if (groupBy === 'zone') {
    donors.forEach((d) => {
      if (d.isEligible) {
        const row = getRow(d.zone);
        row.donorPoolCount++;
      }
    });
  }

  return Array.from(resultMap.values()).sort((a, b) => b.totalUnits - a.totalUnits);
}
