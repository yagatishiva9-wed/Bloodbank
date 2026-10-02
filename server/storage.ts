/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface HospitalStaffUser {
  id: string;
  name: string;
  email: string;
  role: 'Inventory Manager' | 'Blood Bank Supervisor' | 'Trauma Operations Lead' | 'Phlebotomy Specialist';
  hospitalId: string;
  hospitalName: string;
  licenseNo: string;
  passwordHash: string;
  token?: string;
  createdAt: string;
}

export interface StoredDonationRecord {
  donationId: string;
  bagId: number;
  bagBarcode: string;
  donorId: string;
  donorName: string;
  donorBloodGroup: string;
  donorWeightKg?: number;
  donorHemoglobinGdl?: number;
  component: string;
  volumeMl: number;
  facilityId: string;
  facilityName: string;
  storageLocation: string;
  collectionDate: string;
  expirationDate: string;
  testedClear: boolean;
  temperatureAlert: boolean;
  phlebotomistStaffId: string;
  phlebotomistStaffName: string;
  notes?: string;
  status: 'available' | 'reserved' | 'in_transit' | 'transfused' | 'quarantined';
  createdAt: string;
}

export interface BackendDatabaseSchema {
  staffUsers: HospitalStaffUser[];
  donationRecords: StoredDonationRecord[];
  activeSessions: Record<string, string>; // token -> staffId
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DB_DIR, 'db.json');

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function generateToken(): string {
  return 'HS-AUTH-' + crypto.randomBytes(24).toString('hex');
}

// Initial seed staff users
const INITIAL_STAFF: HospitalStaffUser[] = [
  {
    id: 'STAFF-001',
    name: 'Dr. Sarah Sterling',
    email: 'sarah.sterling@hemasync.org',
    role: 'Inventory Manager',
    hospitalId: 'HOSP-METRO-01',
    hospitalName: 'Metropolitan Trauma Institute & Blood Bank',
    licenseNo: 'AABB-MD-9042',
    passwordHash: hashPassword('admin123'),
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'STAFF-002',
    name: 'Marcus Vance, RN',
    email: 'marcus.vance@hemasync.org',
    role: 'Blood Bank Supervisor',
    hospitalId: 'HOSP-METRO-01',
    hospitalName: 'Metropolitan Trauma Institute & Blood Bank',
    licenseNo: 'RN-BB-4421',
    passwordHash: hashPassword('admin123'),
    createdAt: '2026-09-05T09:30:00Z',
  },
  {
    id: 'STAFF-003',
    name: 'Elena Rostova, CLS',
    email: 'elena.rostova@stjude.org',
    role: 'Phlebotomy Specialist',
    hospitalId: 'HOSP-STJUDE-02',
    hospitalName: 'St. Jude University Medical Center',
    licenseNo: 'CLS-8819',
    passwordHash: hashPassword('admin123'),
    createdAt: '2026-09-10T11:00:00Z',
  },
];

// Initial seed donation records
const INITIAL_DONATIONS: StoredDonationRecord[] = [
  {
    donationId: 'DONATION-2026-9001',
    bagId: 1001,
    bagBarcode: 'ISBT128-BON-1001',
    donorId: 'DONOR-001',
    donorName: 'Marcus Chen',
    donorBloodGroup: 'O-',
    donorWeightKg: 78,
    donorHemoglobinGdl: 15.4,
    component: 'Packed Red Blood Cells (PRBC)',
    volumeMl: 450,
    facilityId: 'HOSP-METRO-01',
    facilityName: 'Metropolitan Trauma Institute & Blood Bank',
    storageLocation: 'Cold Storage Vault Bay A (3.6°C)',
    collectionDate: '2026-09-25T02:00:00Z',
    expirationDate: '2026-10-28T02:00:00Z',
    testedClear: true,
    temperatureAlert: false,
    phlebotomistStaffId: 'STAFF-002',
    phlebotomistStaffName: 'Marcus Vance, RN',
    notes: 'Universal O- donor rapid intake. All serological screens negative.',
    status: 'available',
    createdAt: '2026-09-25T02:30:00Z',
  },
  {
    donationId: 'DONATION-2026-9002',
    bagId: 1002,
    bagBarcode: 'ISBT128-BON-1002',
    donorId: 'DONOR-001',
    donorName: 'Marcus Chen',
    donorBloodGroup: 'O-',
    donorWeightKg: 78,
    donorHemoglobinGdl: 15.4,
    component: 'Packed Red Blood Cells (PRBC)',
    volumeMl: 450,
    facilityId: 'HOSP-METRO-01',
    facilityName: 'Metropolitan Trauma Institute & Blood Bank',
    storageLocation: 'Cold Storage Vault Bay A (3.6°C)',
    collectionDate: '2026-09-25T02:00:00Z',
    expirationDate: '2026-10-19T02:00:00Z',
    testedClear: true,
    temperatureAlert: false,
    phlebotomistStaffId: 'STAFF-002',
    phlebotomistStaffName: 'Marcus Vance, RN',
    notes: 'Secondary unit harvested under double red cell apheresis protocol.',
    status: 'available',
    createdAt: '2026-09-25T02:45:00Z',
  },
  {
    donationId: 'DONATION-2026-9003',
    bagId: 1009,
    bagBarcode: 'ISBT128-BAP-1009',
    donorId: 'DONOR-002',
    donorName: 'Elena Rostova',
    donorBloodGroup: 'A+',
    donorWeightKg: 62,
    donorHemoglobinGdl: 13.8,
    component: 'Packed Red Blood Cells (PRBC)',
    volumeMl: 450,
    facilityId: 'HOSP-METRO-01',
    facilityName: 'Metropolitan Trauma Institute & Blood Bank',
    storageLocation: 'Cold Storage Vault Bay A (3.6°C)',
    collectionDate: '2026-09-26T10:15:00Z',
    expirationDate: '2026-10-30T10:15:00Z',
    testedClear: true,
    temperatureAlert: false,
    phlebotomistStaffId: 'STAFF-001',
    phlebotomistStaffName: 'Dr. Sarah Sterling',
    notes: 'Routine volunteer whole blood intake. NAT and HIV 1/2 non-reactive.',
    status: 'available',
    createdAt: '2026-09-26T10:45:00Z',
  },
];

export function getDatabase(): BackendDatabaseSchema {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initialDb: BackendDatabaseSchema = {
        staffUsers: INITIAL_STAFF,
        donationRecords: INITIAL_DONATIONS,
        activeSessions: {},
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file:', err);
    return {
      staffUsers: INITIAL_STAFF,
      donationRecords: INITIAL_DONATIONS,
      activeSessions: {},
    };
  }
}

export function saveDatabase(db: BackendDatabaseSchema): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}
