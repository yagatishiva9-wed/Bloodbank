/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Activity,
  AlertTriangle,
  Boxes,
  Building2,
  Database,
  GitBranch,
  Heart,
  HeartHandshake,
  LogIn,
  LogOut,
  Plus,
  QrCode,
  Radio,
  ShieldCheck,
  Truck,
  User,
  Zap,
} from 'lucide-react';
import { AppRole } from '../types/blood';
import { StaffUser } from '../services/api';
import { MongoStatusBadge } from './MongoStatusBadge';
import { SecurityMailBadge } from './SecurityMailBadge';

export type ActiveTab = 'matching' | 'aggregation' | 'sources' | 'inventory' | 'recovery' | 'compatibility';

interface NavbarProps {
  currentRole: AppRole;
  onSelectRole: (role: AppRole) => void;
  currentStaffUser?: StaffUser | null;
  onStaffLogout?: () => void;
  onOpenLoginModal?: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenEmergencyModal: () => void;
  onOpenAddUnitModal: () => void;
  onOpenQrScanner?: () => void;
  activeEmergencyCount: number;
  criticalDeficitCount: number;
  anomaliesCount: number;
  expiringUnitsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onSelectRole,
  currentStaffUser,
  onStaffLogout,
  onOpenLoginModal,
  activeTab,
  onSelectTab,
  onOpenEmergencyModal,
  onOpenAddUnitModal,
  onOpenQrScanner,
  activeEmergencyCount,
  criticalDeficitCount,
  anomaliesCount,
  expiringUnitsCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Zone 1: Wordmark & Role Segmented Switcher */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => onSelectTab('matching')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-sm shadow-rose-200 group-hover:bg-rose-700 transition-colors">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-rose-600 transition-colors">
                  HemaSync
                </span>
                <span className="hidden xl:inline text-xs text-slate-500 font-medium ml-2">
                  Emergency Blood Network
                </span>
              </div>
            </button>

            {/* Prominent Two-Interface Role Switcher */}
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center shadow-inner">
              <button
                type="button"
                onClick={() => onSelectRole('user')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentRole === 'user'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${currentRole === 'user' ? 'fill-white' : 'text-rose-600'}`} />
                <span>Donor & User Portal</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectRole('manager')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentRole === 'manager'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Building2 className={`w-3.5 h-3.5 ${currentRole === 'manager' ? 'text-rose-400' : 'text-slate-600'}`} />
                <span>Inventory & Operations Manager</span>
              </button>
            </div>
          </div>

          {/* Zone 2: MongoDB Status, 2FA Mailbox & Action Buttons */}
          <div className="flex items-center gap-2">
            <MongoStatusBadge />
            <SecurityMailBadge />

            {currentStaffUser ? (
              <div className="flex items-center gap-1.5">
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-800">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                    {currentStaffUser.name.charAt(0)}
                  </div>
                  <span className="font-bold max-w-[120px] truncate">{currentStaffUser.name}</span>
                  <span className="text-[10px] font-mono text-slate-500">({currentStaffUser.role})</span>
                </div>
                {onStaffLogout && (
                  <button
                    onClick={onStaffLogout}
                    type="button"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                    title={`Log out of ${currentStaffUser.name}`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            ) : (
              onOpenLoginModal && (
                <button
                  onClick={onOpenLoginModal}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                  title="Log in to account"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-600" />
                  <span>Log In</span>
                </button>
              )
            )}

            {currentRole === 'manager' && currentStaffUser && (
              <>
                {onOpenQrScanner && (
                  <button
                    onClick={onOpenQrScanner}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 cursor-pointer shadow-xs whitespace-nowrap"
                    title="Camera QR Code Scanner for instant blood bag updates and intake"
                  >
                    <QrCode className="w-3.5 h-3.5 text-rose-600" />
                    <span>Scan Bag QR</span>
                  </button>
                )}
                <button
                  onClick={onOpenAddUnitModal}
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Intake Unit</span>
                </button>
              </>
            )}

            <button
              onClick={onOpenEmergencyModal}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] rounded-lg shadow-sm shadow-rose-200 transition-all cursor-pointer whitespace-nowrap"
            >
              <Activity className="w-4 h-4 animate-pulse" />
              <span>STAT Emergency Match</span>
            </button>
          </div>
        </div>

        {/* Mobile secondary bar for role status & auth */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-semibold text-slate-500">
            Active Mode: <strong className="text-slate-800">{currentRole === 'user' ? 'User Portal' : currentStaffUser ? 'Manager Console' : 'Inventory Login Portal'}</strong>
          </span>
          {currentStaffUser ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {currentStaffUser.name}
              </span>
              {onStaffLogout && (
                <button
                  onClick={onStaffLogout}
                  type="button"
                  className="text-[10px] font-bold text-rose-600 hover:text-white hover:bg-rose-600 px-2 py-0.5 rounded bg-rose-50 border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Logout</span>
                </button>
              )}
            </div>
          ) : (
            onOpenLoginModal && (
              <button
                onClick={onOpenLoginModal}
                type="button"
                className="text-[10px] font-bold text-slate-700 hover:text-slate-900 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <LogIn className="w-3 h-3" />
                <span>Log In</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
};
