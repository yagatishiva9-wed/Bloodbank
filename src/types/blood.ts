/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BloodGroup = 'O-' | 'O+' | 'A-' | 'A+' | 'B-' | 'B+' | 'AB-' | 'AB+';

export type BloodComponent =
  | 'Packed Red Blood Cells (PRBC)'
  | 'Fresh Frozen Plasma (FFP)'
  | 'Platelets (SDP/RDP)'
  | 'Cryoprecipitate'
  | 'Whole Blood';

export type ComponentStorageType = 'Refrigerated 2-6°C' | 'Frozen -18°C' | 'Room Temp Agitated 20-24°C';

export interface BloodInventoryUnit {
  unitId: string;
  bag_id?: number; // ER Entity: # bag_id (INT)
  donor_id?: string | number; // ER Entity: -> donor_id (FK)
  donor_name?: string;
  bagBarcode: string;
  bloodGroup: BloodGroup;
  component: BloodComponent;
  volumeMl: number; // ER Entity: volume_ml (INT)
  collectionDate: string;
  expirationDate: string;
  facilityId: string;
  storageLocation: string; // e.g., "Cryo-Vault B3", "Agitator Platelet Unit 2"
  status: 'available' | 'reserved' | 'quarantined' | 'in_transit' | 'transfused' | 'discarded'; // ER Entity: status (ENUM)
  testedClear: boolean; // Screened for HIV, Hep B/C, Syphilis, Malaria
  temperatureAlert: boolean;
}

// Junction Entity: Dispatch_Ledger (from ER Diagram)
export interface DispatchLedgerRecord {
  dispatch_id: number; // # dispatch_id (INT)
  request_id: number | string; // -> request_id (FK)
  bag_id: number | string; // -> bag_id (FK)
  dispatched_at: string; // dispatched_at (DATETIME)
  hospital_id?: string | number;
  hospital_name?: string;
  donor_id?: string | number;
  donor_name?: string;
  blood_type: BloodGroup;
  volume_ml: number;
  status: 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'TRANSFUSED';
  courier_tracking?: string;
}

// Role modes for interface switching
export type AppRole = 'user' | 'manager';

// ==========================================
// Category (Union Type) Modeling for Blood Sources
// ==========================================

export type BloodSourceCategory = 'hospital' | 'donor';

export interface HospitalBloodSource {
  category: 'hospital';
  id: string;
  name: string;
  facilityType: 'Level 1 Trauma Center' | 'Regional Blood Bank' | 'Tertiary Care Hospital' | 'Community Blood Depot';
  zone: string;
  city: string;
  address: string;
  coordinates: { lat: number; lng: number };
  distanceKm: number;
  phone: string;
  emergencyDirectLine: string;
  operatingHours: string;
  coldChainStatus: 'optimal' | 'warning' | 'fault';
  coldChainTempC: number;
  inventoryUnits: BloodInventoryUnit[];
  reservedUnits: number;
  inTransitUnits: number;
  leadTimeMinutes: number; // preparation & dispatch time from cold storage (usually 10-25 mins)
  accreditationId: string;
  hospital_id?: number; // ER: # hospital_id (INT)
  license_no?: string; // ER: license_no (VARCHAR)
  urgency_tier?: number; // ER: urgency_tier (INT) (1 = STAT, 2 = Urgent, 3 = Priority)
}

export type DonorAvailabilityStatus = 'Available' | 'Unavailable' | 'Out of Town' | 'Resting';

export interface DispatchedNotification {
  id: string;
  recipientType: 'donor' | 'hospital';
  recipientId: string;
  recipientName: string;
  contactInfo: string;
  channel: 'SMS_EMERGENCY_BROADCAST' | 'DIRECT_SYSTEM_DISPATCH' | 'PAGER_ALERT';
  status: 'SENT' | 'DELIVERED' | 'ACKNOWLEDGED' | 'CONFIRMED' | 'DECLINED';
  timestamp: string;
  message: string;
  etaMinutes: number;
  distanceKm: number;
  unitsAvailableOrPledged: number;
  isExactMatch: boolean;
  bloodGroup?: BloodGroup;
  notes?: string;
  responseNote?: string;
}

export interface DonorBloodSource {
  category: 'donor';
  id: string;
  name: string;
  bloodGroup: BloodGroup;
  rhFactor: '+' | '-';
  gender: 'Male' | 'Female' | 'Other';
  age: number;
  weightKg: number;
  hemoglobinGdl: number; // e.g., 14.2 g/dL (min 12.5 required)
  zone: string;
  city: string;
  address: string;
  coordinates: { lat: number; lng: number };
  distanceKm: number;
  phone: string;
  email: string;
  donorType: 'Universal Donor Registry' | 'Regular Volunteer' | 'Rare Antigen Panel' | 'On-Call First Responder';
  status: 'available_immediate' | 'on_call' | 'in_transit' | 'deferred_temporary';
  availabilityStatus: DonorAvailabilityStatus; // Real-time donor availability status
  outOfTownUntil?: string; // If 'Out of Town'
  availabilityNotes?: string;
  lastDonationDate: string;
  daysSinceLastDonation: number;
  isEligible: boolean;
  eligibilityNotes?: string;
  totalDonationCount: number;
  lifetimeDonations?: number;
  reliabilityRatePct: number; // Historical attendance percentage
  mobilizationLeadTimeMinutes: number; // travel + health triage time (e.g. 35-60 mins)
  donor_id?: number; // ER: # donor_id (INT)
}

