/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MongoClient, Db, Collection } from 'mongodb';
import {
  HospitalStaffUser,
  StoredDonationRecord,
  getDatabase,
  saveDatabase,
} from './storage';

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;
let connectionError: string | null = null;
let activeUri: string | null = null;

const DEFAULT_DB_NAME = 'hemasync_db';

export interface MongoStatus {
  connected: boolean;
  configured: boolean;
  dbName: string;
  driver: string;
  sanitizedUri: string | null;
  collections: {
    donations: number;
    staffUsers: number;
    sessions: number;
  };
  error?: string | null;
  mode: 'mongodb_cluster' | 'file_backed_mirror';
}

/**
 * Redacts credentials from MongoDB URI for safe logging & display
 */
export function sanitizeMongoUri(uri: string): string {
  try {
    return uri.replace(/\/\/(.*?)@/, '//*****:*****@');
  } catch {
    return 'mongodb://*****';
  }
}

/**
 * Initialize connection to MongoDB with graceful fallback
 */
export async function initMongoDB(): Promise<boolean> {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    isConnected = false;
    connectionError = 'MONGODB_URI environment variable is not defined in .env. Falling back to local persistent store.';
    console.log('[MongoDB] Notice: MONGODB_URI not defined. Running in file-backed database mode with MongoDB schema parity.');
    return false;
  }

  activeUri = uri;

  try {
    console.log(`[MongoDB] Connecting to MongoDB instance at: ${sanitizeMongoUri(uri)}...`);
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    });

    await client.connect();
    db = client.db(process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME);
    await db.command({ ping: 1 });

    isConnected = true;
    connectionError = null;
    console.log(`[MongoDB] Successfully connected to database: "${db.databaseName}"`);

    // Ensure collections and indexes exist
    await setupCollectionsAndIndexes(db);

    // Initial sync / seed from baseline if collections are empty
    await seedMongoIfEmpty(db);

    return true;
  } catch (err: any) {
    isConnected = false;
    connectionError = err.message || 'Failed to connect to MongoDB server';
    console.warn(`[MongoDB] Connection attempt failed: ${connectionError}. Using local persistent storage mode.`);
    return false;
  }
}

async function setupCollectionsAndIndexes(database: Db): Promise<void> {
  try {
    const donationsCol = database.collection('donations');
    await donationsCol.createIndex({ donationId: 1 }, { unique: true });
    await donationsCol.createIndex({ bagId: 1 });
    await donationsCol.createIndex({ facilityId: 1 });
    await donationsCol.createIndex({ donorId: 1 });

    const staffCol = database.collection('staff_users');
    await staffCol.createIndex({ email: 1 }, { unique: true });
    await staffCol.createIndex({ id: 1 }, { unique: true });

    const sessionsCol = database.collection('sessions');
    await sessionsCol.createIndex({ token: 1 }, { unique: true });
  } catch (idxErr) {
    console.warn('[MongoDB] Index creation notice:', idxErr);
  }
}

async function seedMongoIfEmpty(database: Db): Promise<void> {
  try {
    const localDb = getDatabase();

    const donationsCol = database.collection<StoredDonationRecord>('donations');
    const donationCount = await donationsCol.countDocuments();
    if (donationCount === 0 && localDb.donationRecords.length > 0) {
      await donationsCol.insertMany(localDb.donationRecords);
      console.log(`[MongoDB] Seeded ${localDb.donationRecords.length} initial donation records into "donations" collection.`);
    }

    const staffCol = database.collection<HospitalStaffUser>('staff_users');
    const staffCount = await staffCol.countDocuments();
    if (staffCount === 0 && localDb.staffUsers.length > 0) {
      await staffCol.insertMany(localDb.staffUsers);
      console.log(`[MongoDB] Seeded ${localDb.staffUsers.length} staff personnel records into "staff_users" collection.`);
    }
  } catch (seedErr) {
    console.warn('[MongoDB] Seeding notice:', seedErr);
  }
}

/**
 * Returns current MongoDB connection status and metrics
 */
export async function getMongoStatus(): Promise<MongoStatus> {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (isConnected && db) {
    try {
      const donationsCount = await db.collection('donations').countDocuments();
      const staffCount = await db.collection('staff_users').countDocuments();
      const sessionsCount = await db.collection('sessions').countDocuments();

      return {
        connected: true,
        configured: Boolean(uri),
        dbName: db.databaseName,
        driver: 'Official MongoDB Node.js Driver v7',
        sanitizedUri: uri ? sanitizeMongoUri(uri) : null,
        collections: {
          donations: donationsCount,
          staffUsers: staffCount,
          sessions: sessionsCount,
        },
        error: null,
        mode: 'mongodb_cluster',
      };
    } catch (e: any) {
      // If ping fails midway
      isConnected = false;
      connectionError = e.message;
    }
  }

  // Fallback metrics
  const localDb = getDatabase();
  return {
    connected: false,
    configured: Boolean(uri),
    dbName: DEFAULT_DB_NAME,
    driver: 'Official MongoDB Node.js Driver v7 (Standby)',
    sanitizedUri: uri ? sanitizeMongoUri(uri) : null,
    collections: {
      donations: localDb.donationRecords.length,
      staffUsers: localDb.staffUsers.length,
      sessions: Object.keys(localDb.activeSessions).length,
    },
    error: connectionError,
    mode: 'file_backed_mirror',
  };
}

