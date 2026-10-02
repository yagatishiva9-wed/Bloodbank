/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  LogIn,
  ShieldCheck,
  Mail,
  Lock,
  Building2,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  User,
  ArrowRight,
  KeyRound,
  RefreshCw,
  Clock,
  ExternalLink,
  ShieldAlert,
  Copy,
  Check,
} from 'lucide-react';
import { api, StaffUser, DispatchedEmailInfo, AuthLoginResponse } from '../services/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: StaffUser) => void;
}

const PRESET_ACCOUNTS = [
  {
    name: 'Dr. Sarah Sterling',
    email: 'sarah.sterling@hemasync.org',
    role: 'Inventory Manager',
    hospitalName: 'Metropolitan Trauma Institute & Blood Bank',
    hospitalId: 'HOSP-METRO-01',
    licenseNo: 'AABB-MD-9042',
    password: 'admin123',
  },
  {
    name: 'Marcus Vance, RN',
    email: 'marcus.vance@hemasync.org',
    role: 'Blood Bank Supervisor',
    hospitalName: 'Metropolitan Trauma Institute & Blood Bank',
    hospitalId: 'HOSP-METRO-01',
    licenseNo: 'RN-BB-4421',
    password: 'admin123',
  },
  {
    name: 'Elena Rostova, CLS',
    email: 'elena.rostova@stjude.org',
    role: 'Phlebotomy Specialist',
    hospitalName: 'St. Jude University Medical Center',
    hospitalId: 'HOSP-STJUDE-02',
    licenseNo: 'CLS-8819',
    password: 'admin123',
  },
];

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'quick' | 'custom' | 'register'>('quick');
  const [require2FA, setRequire2FA] = useState(true);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'Inventory Manager' | 'Blood Bank Supervisor' | 'Trauma Operations Lead' | 'Phlebotomy Specialist'>('Inventory Manager');
  const [regHospitalId, setRegHospitalId] = useState('HOSP-METRO-01');
  const [regHospitalName, setRegHospitalName] = useState('Metropolitan Trauma Institute & Blood Bank');
  const [regLicense, setRegLicense] = useState('');

  // 2FA / OTP Verification States
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationPurpose, setVerificationPurpose] = useState<'login' | 'register'>('login');
  const [dispatchedEmail, setDispatchedEmail] = useState<DispatchedEmailInfo | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [confirmationAccepted, setConfirmationAccepted] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [isCopied, setIsCopied] = useState(false);

  // Status & feedback
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Input refs for 6 OTP boxes
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isVerifyingOtp && resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [isVerifyingOtp, resendCooldown]);

  // Reset modal state on close/open
  useEffect(() => {
    if (!isOpen) {
      setIsVerifyingOtp(false);
      setVerificationId(null);
      setOtpDigits(['', '', '', '', '', '']);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Quick Login Click
  const handleQuickLogin = async (acc: typeof PRESET_ACCOUNTS[0]) => {
    setIsLoading(true);
    setError(null);

    // If require2FA is enabled, route through the OTP verification challenge!
    if (require2FA) {
      try {
        const res: AuthLoginResponse = await api.login(acc.email, acc.password);
        if (res.requiresOtp) {
          setVerificationId(res.verificationId);
          setVerificationEmail(res.email);
          setVerificationPurpose(res.purpose);
          setDispatchedEmail(res.dispatchedEmail);
          setIsVerifyingOtp(true);
          setResendCooldown(30);
          setOtpDigits(['', '', '', '', '', '']);
          setIsLoading(false);
          return;
        } else if ('user' in res) {
          onLoginSuccess(res.user);
          onClose();
          return;
        }
      } catch (err: any) {
        setError(err.message || 'Authentication failed');
        setIsLoading(false);
        return;
      }
    }

    // Direct login bypass if 2FA toggle is switched off
    try {
      const res: AuthLoginResponse = await api.login(acc.email, acc.password, true);
      if (!res.requiresOtp && 'user' in res) {
        setSuccessMsg(`Welcome, ${res.user.name}`);
        setTimeout(() => {
          onLoginSuccess(res.user);
          onClose();
          setSuccessMsg(null);
        }, 400);
      }
    } catch {
      // Fallback
      const fallbackUser: StaffUser = {
        id: `STAFF-${acc.name.replace(/\D/g, '') || '001'}`,
        name: acc.name,
        email: acc.email,
        role: acc.role as any,
        hospitalId: acc.hospitalId,
        hospitalName: acc.hospitalName,
        licenseNo: acc.licenseNo,
        createdAt: new Date().toISOString(),
      };
      onLoginSuccess(fallbackUser);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Custom Email & Password Login
  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.login(email.trim(), password);
      if (res.requiresOtp) {
        setVerificationId(res.verificationId);
        setVerificationEmail(res.email);
        setVerificationPurpose(res.purpose);
        setDispatchedEmail(res.dispatchedEmail);
        setIsVerifyingOtp(true);
        setResendCooldown(30);
        setOtpDigits(['', '', '', '', '', '']);
      } else if ('user' in res) {
        setSuccessMsg(`Logged in as ${res.user.name}`);
        setTimeout(() => {
          onLoginSuccess(res.user);
          onClose();
          setSuccessMsg(null);
        }, 500);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      setError('Name, email, and password are required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        hospitalId: regHospitalId,
        hospitalName: regHospitalName,
        licenseNo: regLicense || `MED-${Math.floor(10000 + Math.random() * 90000)}`,
      });

      if (res.requiresOtp) {
        setVerificationId(res.verificationId);
        setVerificationEmail(res.email);
        setVerificationPurpose(res.purpose);
        setDispatchedEmail(res.dispatchedEmail);
        setIsVerifyingOtp(true);
        setResendCooldown(30);
        setOtpDigits(['', '', '', '', '', '']);
      } else if ('user' in res) {
        setSuccessMsg(`Account created for ${res.user.name}!`);
        setTimeout(() => {
          onLoginSuccess(res.user);
          onClose();
          setSuccessMsg(null);
        }, 600);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Email may already be in use.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP digit box change
  const handleOtpBoxChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (cleaned.length > 1) {
      // Paste detected
      const chars = cleaned.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = chars[i] || '';
      }
      setOtpDigits(newDigits);
      const focusIndex = Math.min(chars.length, 5);
      otpRefs.current[focusIndex]?.focus();
      return;
    }

    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    // Auto-advance
    if (cleaned && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Auto-fill from dispatched email simulation
  const handleAutoFillOtp = () => {
    if (dispatchedEmail?.otp) {
      const chars = dispatchedEmail.otp.split('');
      setOtpDigits(chars);
      otpRefs.current[5]?.focus();
    }
  };

  // One-click Confirm & Accept Login
  const handleOneClickConfirm = async () => {
    if (!dispatchedEmail?.confirmationToken) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.verifyOtp({
        verificationId: verificationId || undefined,
        email: verificationEmail,
        confirmationToken: dispatchedEmail.confirmationToken,
        confirmationAccepted: true,
      });

      setSuccessMsg(`Confirmed & Verified! Welcome, ${res.user.name}`);
      setTimeout(() => {
        onLoginSuccess(res.user);
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Confirmation failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit 6-digit OTP verification
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    if (!confirmationAccepted) {
      setError('Please check the confirmation box to authorize this login.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.verifyOtp({
        verificationId: verificationId || undefined,
        email: verificationEmail,
        otp: enteredOtp,
        confirmationAccepted: true,
      });

      setSuccessMsg(`Verification successful! Welcome back, ${res.user.name}`);
      setTimeout(() => {
        onLoginSuccess(res.user);
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Incorrect verification code. Please check your email.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!verificationId || resendCooldown > 0) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.resendOtp(verificationId);
      setDispatchedEmail(res.dispatchedEmail);
      setResendCooldown(30);
      setSuccessMsg('A new verification code has been dispatched to your email.');
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 p-5 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              {isVerifyingOtp ? (
                <KeyRound className="w-5 h-5 text-rose-400 animate-pulse" />
              ) : (
                <LogIn className="w-5 h-5 text-rose-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>{isVerifyingOtp ? 'Email Security Verification' : 'Hospital Staff Login'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase">
                  2FA Active
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {isVerifyingOtp
                  ? 'Verify identity with 6-digit OTP & confirmation acceptance'
                  : 'Authenticated with MongoDB clinical personnel registry'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode 1: Credentials & Profiles (When not verifying OTP) */}
        {!isVerifyingOtp && (
          <>
            {/* Tab switcher */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
              <button
                onClick={() => {
                  setMode('quick');
                  setError(null);
                }}
                className={`flex-1 py-2.5 px-3 text-center transition-colors cursor-pointer border-b-2 ${
                  mode === 'quick'
                    ? 'border-rose-600 text-rose-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                1-Click Demo Profiles
              </button>
              <button
                onClick={() => {
                  setMode('custom');
                  setError(null);
                }}
                className={`flex-1 py-2.5 px-3 text-center transition-colors cursor-pointer border-b-2 ${
                  mode === 'custom'
                    ? 'border-rose-600 text-rose-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Email & Password
              </button>
              <button
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`flex-1 py-2.5 px-3 text-center transition-colors cursor-pointer border-b-2 ${
                  mode === 'register'
                    ? 'border-rose-600 text-rose-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Register New
              </button>
            </div>

            {/* 2FA Toggle Bar */}
            <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-700">Enforce Email 2FA (OTP Verification):</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={require2FA}
                  onChange={(e) => setRequire2FA(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                <span className="ml-2 text-[11px] font-bold text-slate-600">
                  {require2FA ? 'Required' : 'Bypass'}
                </span>
              </label>
            </div>

            {/* Content Body */}
            <div className="p-5">
              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* 1. Quick Select Tab */}
              {mode === 'quick' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Select a verified clinical staff profile stored in MongoDB:
                  </p>
                  <div className="space-y-2">
                    {PRESET_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.email}
                        onClick={() => handleQuickLogin(acc)}
                        disabled={isLoading}
                        className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-rose-500 hover:bg-rose-50/50 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 group-hover:text-rose-600">
                              {acc.name}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 group-hover:bg-rose-100 group-hover:text-rose-700">
                              {acc.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>{acc.email}</span>
                            <span>·</span>
                            <span className="truncate max-w-[160px]">{acc.hospitalName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {require2FA && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              OTP Verification
                            </span>
                          )}
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Custom Email / Password Tab */}
              {mode === 'custom' && (
                <form onSubmit={handleCustomLogin} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Staff Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="sarah.sterling@hemasync.org"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Default password for seed staff accounts: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">admin123</code>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isLoading ? 'Verifying Credentials...' : 'Continue to 2FA Email Verification'}</span>
                  </button>
                </form>
              )}

              {/* 3. Registration Tab */}
              {mode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">
                      Full Name & Title
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Dr. Alex Morgan, MD"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-0.5">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="alex@hospital.org"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-0.5">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-0.5">
                        Role
                      </label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
                      >
                        <option value="Inventory Manager">Inventory Manager</option>
                        <option value="Blood Bank Supervisor">Blood Bank Supervisor</option>
                        <option value="Trauma Operations Lead">Trauma Operations Lead</option>
                        <option value="Phlebotomy Specialist">Phlebotomy Specialist</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-0.5">
                        Medical License No.
                      </label>
                      <input
                        type="text"
                        value={regLicense}
                        onChange={(e) => setRegLicense(e.target.value)}
                        placeholder="MED-7842"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">
                      Hospital Facility
                    </label>
                    <select
                      value={regHospitalId}
                      onChange={(e) => {
                        setRegHospitalId(e.target.value);
                        if (e.target.value === 'HOSP-METRO-01') {
                          setRegHospitalName('Metropolitan Trauma Institute & Blood Bank');
                        } else if (e.target.value === 'HOSP-STJUDE-02') {
                          setRegHospitalName('St. Jude University Medical Center');
                        } else {
                          setRegHospitalName('County General Trauma Hospital');
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
                    >
                      <option value="HOSP-METRO-01">Metropolitan Trauma Institute & Blood Bank</option>
                      <option value="HOSP-STJUDE-02">St. Jude University Medical Center</option>
                      <option value="HOSP-COUNTY-03">County General Trauma Hospital</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm mt-2 disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isLoading ? 'Sending Verification...' : 'Send Verification OTP & Register'}</span>
                  </button>
                </form>
              )}
            </div>
          </>
        )}

        {/* View Mode 2: Two-Factor Email OTP & Security Confirmation Screen */}
        {isVerifyingOtp && (
          <div className="p-6 space-y-5 animate-fadeIn text-xs">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Email Security Dispatch Banner */}
            <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-400">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Clinical Email Dispatched</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Expires in 10 mins
                </span>
              </div>
              <div className="text-xs text-slate-200">
                We sent a secure 6-digit verification code to: <strong className="text-white font-mono">{verificationEmail}</strong>
              </div>
            </div>

            {/* Simulated Medical Mail Preview Card */}
            {dispatchedEmail && (
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                    <span>Hospital Security Mail Inbox (Simulated Preview)</span>
                  </div>
                  <span className="text-[10px] font-mono text-rose-700 bg-rose-100 px-2 py-0.5 rounded font-bold">
                    Code: {dispatchedEmail.otp}
                  </span>
                </div>
                <div className="text-[11px] text-rose-800 leading-relaxed">
                  Subject: <span className="font-semibold">{dispatchedEmail.subject}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAutoFillOtp}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-md font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>Auto-Fill Code ({dispatchedEmail.otp})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOneClickConfirm}
                    disabled={isLoading}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Check className="w-3 h-3" />
                    <span>1-Click Confirm & Accept</span>
                  </button>
                </div>
              </div>
            )}

            {/* Form with 6-box input */}
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-center font-bold text-slate-800 text-xs mb-2">
                  Enter 6-Digit Authentication Code
                </label>
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpBoxChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center font-mono font-black text-xl border-2 border-slate-300 rounded-xl focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all bg-white text-slate-900"
                    />
                  ))}
                </div>
              </div>

              {/* Mandatory Confirmation Accept Checkbox */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
                <input
                  id="confirmAccept"
                  type="checkbox"
                  checked={confirmationAccepted}
                  onChange={(e) => setConfirmationAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor="confirmAccept" className="text-[11px] text-slate-700 leading-tight cursor-pointer">
                  <strong className="text-slate-900 block font-bold mb-0.5">
                    Authorized Clinical Workstation Confirmation
                  </strong>
                  I confirm and accept this login request for clinical operations, authorized under hospital compliance protocols.
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !confirmationAccepted || otpDigits.join('').length !== 6}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 active:scale-[0.99]"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isLoading ? 'Verifying Security OTP...' : 'Verify Code & Accept Login'}</span>
              </button>
            </form>

            {/* Footer with Resend & Cancel */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsVerifyingOtp(false);
                  setError(null);
                }}
                className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                ← Back to credentials
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isLoading}
                className={`flex items-center gap-1 font-bold ${
                  resendCooldown > 0
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-rose-600 hover:text-rose-700 cursor-pointer'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