/**
 * Union type modeling for donors and hospitals as unified "Blood Sources"
 */
export type BloodSource = HospitalBloodSource | DonorBloodSource;

// Type guards for union discrimination
export function isHospitalSource(source: BloodSource): source is HospitalBloodSource {
  return source.category === 'hospital';
}

export function isDonorSource(source: BloodSource): source is DonorBloodSource {
  return source.category === 'donor';
}

// Emergency & Matching Types
export type UrgencyLevel = 'STAT_IMMEDIATE' | 'URGENT_TIER_1' | 'PRIORITY_TIER_2' | 'SCHEDULED';

export interface EmergencyRequest {
  requestId: string;
  patientId: string;
  patientName: string;
  patientBloodGroup: BloodGroup;
  componentNeeded: BloodComponent;
  unitsRequested: number;
  urgency: UrgencyLevel;
  hospitalDestination: string;
  request_id?: number; // ER: # request_id (INT)
  hospital_id?: number; // ER: -> hospital_id (FK)
  units_needed?: number; // ER: units_needed (INT)
  requested_at?: string; // ER: requested_at (DATETIME)
  requestingHospitalId?: string;
  requestingHospitalName?: string;
  destinationZone: string;
  traumaCase: string;
  status: 'PENDING_MATCH' | 'DISPATCHED' | 'EN_ROUTE' | 'DELIVERED' | 'FULFILLED' | 'CANCELLED';
  createdAt: string;
  assignedSources: {
    sourceId: string;
    sourceCategory: BloodSourceCategory;
    sourceName: string;
    unitsAllocated: number;
    dispatchStatus: string;
    etaMinutes: number;
    trackingCode: string;
  }[];
  automatedNotifications?: DispatchedNotification[];
}

export interface MatchScoreResult {
  source: BloodSource;
  compatibilityRank: 'EXACT' | 'COMPATIBLE' | 'CROSSMATCH_REQUIRED' | 'INCOMPATIBLE';
  compatibleGroups: BloodGroup[];
  availableUnits: number;
  leadTimeMinutes: number;
  distanceKm: number;
  compositeScore: number; // lower is faster/better
  canFulfillImmediately: boolean;
  notes: string;
}

// ==========================================
// Aggregation Engine Types
// ==========================================

export interface StockAggregateByGroup {
  bloodGroup: BloodGroup;
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
  quarantinedUnits: number;
  criticalThreshold: number;
  optimalThreshold: number;
  status: 'CRITICAL_DEFICIT' | 'LOW' | 'OPTIMAL' | 'SURPLUS';
  deficitUnits: number;
}

export interface StockAggregateByComponent {
  component: BloodComponent;
  totalUnits: number;
  availableUnits: number;
  expiringIn48Hours: number;
  expiringIn7Days: number;
  shelfLifeDays: number;
  storageCondition: ComponentStorageType;
}

export interface RegionalStockAggregate {
  zone: string;
  hospitalCount: number;
  activeDonorsCount: number;
  totalUnits: number;
  availableUnits: number;
  criticalGroups: BloodGroup[];
}

export interface AggregationQueryFilter {
  bloodGroups: BloodGroup[];
  components: BloodComponent[];
  zones: string[];
  sourceCategory?: 'all' | 'hospital' | 'donor';
  minUnits?: number;
  excludeQuarantined?: boolean;
  maxDistanceKm?: number;
}

// ==========================================
// Recovery & Audit Ledger Types
// ==========================================

export type LedgerActionType =
  | 'INTAKE_UNIT'
  | 'RESERVE_EMERGENCY'
  | 'DISPATCH_UNIT'
  | 'DONOR_MOBILIZE'
  | 'COLD_CHAIN_ALERT'
  | 'QUARANTINE_UNIT'
  | 'RECONCILIATION_RESTORE'
  | 'DISCARD_EXPIRED'
  | 'DISCARD_CONTAMINATED'
  | 'AUDIT_VERIFIED'
  | 'EXPIRATION_PURGE';

export interface AuditLedgerEntry {
  blockIndex: number;
  eventId: string;
  timestamp: string;
  actionType: LedgerActionType;
  actor: string;
  unitId?: string;
  sourceId: string;
  sourceCategory: BloodSourceCategory;
  bloodGroup: BloodGroup;
  component?: BloodComponent;
  unitsImpacted: number;
  details: string;
  previousHash: string;
  currentHash: string;
  isIntegrityVerified: boolean;
}

export interface InventorySnapshot {
  snapshotId: string;
  timestamp: string;
  label: string;
  createdBy: string;
  hospitalsSnapshot: HospitalBloodSource[];
  donorsSnapshot: DonorBloodSource[];
  totalUnitsCount: number;
  hashChecksum: string;
}

export interface DiscrepancyAnomaly {
  anomalyId: string;
  sourceId: string;
  sourceName: string;
  unitId?: string;
  bloodGroup: BloodGroup;
  component: BloodComponent;
  type: 'UNRECORDED_DEPLETION' | 'COLD_CHAIN_EXCURSION' | 'DESYNCED_COUNT' | 'EXPIRED_ON_SHELF';
  severity: 'CRITICAL' | 'WARNING';
  description: string;
  suggestedAction: string;
  detectedAt: string;
}