// ==========================================
// UNIFIED DATA ACCESS METHODS (Dual-Mode)
// ==========================================

export async function mongoFindStaffByEmail(email: string): Promise<HospitalStaffUser | null> {
  if (isConnected && db) {
    try {
      const user = await db.collection<HospitalStaffUser>('staff_users').findOne({
        email: email.toLowerCase(),
      });
      if (user) return user;
    } catch (err) {
      console.warn('[MongoDB] Find staff error, falling back:', err);
    }
  }
  const local = getDatabase();
  return (
    local.staffUsers.find((u) => u.email.toLowerCase() === email.toLowerCase() || u.id.toLowerCase() === email.toLowerCase()) ||
    null
  );
}

export async function mongoFindStaffById(id: string): Promise<HospitalStaffUser | null> {
  if (isConnected && db) {
    try {
      const user = await db.collection<HospitalStaffUser>('staff_users').findOne({ id });
      if (user) return user;
    } catch (err) {
      console.warn('[MongoDB] Find staff by ID error, falling back:', err);
    }
  }
  const local = getDatabase();
  return local.staffUsers.find((u) => u.id === id) || null;
}

export async function mongoInsertStaff(user: HospitalStaffUser): Promise<void> {
  // Always update local mirror
  const local = getDatabase();
  local.staffUsers.push(user);
  saveDatabase(local);

  if (isConnected && db) {
    try {
      await db.collection('staff_users').insertOne(user as any);
      console.log(`[MongoDB] Inserted staff user "${user.name}" (${user.id})`);
    } catch (err) {
      console.warn('[MongoDB] Insert staff error:', err);
    }
  }
}

export async function mongoCreateSession(token: string, staffId: string): Promise<void> {
  const local = getDatabase();
  local.activeSessions[token] = staffId;
  saveDatabase(local);

  if (isConnected && db) {
    try {
      await db.collection('sessions').insertOne({
        token,
        staffId,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[MongoDB] Create session error:', err);
    }
  }
}

export async function mongoGetSessionStaffId(token: string): Promise<string | null> {
  if (isConnected && db) {
    try {
      const session = await db.collection('sessions').findOne({ token });
      if (session) return session.staffId;
    } catch (err) {
      console.warn('[MongoDB] Get session error:', err);
    }
  }
  const local = getDatabase();
  return local.activeSessions[token] || null;
}

export async function mongoDeleteSession(token: string): Promise<void> {
  const local = getDatabase();
  delete local.activeSessions[token];
  saveDatabase(local);

  if (isConnected && db) {
    try {
      await db.collection('sessions').deleteOne({ token });
    } catch (err) {
      console.warn('[MongoDB] Delete session error:', err);
    }
  }
}

export async function mongoListStaffUsers(): Promise<HospitalStaffUser[]> {
  if (isConnected && db) {
    try {
      const list = await db.collection<HospitalStaffUser>('staff_users').find({}).toArray();
      if (list && list.length > 0) return list;
    } catch (err) {
      console.warn('[MongoDB] List staff error:', err);
    }
  }
  return getDatabase().staffUsers;
}

export async function mongoFindDonations(filter?: {
  facilityId?: string;
  donorId?: string;
  bloodGroup?: string;
}): Promise<StoredDonationRecord[]> {
  if (isConnected && db) {
    try {
      const query: any = {};
      if (filter?.facilityId) query.facilityId = filter.facilityId;
      if (filter?.donorId) query.donorId = filter.donorId;
      if (filter?.bloodGroup) query.donorBloodGroup = filter.bloodGroup;

      const results = await db
        .collection<StoredDonationRecord>('donations')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      if (results && results.length > 0) return results;
    } catch (err) {
      console.warn('[MongoDB] Find donations error:', err);
    }
  }

  // Local fallback
  const local = getDatabase();
  let donations = local.donationRecords;
  if (filter?.facilityId) {
    donations = donations.filter((d) => d.facilityId === filter.facilityId);
  }
  if (filter?.donorId) {
    donations = donations.filter((d) => d.donorId === filter.donorId);
  }
  if (filter?.bloodGroup) {
    donations = donations.filter((d) => d.donorBloodGroup === filter.bloodGroup);
  }
  return [...donations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function mongoInsertDonation(donation: StoredDonationRecord): Promise<void> {
  // Always update local mirror
  const local = getDatabase();
  local.donationRecords.unshift(donation);
  saveDatabase(local);

  if (isConnected && db) {
    try {
      await db.collection('donations').insertOne(donation as any);
      console.log(`[MongoDB] Inserted donation record "${donation.donationId}" into collection "donations"`);
    } catch (err) {
      console.warn('[MongoDB] Insert donation error:', err);
    }
  }
}

export async function mongoUpdateDonationStatus(
  id: string,
  status: StoredDonationRecord['status']
): Promise<StoredDonationRecord | null> {
  const local = getDatabase();
  const record = local.donationRecords.find(
    (d) => d.donationId === id || String(d.bagId) === id || d.bagBarcode === id
  );

  if (record) {
    record.status = status;
    saveDatabase(local);
  }

  if (isConnected && db) {
    try {
      await db.collection('donations').updateOne(
        { $or: [{ donationId: id }, { bagId: Number(id) || -1 }, { bagBarcode: id }] },
        { $set: { status, updatedAt: new Date().toISOString() } }
      );
    } catch (err) {
      console.warn('[MongoDB] Update donation error:', err);
    }
  }

  return record || null;
}
