/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Building2,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  LogIn,
  KeyRound,
  Check,
  RefreshCw,
  UserPlus,
  ArrowLeft,
  ShieldAlert,
  Boxes,
  Database,
} from 'lucide-react';
import { api, StaffUser, DispatchedEmailInfo, AuthLoginResponse } from '../services/api';

interface InventoryLoginPortalProps {
  onLoginSuccess: (user: StaffUser) => void;
  onBackToUserPortal: () => void;
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
    badge: 'Vault Authority',
  },
  {
    name: 'Marcus Vance, RN',
    email: 'marcus.vance@hemasync.org',
    role: 'Blood Bank Supervisor',
    hospitalName: 'Metropolitan Trauma Institute & Blood Bank',
    hospitalId: 'HOSP-METRO-01',
    licenseNo: 'RN-BB-4421',
    password: 'admin123',
    badge: 'Cold Chain Supervisor',
  },
  {
    name: 'Elena Rostova, CLS',
    email: 'elena.rostova@stjude.org',
    role: 'Phlebotomy Specialist',
    hospitalName: 'St. Jude University Medical Center',
    hospitalId: 'HOSP-STJUDE-02',
    licenseNo: 'CLS-8819',
    password: 'admin123',
    badge: 'Clinical Specialist',
  },
];

