/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Mail,
  ShieldCheck,
  X,
  Clock,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { api, DispatchedEmailInfo } from '../services/api';

export const SecurityMailBadge: React.FC = () => {
  const [latestEmail, setLatestEmail] = useState<DispatchedEmailInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchEmail = () => {
    setIsRefreshing(true);
    api.getLatestEmail()
      .then((res) => {
        if (res.email) setLatestEmail(res.email);
      })
      .catch((err) => console.warn('Could not fetch latest email dispatch:', err))
      .finally(() => setIsRefreshing(false));
  };

  useEffect(() => {
    fetchEmail();
    const interval = setInterval(fetchEmail, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <button
        onClick={() => {
          fetchEmail();
          setIsOpen(true);
        }}
        type="button"
        className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-sm"
        title="View 2FA Email Verification Dispatches"
      >
        <Mail className="w-3.5 h-3.5 text-rose-600" />
        <span className="font-bold">2FA Mailbox</span>
        {latestEmail && (
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 p-5 text-white flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>Clinical Security Mailbox</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase">
                      Audit Stream
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Live record of email OTP codes and confirmation tokens dispatched by the server
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs text-slate-700">
              {latestEmail ? (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Most Recent Verification Dispatch</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {new Date(latestEmail.sentAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div>
                      <span className="text-slate-500 font-semibold">Recipient: </span>
                      <strong className="text-slate-900 font-mono">{latestEmail.to}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold">Subject: </span>
                      <span className="text-slate-800">{latestEmail.subject}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold">Action Purpose: </span>
                      <span className="capitalize font-mono text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        {latestEmail.purpose} 2FA
                      </span>
                    </div>
                  </div>

                  {/* Highlighted OTP Code */}
                  <div className="p-3 bg-white rounded-lg border border-rose-200 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        6-Digit Security OTP Code:
                      </div>
                      <div className="text-2xl font-black font-mono tracking-widest text-rose-600">
                        {latestEmail.otp}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Active (10 min expiry)
                      </span>
                    </div>
                  </div>

                  {/* Confirmation Acceptance Details */}
                  <div className="p-2.5 bg-slate-100 rounded-lg text-[10px] text-slate-600 font-mono space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Confirmation Token:</span>
                      <span className="text-slate-800 truncate max-w-[200px]">{latestEmail.confirmationToken}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Station IP:</span>
                      <span className="text-slate-800">{latestEmail.securityMetadata?.ip || 'Hospital Intranet'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-2">
                  <Mail className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-600">No verification emails dispatched yet.</p>
                  <p className="text-slate-400 text-[11px]">
                    Initiate a login or registration in the Staff Login dialog to generate and dispatch an OTP email.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={fetchEmail}
                  disabled={isRefreshing}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh Mail Stream</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
