/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import {
  generateToken,
  getDatabase,
  hashPassword,
  saveDatabase,
  StoredDonationRecord,
  HospitalStaffUser,
} from './server/storage';
import {
  initMongoDB,
  getMongoStatus,
  mongoFindStaffByEmail,
  mongoFindStaffById,
  mongoInsertStaff,
  mongoCreateSession,
  mongoGetSessionStaffId,
  mongoDeleteSession,
  mongoListStaffUsers,
  mongoFindDonations,
  mongoInsertDonation,
  mongoUpdateDonationStatus,
} from './server/mongodb';
import {
  createVerificationChallenge,
  verifyOtpSubmission,
  resendChallengeOtp,
  getLatestEmailDispatch,
} from './server/verification';

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Connect to MongoDB on server launch
  await initMongoDB();

  // Helper auth middleware
  const authenticateStaff = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1];
    const staffId = await mongoGetSessionStaffId(token);
    if (!staffId) {
      return res.status(401).json({ error: 'Session expired or invalid token' });
    }
    const staff = await mongoFindStaffById(staffId);
    if (!staff) {
      return res.status(401).json({ error: 'Staff user not found' });
    }
    (req as any).staff = staff;
    next();
  };

  // ==========================================
  // MongoDB Diagnostics & Status Endpoints
  // ==========================================

  app.get('/api/mongodb/status', async (_req: Request, res: Response) => {
    try {
      const status = await getMongoStatus();
      return res.json(status);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to inspect MongoDB status', details: err.message });
    }
  });

  // ==========================================
  // Auth API Endpoints (Stored in MongoDB)
  // ==========================================

  // 1. Staff Login (With 2FA Email OTP Verification & Confirmation)
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password, otp, confirmationToken, bypassOtp } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email address is required' });
      }

      // If user provided OTP or confirmation token directly in login request
      if (otp || confirmationToken) {
        const verifyResult = verifyOtpSubmission({ email, otp, confirmationToken });
        if (!verifyResult.success || !verifyResult.challenge) {
          return res.status(401).json({ error: verifyResult.error || 'Invalid or expired verification code' });
        }

        const user = await mongoFindStaffByEmail(email);
        if (!user) {
          return res.status(404).json({ error: 'Staff account not found' });
        }

        const token = generateToken();
        await mongoCreateSession(token, user.id);
        const { passwordHash: _, ...safeUser } = user;
        return res.json({
          user: safeUser,
          token,
          message: `Two-Factor verification confirmed! Welcome back, ${user.name}`,
        });
      }

      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }

      const user = await mongoFindStaffByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials. User not found in staff registry.' });
      }

      const hash = hashPassword(password);
      if (user.passwordHash !== hash) {
        return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
      }

      // If bypassOtp is explicitly passed (e.g. quick 1-click test mode)
      if (bypassOtp) {
        const token = generateToken();
        await mongoCreateSession(token, user.id);
        const { passwordHash: _, ...safeUser } = user;
        return res.json({
          user: safeUser,
          token,
          message: `Welcome back, ${user.name}`,
        });
      }

      // Generate 2FA Email Verification Challenge
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '198.51.100.42';
      const userAgent = req.headers['user-agent'] || 'Hospital Station Chrome';
      const { challenge, emailDispatch } = createVerificationChallenge({
        email: user.email,
        purpose: 'login',
        userId: user.id,
        ipAddress,
        userAgent,
      });

      return res.json({
        requiresOtp: true,
        verificationId: challenge.verificationId,
        email: user.email,
        purpose: 'login',
        expiresIn: 600,
        message: `Security OTP code has been dispatched to ${user.email}. Enter the 6-digit code or accept confirmation to finish logging in.`,
        dispatchedEmail: emailDispatch,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error during login' });
    }
  });

  // 2. Staff Registration (With Email Verification Challenge)
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { name, email, password, role, hospitalId, hospitalName, licenseNo, otp, confirmationToken, verificationId } = req.body;
      if (!name || !email || !password || !hospitalId) {
        return res.status(400).json({ error: 'Name, email, password, and hospital facility are required' });
      }

      // If OTP or confirmationToken is provided to complete registration
      if (otp || confirmationToken) {
        const verifyResult = verifyOtpSubmission({ verificationId, email, otp, confirmationToken });
        if (!verifyResult.success || !verifyResult.challenge) {
          return res.status(401).json({ error: verifyResult.error || 'Invalid or expired email confirmation code' });
        }

        const staffList = await mongoListStaffUsers();
        const newId = `STAFF-${String(staffList.length + 1).padStart(3, '0')}`;
        const newUser: HospitalStaffUser = {
          id: newId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: role || 'Inventory Manager',
          hospitalId,
          hospitalName: hospitalName || 'Regional Blood Center',
          licenseNo: licenseNo || `MED-${Math.floor(10000 + Math.random() * 90000)}`,
          passwordHash: hashPassword(password),
          createdAt: new Date().toISOString(),
        };

        await mongoInsertStaff(newUser);
        const token = generateToken();
        await mongoCreateSession(token, newId);

        const { passwordHash: _, ...safeUser } = newUser;
        return res.status(201).json({
          user: safeUser,
          token,
          message: 'Email verified and staff account successfully created in MongoDB',
        });
      }

      const existing = await mongoFindStaffByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'A staff member with this email is already registered' });
      }

      // Initiate Email Verification Challenge
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '198.51.100.42';
      const userAgent = req.headers['user-agent'] || 'Hospital Station Chrome';
      const { challenge, emailDispatch } = createVerificationChallenge({
        email,
        purpose: 'register',
        tempPayload: { name, email, password, role, hospitalId, hospitalName, licenseNo },
        ipAddress,
        userAgent,
      });

      return res.status(200).json({
        requiresOtp: true,
        verificationId: challenge.verificationId,
        email: email.trim().toLowerCase(),
        purpose: 'register',
        expiresIn: 600,
        message: `Verification code sent to ${email}. Please enter the 6-digit OTP code or confirm to activate account.`,
        dispatchedEmail: emailDispatch,
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Internal server error during registration' });
    }
  });

  // 3. Verify OTP / Confirmation Link Endpoint
  app.post('/api/auth/verify-otp', async (req: Request, res: Response) => {
    try {
      const { verificationId, email, otp, confirmationToken, confirmationAccepted } = req.body;
      const verifyResult = verifyOtpSubmission({
        verificationId,
        email,
        otp,
        confirmationToken,
        confirmationAccepted,
      });

      if (!verifyResult.success || !verifyResult.challenge) {
        return res.status(400).json({ error: verifyResult.error || 'Verification failed' });
      }

      const challenge = verifyResult.challenge;

      if (challenge.purpose === 'login') {
        const user = challenge.userId
          ? await mongoFindStaffById(challenge.userId)
          : await mongoFindStaffByEmail(challenge.email);

        if (!user) {
          return res.status(404).json({ error: 'Associated staff account not found' });
        }

        const token = generateToken();
        await mongoCreateSession(token, user.id);
        const { passwordHash: _, ...safeUser } = user;
        return res.json({
          user: safeUser,
          token,
          message: `Security confirmation verified! Welcome back, ${user.name}`,
        });
      }

      if (challenge.purpose === 'register') {
        const payload = challenge.tempPayload;
        if (!payload) {
          return res.status(400).json({ error: 'Registration payload expired' });
        }

        const staffList = await mongoListStaffUsers();
        const newId = `STAFF-${String(staffList.length + 1).padStart(3, '0')}`;
        const newUser: HospitalStaffUser = {
          id: newId,
          name: payload.name.trim(),
          email: payload.email.trim().toLowerCase(),
          role: payload.role || 'Inventory Manager',
          hospitalId: payload.hospitalId,
          hospitalName: payload.hospitalName || 'Regional Blood Center',
          licenseNo: payload.licenseNo || `MED-${Math.floor(10000 + Math.random() * 90000)}`,
          passwordHash: hashPassword(payload.password),
          createdAt: new Date().toISOString(),
        };

        await mongoInsertStaff(newUser);
        const token = generateToken();
        await mongoCreateSession(token, newId);

        const { passwordHash: _, ...safeUser } = newUser;
        return res.status(201).json({
          user: safeUser,
          token,
          message: 'Email confirmed! Staff account registered in MongoDB.',
        });
      }

      return res.status(400).json({ error: 'Unknown challenge purpose' });
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      return res.status(500).json({ error: 'Internal server error during verification' });
    }
  });

  // 4. Resend OTP
  app.post('/api/auth/resend-otp', (req: Request, res: Response) => {
    try {
      const { verificationId } = req.body;
      if (!verificationId) {
        return res.status(400).json({ error: 'verificationId is required' });
      }

      const resendResult = resendChallengeOtp(verificationId);
      if (!resendResult.success) {
        return res.status(400).json({ error: resendResult.error || 'Could not resend OTP' });
      }

      return res.json({
        success: true,
        message: 'A fresh 6-digit security code has been dispatched to your email.',
        dispatchedEmail: resendResult.emailDispatch,
      });
    } catch (err: any) {
      console.error('Resend OTP error:', err);
      return res.status(500).json({ error: 'Internal server error during OTP resend' });
    }
  });

  // 5. Get Latest Dispatched Email Preview
  app.get('/api/auth/latest-email', (req: Request, res: Response) => {
    const toEmail = req.query.email ? String(req.query.email) : undefined;
    const email = getLatestEmailDispatch(toEmail);
    return res.json({ email });
  });

  // 6. Current User verification
  app.get('/api/auth/me', authenticateStaff, (req: Request, res: Response) => {
    const staff = (req as any).staff as HospitalStaffUser;
    const { passwordHash: _, ...safeUser } = staff;
    return res.json({ user: safeUser });
  });

  // 7. Staff Logout
  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      await mongoDeleteSession(token);
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  });

  // 8. Staff Directory
  app.get('/api/auth/staff', async (req: Request, res: Response) => {
    const list = await mongoListStaffUsers();
    const safeList = list.map(({ passwordHash: _, ...u }) => u);
    return res.json({ staff: safeList });
  });

  // ==========================================
  // Donations API Endpoints (Stored in MongoDB)
  // ==========================================

  // 1. Fetch All Stored Donations
  app.get('/api/donations', async (req: Request, res: Response) => {
    try {
      const { facilityId, donorId, bloodGroup } = req.query;
      const donations = await mongoFindDonations({
        facilityId: facilityId ? String(facilityId) : undefined,
        donorId: donorId ? String(donorId) : undefined,
        bloodGroup: bloodGroup ? String(bloodGroup) : undefined,
      });

      return res.json({
        total: donations.length,
        donations,
      });
    } catch (err: any) {
      console.error('Error fetching donations:', err);
      return res.status(500).json({ error: 'Failed to retrieve donation records from MongoDB' });
    }
  });

  // 2. Store New Donation Details at MongoDB
  app.post('/api/donations', async (req: Request, res: Response) => {
    try {
      const {
        donorId,
        donorName,
        donorBloodGroup,
        donorWeightKg,
        donorHemoglobinGdl,
        component,
        volumeMl,
        facilityId,
        facilityName,
        storageLocation,
        collectionDate,
        expirationDate,
        testedClear,
        temperatureAlert,
        phlebotomistStaffId,
        phlebotomistStaffName,
        notes,
      } = req.body;

      if (!donorBloodGroup || !facilityId) {
        return res.status(400).json({ error: 'Blood group and facility are required for donation intake' });
      }

      const existingDonations = await mongoFindDonations();
      const randSeq = 1000 + existingDonations.length + 1;
      const bagId = Number(randSeq);
      const bagBarcode = `ISBT128-B${donorBloodGroup.replace('-', 'N').replace('+', 'P')}-${bagId}`;

      const newRecord: StoredDonationRecord = {
        donationId: `DONATION-2026-${bagId}`,
        bagId,
        bagBarcode,
        donorId: donorId || `DONOR-WALKIN-${Date.now().toString(36).toUpperCase()}`,
        donorName: donorName || 'Verified Volunteer Donor',
        donorBloodGroup,
        donorWeightKg: donorWeightKg ? Number(donorWeightKg) : undefined,
        donorHemoglobinGdl: donorHemoglobinGdl ? Number(donorHemoglobinGdl) : undefined,
        component: component || 'Packed Red Blood Cells (PRBC)',
        volumeMl: Number(volumeMl) || 450,
        facilityId,
        facilityName: facilityName || 'Metropolitan Trauma Institute & Blood Bank',
        storageLocation: storageLocation || 'Cold Storage Vault Bay A (3.6°C)',
        collectionDate: collectionDate || new Date().toISOString(),
        expirationDate: expirationDate || new Date(Date.now() + 35 * 86400000).toISOString(),
        testedClear: testedClear !== undefined ? Boolean(testedClear) : true,
        temperatureAlert: Boolean(temperatureAlert),
        phlebotomistStaffId: phlebotomistStaffId || 'STAFF-AUTH-SYS',
        phlebotomistStaffName: phlebotomistStaffName || 'Attending Phlebotomist',
        notes: notes || 'Intake verified and logged to backend repository',
        status: 'available',
        createdAt: new Date().toISOString(),
      };

      await mongoInsertDonation(newRecord);

      console.log(`[MONGODB] Stored new donation #${newRecord.donationId} (${newRecord.donorBloodGroup}, ${newRecord.volumeMl}ml)`);

      return res.status(201).json({
        success: true,
        message: 'Donation details successfully recorded in MongoDB backend database',
        record: newRecord,
      });
    } catch (err: any) {
      console.error('Error saving donation:', err);
      return res.status(500).json({ error: 'Failed to record donation details to MongoDB backend' });
    }
  });

  // 3. Update Donation/Bag Status in MongoDB
  app.patch('/api/donations/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const updated = await mongoUpdateDonationStatus(id, status);

      if (!updated) {
        return res.status(404).json({ error: 'Donation record not found in backend' });
      }

      return res.json({
        success: true,
        message: `Donation record ${updated.donationId} status updated to ${status}`,
        record: updated,
      });
    } catch (err: any) {
      console.error('Error updating donation status:', err);
      return res.status(500).json({ error: 'Failed to update donation status in MongoDB' });
    }
  });

  // ==========================================
  // Vite Integration (Dev Mode) / Static (Prod)
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`HemaSync Server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