export const InventoryLoginPortal: React.FC<InventoryLoginPortalProps> = ({
  onLoginSuccess,
  onBackToUserPortal,
}) => {
  const [activeTab, setActiveTab] = useState<'credentials' | 'demo_presets' | 'register'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [require2FA, setRequire2FA] = useState(false);

  // Registration fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'Inventory Manager' | 'Blood Bank Supervisor' | 'Trauma Operations Lead' | 'Phlebotomy Specialist'>('Inventory Manager');
  const [regHospitalId, setRegHospitalId] = useState('HOSP-METRO-01');
  const [regHospitalName, setRegHospitalName] = useState('Metropolitan Trauma Institute & Blood Bank');
  const [regLicense, setRegLicense] = useState('');

  // 2FA OTP state
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [dispatchedEmail, setDispatchedEmail] = useState<DispatchedEmailInfo | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [confirmationAccepted, setConfirmationAccepted] = useState(true);

  // Status feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle Standard Login
  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setErrorMessage('Invalid credentials. Please enter both email address and hospital security password.');
      return;
    }

    setIsLoading(true);

    try {
      // Call backend auth
      const res: AuthLoginResponse = await api.login(email.trim(), password, !require2FA);

      if (res.requiresOtp) {
        // Two-factor challenge triggered
        setVerificationId(res.verificationId);
        setVerificationEmail(res.email);
        setDispatchedEmail(res.dispatchedEmail);
        setIsVerifyingOtp(true);
        setOtpDigits(['', '', '', '', '', '']);
        setIsLoading(false);
        return;
      }

      if ('user' in res) {
        setSuccessMessage(`Credentials verified! Opening Inventory & Operations Console for ${res.user.name}...`);
        setTimeout(() => {
          onLoginSuccess(res.user);
        }, 500);
      }
    } catch (err: any) {
      // If login credentials do not match, do NOT open and throw invalid credentials
      setErrorMessage(
        err.message?.includes('credentials') || err.message?.includes('password') || err.message?.includes('not found')
          ? 'Invalid credentials. Access denied to Hospital Blood Inventory.'
          : err.message || 'Invalid credentials. Access denied.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Preset Account 1-Click Login
  const handlePresetLogin = async (preset: typeof PRESET_ACCOUNTS[0]) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res: AuthLoginResponse = await api.login(preset.email, preset.password, !require2FA);

      if (res.requiresOtp) {
        setVerificationId(res.verificationId);
        setVerificationEmail(res.email);
        setDispatchedEmail(res.dispatchedEmail);
        setIsVerifyingOtp(true);
        setOtpDigits(['', '', '', '', '', '']);
        setIsLoading(false);
        return;
      }

      if ('user' in res) {
        setSuccessMessage(`Credentials verified! Opening Inventory & Operations Console for ${res.user.name}...`);
        setTimeout(() => {
          onLoginSuccess(res.user);
        }, 400);
      }
    } catch (err: any) {
      setErrorMessage('Invalid credentials. Access denied to Hospital Blood Inventory.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regName || !regEmail || !regPassword) {
      setErrorMessage('All required fields must be completed.');
      return;
    }

    setIsLoading(true);

    try {
      const res: AuthLoginResponse = await api.register({
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
        setDispatchedEmail(res.dispatchedEmail);
        setIsVerifyingOtp(true);
        setOtpDigits(['', '', '', '', '', '']);
        setIsLoading(false);
        return;
      }

      if ('user' in res) {
        setSuccessMessage(`Staff account created & verified! Opening Inventory Dashboard...`);
        setTimeout(() => {
          onLoginSuccess(res.user);
        }, 600);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Staff email may already be in use.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP Verification submission
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length !== 6) {
      setErrorMessage('Please enter the full 6-digit authentication code.');
      return;
    }

    if (!confirmationAccepted) {
      setErrorMessage('Please accept the authorization confirmation.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.verifyOtp({
        verificationId: verificationId || undefined,
        email: verificationEmail,
        otp: enteredOtp,
        confirmationAccepted: true,
      });

      setSuccessMessage(`2FA Verification confirmed! Welcome, ${res.user.name}`);
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 500);
    } catch (err: any) {
      setErrorMessage('Invalid credentials or incorrect verification code. Access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  // One-Click Confirm OTP
  const handleOneClickConfirm = async () => {
    if (!dispatchedEmail?.confirmationToken) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.verifyOtp({
        verificationId: verificationId || undefined,
        email: verificationEmail,
        confirmationToken: dispatchedEmail.confirmationToken,
        confirmationAccepted: true,
      });

      setSuccessMessage(`Confirmation accepted! Welcome, ${res.user.name}`);
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 500);
    } catch (err: any) {
      setErrorMessage('Confirmation failed. Access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-fadeIn">
      {/* Return button */}
      <button
        onClick={onBackToUserPortal}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Donor & User Portal</span>
      </button>

      {/* Main Login Portal Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        {/* Top Restricted Security Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950 p-6 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold shrink-0">
              <Lock className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold font-mono tracking-wider uppercase px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800">
                  Restricted Access Zone
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ISO-15189 & AABB Compliant
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Hospital Inventory & Operations Login Portal
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Authentication required to access Cold Storage Vaults, ISBT-128 barcoded inventory units, and emergency dispatch ledger.
              </p>
            </div>
          </div>
        </div>

        {/* View 1: Credentials Form & Presets */}
        {!isVerifyingOtp ? (
          <div>
            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('credentials');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-3 px-4 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
                  activeTab === 'credentials'
                    ? 'border-rose-600 text-rose-600 bg-white shadow-sm'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Staff Credentials</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('demo_presets');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-3 px-4 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
                  activeTab === 'demo_presets'
                    ? 'border-rose-600 text-rose-600 bg-white shadow-sm'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Authorized Demo Profiles</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-3 px-4 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
                  activeTab === 'register'
                    ? 'border-rose-600 text-rose-600 bg-white shadow-sm'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register New Staff</span>
              </button>
            </div>

            {/* Error Message Banner */}
            <div className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-800 flex items-start gap-3 shadow-sm animate-shake">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-sm text-rose-900">Access Denied</strong>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-start gap-3 shadow-sm animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-sm text-emerald-900">Authentication Confirmed</strong>
                    <span>{successMessage}</span>
                  </div>
                </div>
              )}

              {/* Tab 1: Standard Email & Password Form */}
              {activeTab === 'credentials' && (
                <form onSubmit={handleStandardLogin} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Hospital Staff Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="sarah.sterling@hemasync.org"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none text-slate-900 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Security Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none text-slate-900 text-xs"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                      <span>Default seed password: <code className="bg-slate-100 font-mono px-1 py-0.5 rounded">admin123</code></span>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail('sarah.sterling@hemasync.org');
                          setPassword('admin123');
                        }}
                        className="text-rose-600 hover:underline font-bold cursor-pointer"
                      >
                        Fill Dr. Sterling Credentials
                      </button>
                    </div>
                  </div>

                  {/* 2FA Toggle */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-slate-700">Require 2FA Email OTP Verification</span>
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
                        {require2FA ? 'ON' : 'OFF'}
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isLoading ? 'Verifying Hospital Credentials...' : 'Sign In to Inventory Dashboard'}</span>
                  </button>
                </form>
              )}

              {/* Tab 2: 1-Click Demo Profiles */}
              {activeTab === 'demo_presets' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Select a verified clinical staff member stored in MongoDB to sign in directly:
                  </p>
                  <div className="space-y-2">
                    {PRESET_ACCOUNTS.map((preset) => (
                      <button
                        key={preset.email}
                        type="button"
                        onClick={() => handlePresetLogin(preset)}
                        disabled={isLoading}
                        className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-rose-500 hover:bg-rose-50/50 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 group-hover:text-rose-600">
                              {preset.name}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 group-hover:bg-rose-100 group-hover:text-rose-700">
                              {preset.role}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {preset.badge}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>{preset.email}</span>
                            <span>·</span>
                            <span>{preset.hospitalName}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Registration */}
              {activeTab === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">
                      Full Staff Name & Medical Title
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Dr. Jordan Hayes, MD"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-0.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="jordan@hospital.med"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-0.5">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 6 chars"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-0.5">
                        Clinical Role
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
                      <label className="block font-bold text-slate-700 mb-0.5">
                        License / Badge No.
                      </label>
                      <input
                        type="text"
                        value={regLicense}
                        onChange={(e) => setRegLicense(e.target.value)}
                        placeholder="AABB-NY-9021"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">
                      Assigned Hospital Cold Vault
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
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm mt-3 disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isLoading ? 'Creating Account in MongoDB...' : 'Register in MongoDB & Open Inventory'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* View 2: Two-Factor OTP & Confirmation Screen */
          <div className="p-6 space-y-4 text-xs animate-fadeIn">
            {errorMessage && (
              <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-800 flex items-start gap-3 shadow-sm animate-shake">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-sm text-rose-900">Verification Error</strong>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            {/* Email Dispatch Info */}
            <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                  <Mail className="w-4 h-4" />
                  <span>2FA Security Dispatch Sent</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">10 min expiry</span>
              </div>
              <p className="text-xs text-slate-200">
                A 6-digit verification code has been dispatched to: <strong className="text-white font-mono">{verificationEmail}</strong>
              </p>
            </div>

            {/* Dispatched Email Preview Card with 1-Click Accept */}
            {dispatchedEmail && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                    <span>Hospital Security Mail Inbox (Simulated Preview)</span>
                  </span>
                  <span className="text-xs font-mono font-black text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded border border-rose-300">
                    OTP: {dispatchedEmail.otp}
                  </span>
                </div>
                <div className="text-[11px] text-rose-800">
                  Subject: <span className="font-semibold">{dispatchedEmail.subject}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const chars = dispatchedEmail.otp.split('');
                      setOtpDigits(chars);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 rounded font-bold text-xs cursor-pointer"
                  >
                    Auto-Fill Code ({dispatchedEmail.otp})
                  </button>
                  <button
                    type="button"
                    onClick={handleOneClickConfirm}
                    disabled={isLoading}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-xs cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>1-Click Confirm & Open Inventory</span>
                  </button>
                </div>
              </div>
            )}

            {/* 6-box input */}
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-center font-bold text-slate-800 text-xs mb-2">
                  Enter 6-Digit Authentication Code
                </label>
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, '');
                        const copy = [...otpDigits];
                        copy[index] = cleaned;
                        setOtpDigits(copy);
                      }}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center font-mono font-black text-xl border-2 border-slate-300 rounded-xl focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all bg-white text-slate-900"
                    />
                  ))}
                </div>
              </div>

              {/* Confirmation Checkbox */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
                <input
                  id="portalConfirmAccept"
                  type="checkbox"
                  checked={confirmationAccepted}
                  onChange={(e) => setConfirmationAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor="portalConfirmAccept" className="text-[11px] text-slate-700 leading-tight cursor-pointer">
                  <strong className="text-slate-900 block font-bold mb-0.5">
                    Authorized Clinical Workstation Confirmation
                  </strong>
                  I confirm and accept this clinical login request for hospital cold storage vault operations.
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || !confirmationAccepted || otpDigits.join('').length !== 6}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isLoading ? 'Verifying...' : 'Verify Code & Open Inventory Dashboard'}</span>
              </button>
            </form>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsVerifyingOtp(false);
                  setErrorMessage(null);
                }}
                className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                ← Back to credentials
              </button>
            </div>
          </div>
        )}

        {/* Security Footer Notice */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>MongoDB Multi-Tenant Hospital Security Active</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            AABB Standard 5.1.8
          </span>
        </div>
      </div>
    </div>
  );
};
