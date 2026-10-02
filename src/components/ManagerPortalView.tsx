/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  Filter,
  Flame,
  GitBranch,
  Heart,
  HeartHandshake,
  Layers,
  LogIn,
  LogOut,
  MapPin,
  Package,
  PackageCheck,
  Plus,
  QrCode,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Thermometer,
  Trash2,
  Truck,
  UserCheck,
  Zap,
} from 'lucide-react';
import {
  AuditLedgerEntry,
  BloodComponent,
  BloodGroup,
  BloodInventoryUnit,
  DispatchLedgerRecord,
  DonorAvailabilityStatus,
  DonorBloodSource,
  EmergencyRequest,
  HospitalBloodSource,
  InventorySnapshot,
} from '../types/blood';
import { ALL_BLOOD_GROUPS, ALL_COMPONENTS, aggregateStockByBloodGroup } from '../services/aggregation';
import { HospitalInventoryView } from './HospitalInventoryView';
import { EmergencyDispatchView } from './EmergencyDispatchView';
import { StockAggregationView } from './StockAggregationView';
import { BloodSourcesView } from './BloodSourcesView';
import { DisasterRecoveryView } from './DisasterRecoveryView';
import { CompatibilityMatrixView } from './CompatibilityMatrixView';
import { StaffUser } from '../services/api';

interface ManagerPortalViewProps {
  hospitals: HospitalBloodSource[];
  donors: DonorBloodSource[];
  emergencyRequests: EmergencyRequest[];
  dispatchLedger: DispatchLedgerRecord[];
  ledger: AuditLedgerEntry[];
  snapshots: InventorySnapshot[];
  currentStaffUser?: StaffUser | null;
  onStaffLogout?: () => void;
  onRequestStaffAuth?: () => void;
  onRecordDonation: (
    hospitalId: string,
    unit: BloodInventoryUnit,
    donorId?: string
  ) => void;
  onUpdateUnitStatus: (
    hospitalId: string,
    unitId: string,
    newStatus: BloodInventoryUnit['status'],
    reason?: string
  ) => void;
  onUpdateHospitalUnits: (
    facilityId: string,
    updatedUnits: BloodInventoryUnit[]
  ) => void;
  onUpdateEmergencyStatus: (
    requestId: string,
    newStatus: EmergencyRequest['status']
  ) => void;
  onUpdateDonorAvailability: (
    donorId: string,
    status: DonorAvailabilityStatus,
    notes?: string
  ) => void;
  onMobilizeDonor: (donor: DonorBloodSource) => void;
  onOpenRegisterDonor: () => void;
  onOpenAddUnitModal: () => void;
  onTriggerEmergencyModal: () => void;
  onUpdateHospitals: React.Dispatch<React.SetStateAction<HospitalBloodSource[]>>;
  onUpdateLedger: React.Dispatch<React.SetStateAction<AuditLedgerEntry[]>>;
  onAddSnapshot: (newSnapshot: InventorySnapshot) => void;
  onRestoreSnapshot: (snapshot: InventorySnapshot) => void;
  onFulfillRequestWithBag?: (
    requestId: string,
    hospitalId: string,
    bag: BloodInventoryUnit
  ) => void;
  onOpenQrScanner?: () => void;
}

export type ManagerSubTab =
  | 'inventory' // Blood_Inventory
  | 'dispatch_ledger' // Dispatch_Ledger junction
  | 'requests' // Requests & Hospitals
  | 'donors' // Donors
  | 'aggregations' // Multi-dimensional query
  | 'recovery'; // Audit ledger & recovery

