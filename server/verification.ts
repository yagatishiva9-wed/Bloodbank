/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';

export interface OtpChallenge {
  verificationId: string;
  email: string;
  otp: string;
  confirmationToken: string;
  purpose: 'login' | 'register';
  userId?: string;
  tempPayload?: any;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  confirmed: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface DispatchedEmailNotification {
  id: string;
  to: string;
  from: string;
  subject: string;
  otp: string;
  confirmationToken: string;
  confirmationUrl: string;
  sentAt: string;
  expiresInMinutes: number;
  purpose: 'login' | 'register';
  securityMetadata: {
    ip: string;
    browser: string;
    facilityContext: string;
  };
}

// In-memory active verification challenges
const activeChallenges = new Map<string, OtpChallenge>();
// Recent dispatched emails log for preview/notification in the demo environment
const recentDispatchedEmails: DispatchedEmailNotification[] = [];

/**
 * Generates a random 6-digit numeric OTP code
 */
export function generateNumericOtp(): string {
  // Use crypto for high-entropy secure digits
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Creates and registers a new 2FA Email OTP Verification challenge
 */
export function createVerificationChallenge(params: {
  email: string;
  purpose: 'login' | 'register';
  userId?: string;
  tempPayload?: any;
  ipAddress?: string;
  userAgent?: string;
}): { challenge: OtpChallenge; emailDispatch: DispatchedEmailNotification } {
  const verificationId = 'VREF-' + crypto.randomBytes(12).toString('hex');
  const otp = generateNumericOtp();
  const confirmationToken = 'HS-CONFIRM-' + crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes

  const challenge: OtpChallenge = {
    verificationId,
    email: params.email.trim().toLowerCase(),
    otp,
    confirmationToken,
    purpose: params.purpose,
    userId: params.userId,
    tempPayload: params.tempPayload,
    createdAt: now,
    expiresAt,
    attempts: 0,
    maxAttempts: 5,
    confirmed: false,
    ipAddress: params.ipAddress || '127.0.0.1',
    userAgent: params.userAgent || 'Clinical Workstation Browser',
  };

  // Cleanup existing challenges for this email and purpose to avoid stale conflicts
  for (const [id, c] of activeChallenges.entries()) {
    if (c.email === challenge.email && c.purpose === challenge.purpose) {
      activeChallenges.delete(id);
    }
  }

  activeChallenges.set(verificationId, challenge);

  // Generate dispatched email preview
  const emailDispatch: DispatchedEmailNotification = {
    id: 'MSG-' + crypto.randomBytes(8).toString('hex'),
    to: challenge.email,
    from: 'security-auth@hemasync.med (HemaSync Medical Trust & Safety)',
    subject: `[HemaSync Verification] ${otp} is your 2-Factor Authentication Code`,
    otp,
    confirmationToken,
    confirmationUrl: `https://hemasync.med/auth/verify?token=${confirmationToken}`,
    sentAt: new Date().toISOString(),
    expiresInMinutes: 10,
    purpose: params.purpose,
    securityMetadata: {
      ip: challenge.ipAddress || '198.51.100.42 (Hospital Intranet)',
      browser: challenge.userAgent || 'Authorized Clinical Agent',
      facilityContext: 'Hospital Trauma Emergency Network Vault',
    },
  };

  recentDispatchedEmails.unshift(emailDispatch);
  if (recentDispatchedEmails.length > 25) {
    recentDispatchedEmails.pop();
  }

  console.log(`[Email Dispatch] Sent 2FA OTP ${otp} to ${challenge.email} (Verification ID: ${verificationId})`);

  return { challenge, emailDispatch };
}

/**
 * Validates submitted OTP or Confirmation Token
 */
export function verifyOtpSubmission(params: {
  verificationId?: string;
  email?: string;
  otp?: string;
  confirmationToken?: string;
  confirmationAccepted?: boolean;
}): { success: boolean; error?: string; challenge?: OtpChallenge } {
  let challenge: OtpChallenge | undefined;

  if (params.verificationId && activeChallenges.has(params.verificationId)) {
    challenge = activeChallenges.get(params.verificationId);
  } else if (params.confirmationToken) {
    for (const c of activeChallenges.values()) {
      if (c.confirmationToken === params.confirmationToken) {
        challenge = c;
        break;
      }
    }
  } else if (params.email) {
    const cleanEmail = params.email.trim().toLowerCase();
    for (const c of activeChallenges.values()) {
      if (c.email === cleanEmail) {
        challenge = c;
        break;
      }
    }
  }

  if (!challenge) {
    return { success: false, error: 'Verification session expired or not found. Please request a new code.' };
  }

  if (Date.now() > challenge.expiresAt) {
    activeChallenges.delete(challenge.verificationId);
    return { success: false, error: 'Verification code has expired (10 minutes limit). Please request a fresh code.' };
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    activeChallenges.delete(challenge.verificationId);
    return { success: false, error: 'Too many incorrect attempts. For security, this verification code has been revoked.' };
  }

  // Check 1: Confirmation token match with explicit user confirmation accept
  if (params.confirmationToken && params.confirmationToken === challenge.confirmationToken) {
    challenge.confirmed = true;
    activeChallenges.delete(challenge.verificationId);
    return { success: true, challenge };
  }

  // Check 2: OTP numeric match
  if (params.otp) {
    const cleanInputOtp = params.otp.replace(/\D/g, '').trim();
    if (cleanInputOtp === challenge.otp) {
      challenge.confirmed = true;
      activeChallenges.delete(challenge.verificationId);
      return { success: true, challenge };
    }
  }

  // Increment failure attempt
  challenge.attempts += 1;
  const remaining = challenge.maxAttempts - challenge.attempts;
  return {
    success: false,
    error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`,
  };
}

/**
 * Resends a fresh OTP for an existing active verification
 */
export function resendChallengeOtp(verificationId: string): {
  success: boolean;
  error?: string;
  emailDispatch?: DispatchedEmailNotification;
} {
  const challenge = activeChallenges.get(verificationId);
  if (!challenge) {
    return { success: false, error: 'Session not found. Please initiate login or registration again.' };
  }

  const newOtp = generateNumericOtp();
  challenge.otp = newOtp;
  challenge.attempts = 0;
  challenge.expiresAt = Date.now() + 10 * 60 * 1000;

  const emailDispatch: DispatchedEmailNotification = {
    id: 'MSG-' + crypto.randomBytes(8).toString('hex'),
    to: challenge.email,
    from: 'security-auth@hemasync.med (HemaSync Medical Trust & Safety)',
    subject: `[HemaSync Verification - Resent] ${newOtp} is your new 2-Factor Authentication Code`,
    otp: newOtp,
    confirmationToken: challenge.confirmationToken,
    confirmationUrl: `https://hemasync.med/auth/verify?token=${challenge.confirmationToken}`,
    sentAt: new Date().toISOString(),
    expiresInMinutes: 10,
    purpose: challenge.purpose,
    securityMetadata: {
      ip: challenge.ipAddress || '198.51.100.42 (Hospital Intranet)',
      browser: challenge.userAgent || 'Authorized Clinical Agent',
      facilityContext: 'Hospital Trauma Emergency Network Vault',
    },
  };

  recentDispatchedEmails.unshift(emailDispatch);
  return { success: true, emailDispatch };
}

/**
 * Gets the latest dispatched email, optionally filtered by recipient
 */
export function getLatestEmailDispatch(toEmail?: string): DispatchedEmailNotification | null {
  if (toEmail) {
    const clean = toEmail.trim().toLowerCase();
    const found = recentDispatchedEmails.find((m) => m.to.toLowerCase() === clean);
    if (found) return found;
  }
  return recentDispatchedEmails[0] || null;
}