export const ManagerPortalView: React.FC<ManagerPortalViewProps> = ({
  hospitals,
  donors,
  emergencyRequests,
  dispatchLedger,
  ledger,
  snapshots,
  currentStaffUser,
  onStaffLogout,
  onRequestStaffAuth,
  onRecordDonation,
  onUpdateUnitStatus,
  onUpdateHospitalUnits,
  onUpdateEmergencyStatus,
  onUpdateDonorAvailability,
  onMobilizeDonor,
  onOpenRegisterDonor,
  onOpenAddUnitModal,
  onTriggerEmergencyModal,
  onUpdateHospitals,
  onUpdateLedger,
  onAddSnapshot,
  onRestoreSnapshot,
  onFulfillRequestWithBag,
  onOpenQrScanner,
}) => {
  const [managerTab, setManagerTab] = useState<ManagerSubTab>('inventory');

  // Total inventory stats
  const totalBags = useMemo(() => {
    return hospitals.reduce((acc, h) => acc + h.inventoryUnits.length, 0);
  }, [hospitals]);

  const activeRequests = useMemo(() => {
    return emergencyRequests.filter((r) => r.status !== 'DELIVERED' && r.status !== 'CANCELLED');
  }, [emergencyRequests]);

  const availableDonorsCount = useMemo(() => {
    return donors.filter((d) => d.availabilityStatus === 'Available').length;
  }, [donors]);

  return (
    <div className="space-y-6">
      {/* Top Manager Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-rose-500" />
              <span>Blood Bank & Operations Command Center</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 font-medium">Inventory & Logistics Console</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Hospital Blood Inventory & Dispatch Console
              </h1>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800">
                Cold Chain Optimal (3.4°C)
              </span>
            </div>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Unified administration of cold storage vaults, ISBT-128 barcoded inventory units, trauma emergency requests, automated donor mobilization, and the dispatch ledger.
            </p>
          </div>

          {/* Quick Action Buttons & Account Control */}
          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
            {currentStaffUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-[10px]">
                    {currentStaffUser.name.charAt(0)}
                  </div>
                  <div className="text-left leading-tight">
                    <span className="font-bold text-white block">{currentStaffUser.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono block">{currentStaffUser.role}</span>
                  </div>
                </div>
                {onStaffLogout && (
                  <button
                    onClick={onStaffLogout}
                    className="px-3 py-2.5 text-xs font-bold text-rose-300 hover:text-white bg-slate-800 hover:bg-rose-600 rounded-xl transition-all border border-slate-700 hover:border-rose-600 flex items-center gap-1.5 cursor-pointer shadow-md"
                    title={`Log out of ${currentStaffUser.name}`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                )}
              </div>
            ) : (
              onRequestStaffAuth && (
                <button
                  onClick={onRequestStaffAuth}
                  className="px-3.5 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <LogIn className="w-3.5 h-3.5 text-rose-400" />
                  <span>Staff Login</span>
                </button>
              )
            )}

            {onOpenQrScanner && (
              <button
                type="button"
                onClick={onOpenQrScanner}
                className="px-3.5 py-2.5 text-xs font-bold text-rose-300 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/80 hover:border-rose-600 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                title="Camera QR Code Scanner for instant blood bag updates and intake"
              >
                <QrCode className="w-4 h-4 text-rose-400" />
                <span>Scan Bag QR</span>
              </button>
            )}

            <button
              onClick={onOpenAddUnitModal}
              className="px-3.5 py-2.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Intake Unit</span>
            </button>

            <button
              onClick={onTriggerEmergencyModal}
              className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-900/30"
            >
              <Zap className="w-4 h-4" />
              <span>STAT Emergency Match</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div
            onClick={() => setManagerTab('inventory')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              managerTab === 'inventory'
                ? 'bg-slate-800 border-rose-500 ring-1 ring-rose-500/50'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-slate-400 text-[11px] flex items-center justify-between">
              <span>Vault Blood Units:</span>
              <span className="font-mono text-emerald-400 text-[10px]">ISBT-128</span>
            </div>
            <div className="text-2xl font-black font-mono text-white mt-1">
              {totalBags}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Across {hospitals.length} hospital cold vaults
            </span>
          </div>

          <div
            onClick={() => setManagerTab('requests')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              managerTab === 'requests'
                ? 'bg-slate-800 border-rose-500 ring-1 ring-rose-500/50'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-slate-400 text-[11px] flex items-center justify-between">
              <span>Emergency Requests:</span>
              <span className="font-mono text-amber-400 text-[10px]">Clinical</span>
            </div>
            <div className="text-2xl font-black font-mono text-rose-400 mt-1 flex items-center gap-1.5">
              <span>{activeRequests.length}</span>
              {activeRequests.length > 0 && (
                <span className="text-xs font-bold px-1.5 py-0.2 rounded bg-rose-600 text-white animate-pulse">
                  ACTIVE
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Pending clinical fulfillment
            </span>
          </div>

          <div
            onClick={() => setManagerTab('dispatch_ledger')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              managerTab === 'dispatch_ledger'
                ? 'bg-slate-800 border-rose-500 ring-1 ring-rose-500/50'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-slate-400 text-[11px] flex items-center justify-between">
              <span>Completed Dispatches:</span>
              <span className="font-mono text-blue-400 text-[10px]">Manifests</span>
            </div>
            <div className="text-2xl font-black font-mono text-blue-400 mt-1">
              {dispatchLedger.length}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Fulfilled blood shipments
            </span>
          </div>

          <div
            onClick={() => setManagerTab('donors')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              managerTab === 'donors'
                ? 'bg-slate-800 border-rose-500 ring-1 ring-rose-500/50'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-slate-400 text-[11px] flex items-center justify-between">
              <span>Registered Donors:</span>
              <span className="font-mono text-rose-400 text-[10px]">Standby</span>
            </div>
            <div className="text-2xl font-black font-mono text-white mt-1 flex items-center gap-1.5">
              <span>{donors.length}</span>
              <span className="text-xs font-semibold text-emerald-400 font-mono">
                ({availableDonorsCount} available)
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Universal standby registry
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Manager Sub-Modules */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setManagerTab('inventory')}
          className={`px-3.5 py-2 font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            managerTab === 'inventory'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Blood Inventory Vault</span>
        </button>

        <button
          onClick={() => setManagerTab('dispatch_ledger')}
          className={`px-3.5 py-2 font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            managerTab === 'dispatch_ledger'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Dispatch Ledger & Manifests</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-white text-[10px] font-mono">
            {dispatchLedger.length}
          </span>
        </button>

        <button
          onClick={() => setManagerTab('requests')}
          className={`px-3.5 py-2 font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            managerTab === 'requests'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Emergency Requests & Dispatch</span>
          {activeRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[10px] font-mono">
              {activeRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setManagerTab('donors')}
          className={`px-3.5 py-2 font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            managerTab === 'donors'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>Blood Sources & Donors</span>
        </button>

        <button
          onClick={() => setManagerTab('aggregations')}
          className={`px-3.5 py-2 font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            managerTab === 'aggregations'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Stock Aggregation Analytics</span>
        </button>

        <button
          onClick={() => setManagerTab('recovery')}
          className={`px-3.5 py-2 font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            managerTab === 'recovery'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Disaster Recovery & Ledger</span>
        </button>
      </div>

      {/* Sub-View Content */}

      {/* 1. Blood Inventory Manager */}
      {managerTab === 'inventory' && (
        <HospitalInventoryView
          hospitals={hospitals}
          donors={donors}
          currentStaffUser={currentStaffUser}
          onStaffLogout={onStaffLogout}
          onRequestStaffAuth={onRequestStaffAuth}
          onRecordDonation={onRecordDonation}
          onUpdateUnitStatus={onUpdateUnitStatus}
          onTriggerEmergencyModal={onTriggerEmergencyModal}
          onOpenQrScanner={onOpenQrScanner}
        />
      )}

      {/* 2. Dispatch Ledger Manifest View */}
      {managerTab === 'dispatch_ledger' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Hospital Dispatch & Delivery Manifests
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Comprehensive log of emergency dispatches fulfilling hospital trauma requests with verified blood inventory units.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Dispatch ID</th>
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Unit Bag ID</th>
                    <th className="py-3 px-4">Blood Group</th>
                    <th className="py-3 px-4">Hospital Destination</th>
                    <th className="py-3 px-4">Dispatched At</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispatchLedger.map((dl) => (
                    <tr key={dl.dispatch_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        #{dl.dispatch_id}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-800">
                        #{dl.request_id}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                        #{dl.bag_id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                          {dl.blood_type}
                        </span>
                        <span className="text-[11px] text-slate-500 ml-1.5">
                          ({dl.volume_ml} mL)
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {dl.hospital_name || 'Metropolitan Trauma Bay'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {dl.dispatched_at.replace('T', ' ').slice(0, 16)} UTC
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            dl.status === 'TRANSFUSED' || dl.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {dl.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {dl.status !== 'TRANSFUSED' && (
                          <button
                            onClick={() => {
                              // transition to delivered / transfused
                              dl.status = 'TRANSFUSED';
                              onUpdateEmergencyStatus(String(dl.request_id), 'DELIVERED');
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors cursor-pointer"
                          >
                            Mark Transfused
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Emergency Requests & Dispatch Module */}
      {managerTab === 'requests' && (
        <EmergencyDispatchView
          requests={emergencyRequests}
          onTriggerEmergencyModal={onTriggerEmergencyModal}
          onUpdateStatus={onUpdateEmergencyStatus}
        />
      )}

      {/* 4. Donors Directory */}
      {managerTab === 'donors' && (
        <BloodSourcesView
          hospitals={hospitals}
          donors={donors}
          onOpenRegisterDonor={onOpenRegisterDonor}
          onOpenAddUnit={onOpenAddUnitModal}
          onMobilizeDonor={onMobilizeDonor}
          onUpdateDonorAvailability={onUpdateDonorAvailability}
        />
      )}

      {/* 5. Stock Aggregations */}
      {managerTab === 'aggregations' && (
        <StockAggregationView
          hospitals={hospitals}
          donors={donors}
          onTriggerEmergencyModal={onTriggerEmergencyModal}
        />
      )}

      {/* 6. Disaster Recovery */}
      {managerTab === 'recovery' && (
        <DisasterRecoveryView
          hospitals={hospitals}
          donors={donors}
          ledger={ledger}
          snapshots={snapshots}
          onUpdateHospitals={onUpdateHospitals}
          onUpdateLedger={onUpdateLedger}
          onAddSnapshot={onAddSnapshot}
          onRestoreSnapshot={onRestoreSnapshot}
        />
      )}
    </div>
  );
};
