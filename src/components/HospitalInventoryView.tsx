/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Barcode,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  Download,
  Filter,
  Layers,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Package,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Thermometer,
  Trash2,
  TrendingUp,
  Truck,
  User,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import {
  BloodComponent,
  BloodGroup,
  BloodInventoryUnit,
  DonorBloodSource,
  HospitalBloodSource,
} from '../types/blood';
import { ALL_BLOOD_GROUPS, ALL_COMPONENTS } from '../services/aggregation';
import { api, BackendDonationRecord, StaffUser } from '../services/api';
import { BloodBagQrScannerModal } from './BloodBagQrScannerModal';
import { UnitQrCodeBadgeModal } from './UnitQrCodeBadgeModal';

interface HospitalInventoryViewProps {
  hospitals: HospitalBloodSource[];
  donors?: DonorBloodSource[];
  currentStaffUser?: StaffUser | null;
  onStaffLogout?: () => void;
  onRequestStaffAuth?: () => void;
  onAddUnit?: (facilityId: string, unit: BloodInventoryUnit) => void;
  onRecordDonation?: (
    hospitalId: string,
    unit: BloodInventoryUnit,
    donorId?: string
  ) => void;
  onUpdateUnitStatus?: (
    hospitalId: string,
    unitId: string,
    newStatus: BloodInventoryUnit['status'],
    reason?: string
  ) => void;
  onUpdateHospitalUnits?: (facilityId: string, updatedUnits: BloodInventoryUnit[]) => void;
  onTriggerEmergencyModal: () => void;
  onOpenQrScanner?: () => void;
}

export const HospitalInventoryView: React.FC<HospitalInventoryViewProps> = ({
  hospitals,
  donors = [],
  currentStaffUser,
  onStaffLogout,
  onRequestStaffAuth,
  onAddUnit,
  onRecordDonation,
  onUpdateUnitStatus,
  onUpdateHospitalUnits,
  onTriggerEmergencyModal,
  onOpenQrScanner,
}) => {
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(hospitals[0]?.id || '');
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'intake' | 'expiring' | 'backend_donations'>('inventory');

  // QR scanner & unit QR label modal states
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [selectedUnitForQr, setSelectedUnitForQr] = useState<BloodInventoryUnit | null>(null);

  // Backend donations state
  const [backendDonations, setBackendDonations] = useState<BackendDonationRecord[]>([]);
  const [isLoadingBackendDonations, setIsLoadingBackendDonations] = useState<boolean>(false);
  const [backendFeedback, setBackendFeedback] = useState<string | null>(null);

  // Fetch backend donations on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoadingBackendDonations(true);
    api.fetchDonations()
      .then((records) => {
        if (isMounted) {
          setBackendDonations(records);
        }
      })
      .catch((err) => console.warn('Could not fetch backend donations:', err))
      .finally(() => {
        if (isMounted) setIsLoadingBackendDonations(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshBackendDonations = () => {
    setIsLoadingBackendDonations(true);
    api.fetchDonations({ facilityId: selectedHospitalId })
      .then((records) => setBackendDonations(records))
      .catch((err) => console.warn(err))
      .finally(() => setIsLoadingBackendDonations(false));
  };

  // Filter states
  const [filterGroup, setFilterGroup] = useState<string>('ALL');
  const [filterComponent, setFilterComponent] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchBarcode, setSearchBarcode] = useState<string>('');

  // Intake Form State
  const [intakeDonorName, setIntakeDonorName] = useState('');
  const [intakeDonorId, setIntakeDonorId] = useState('');
  const [intakeBloodGroup, setIntakeBloodGroup] = useState<BloodGroup>('O-');
  const [intakeComponent, setIntakeComponent] = useState<BloodComponent>('Packed Red Blood Cells (PRBC)');
  const [intakeVolumeMl, setIntakeVolumeMl] = useState(450);
  const [intakeStorageLocation, setIntakeStorageLocation] = useState('Cold Storage Vault Bay A (3.6°C)');
  const [intakeScreeningCleared, setIntakeScreeningCleared] = useState(true);
  const [intakeCustomDays, setIntakeCustomDays] = useState(42);

  // Selected hospital object
  const currentHospital = useMemo(() => {
    return hospitals.find((h) => h.id === selectedHospitalId) || hospitals[0];
  }, [hospitals, selectedHospitalId]);

  const units = currentHospital ? currentHospital.inventoryUnits : [];

  // Expiration calculation helper
  const now = new Date('2026-09-30T02:00:00Z').getTime();

  const getExpirationMetrics = (expirationDate: string) => {
    const expTime = new Date(expirationDate).getTime();
    const diffHours = (expTime - now) / (1000 * 60 * 60);
    const diffDays = Math.ceil(diffHours / 24);

    return {
      diffHours: Math.round(diffHours),
      diffDays,
      isExpired: diffHours <= 0,
      isCritical48h: diffHours > 0 && diffHours <= 48,
      isWarning7d: diffHours > 48 && diffDays <= 7,
    };
  };

  // Flagged expiring units
  const flaggedExpiringUnits = useMemo(() => {
    return units.filter((u) => {
      if (u.status !== 'available') return false;
      const { isCritical48h, isWarning7d, isExpired } = getExpirationMetrics(u.expirationDate);
      return isCritical48h || isWarning7d || isExpired;
    }).sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
  }, [units]);

  // Stock counts by blood group for current hospital
  const stockByGroup = useMemo(() => {
    return ALL_BLOOD_GROUPS.map((bg) => {
      const groupUnits = units.filter((u) => u.bloodGroup === bg);
      const available = groupUnits.filter((u) => u.status === 'available' && u.testedClear && !u.temperatureAlert).length;
      const reserved = groupUnits.filter((u) => u.status === 'reserved').length;
      const quarantined = groupUnits.filter((u) => u.status === 'quarantined' || u.temperatureAlert).length;
      const expiringSoon = groupUnits.filter((u) => {
        const { isCritical48h, isWarning7d } = getExpirationMetrics(u.expirationDate);
        return u.status === 'available' && (isCritical48h || isWarning7d);
      }).length;

      return {
        bloodGroup: bg,
        total: groupUnits.length,
        available,
        reserved,
        quarantined,
        expiringSoon,
      };
    });
  }, [units]);

  // Filtered unit rows
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      if (filterGroup !== 'ALL' && u.bloodGroup !== filterGroup) return false;
      if (filterComponent !== 'ALL' && u.component !== filterComponent) return false;
      if (filterStatus === 'EXPIRING') {
        const { isCritical48h, isWarning7d, isExpired } = getExpirationMetrics(u.expirationDate);
        if (!(isCritical48h || isWarning7d || isExpired)) return false;
      } else if (filterStatus !== 'ALL' && u.status !== filterStatus) {
        return false;
      }
      if (searchBarcode.trim()) {
        const q = searchBarcode.toLowerCase();
        return u.bagBarcode.toLowerCase().includes(q) || u.unitId.toLowerCase().includes(q) || u.storageLocation.toLowerCase().includes(q);
      }
      return true;
    });
  }, [units, filterGroup, filterComponent, filterStatus, searchBarcode]);

  // Handle donation intake form submission
  const handleRecordIntake = (e: React.FormEvent) => {
    e.preventDefault();
    const randId = Math.floor(1000 + Math.random() * 9000);
    const expDate = new Date(now + intakeCustomDays * 86400000).toISOString();

    const matchedDonor = donors.find((d) => d.id === intakeDonorId || d.name.toLowerCase() === intakeDonorName.toLowerCase());

    const newUnit: BloodInventoryUnit = {
      unitId: `UNIT-2026-${randId}`,
      bag_id: randId,
      donor_id: intakeDonorId || (matchedDonor ? matchedDonor.id : undefined),
      donor_name: intakeDonorName || (matchedDonor ? matchedDonor.name : undefined),
      bagBarcode: `ISBT128-B${intakeBloodGroup.replace('-', 'N').replace('+', 'P')}-${randId}`,
      bloodGroup: intakeBloodGroup,
      component: intakeComponent,
      volumeMl: intakeVolumeMl,
      collectionDate: new Date(now).toISOString(),
      expirationDate: expDate,
      facilityId: currentHospital.id,
      storageLocation: intakeStorageLocation,
      status: 'available',
      testedClear: intakeScreeningCleared,
      temperatureAlert: false,
    };

    if (onRecordDonation) {
      onRecordDonation(currentHospital.id, newUnit, intakeDonorId || undefined);
    } else if (onAddUnit) {
      onAddUnit(currentHospital.id, newUnit);
    }

    // Persist donation details directly to backend database
    api.storeDonation({
      donorId: intakeDonorId || (matchedDonor ? matchedDonor.id : undefined),
      donorName: intakeDonorName || (matchedDonor ? matchedDonor.name : 'Verified Volunteer Donor'),
      donorBloodGroup: intakeBloodGroup,
      donorWeightKg: matchedDonor?.weightKg,
      donorHemoglobinGdl: matchedDonor?.hemoglobinGdl,
      component: intakeComponent,
      volumeMl: intakeVolumeMl,
      facilityId: currentHospital.id,
      facilityName: currentHospital.name,
      storageLocation: intakeStorageLocation,
      collectionDate: new Date(now).toISOString(),
      expirationDate: expDate,
      testedClear: intakeScreeningCleared,
      temperatureAlert: false,
      phlebotomistStaffId: currentStaffUser?.id || 'STAFF-001',
      phlebotomistStaffName: currentStaffUser?.name || 'Dr. Sarah Sterling',
      notes: `Intake donation processed & verified. Assigned to ${intakeStorageLocation}.`,
    })
      .then((record) => {
        setBackendDonations((prev) => [record, ...prev]);
        setBackendFeedback(`Donation details successfully stored in backend database! (Record ID: ${record.donationId})`);
        setTimeout(() => setBackendFeedback(null), 8000);
      })
      .catch((err) => {
        console.warn('Backend storage notification:', err);
      });

    // Reset form
    setIntakeDonorName('');
    setIntakeDonorId('');
    setActiveSubTab('inventory');
  };

  // Actions on individual units
  const handleUpdateUnitStatus = (unitId: string, newStatus: BloodInventoryUnit['status']) => {
    if (onUpdateUnitStatus) {
      onUpdateUnitStatus(currentHospital.id, unitId, newStatus);
    } else if (onUpdateHospitalUnits) {
      const updated = units.map((u) => (u.unitId === unitId ? { ...u, status: newStatus } : u));
      onUpdateHospitalUnits(currentHospital.id, updated);
    }
  };

  const handlePrioritizeExpiringUnit = (unitId: string) => {
    // Flag or reserve for nearest surgery or transfer
    handleUpdateUnitStatus(unitId, 'reserved');
  };

  return (
    <div className="space-y-6">
      {/* Staff Authentication Status Header */}
      {currentStaffUser ? (
        <div className="bg-slate-900 text-white px-5 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-sm">{currentStaffUser.name}</span>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                  {currentStaffUser.id}
                </span>
                <span className="text-slate-400 text-xs">· {currentStaffUser.role}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Hospital License: <code className="font-mono text-slate-300 font-semibold">{currentStaffUser.licenseNo}</code> · Facility: <strong className="text-slate-300">{currentStaffUser.hospitalName}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <span className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-semibold bg-emerald-950/70 border border-emerald-800 px-2.5 py-1 rounded-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Backend Authenticated
            </span>
            {onRequestStaffAuth && (
              <button
                onClick={onRequestStaffAuth}
                className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer whitespace-nowrap"
              >
                Switch Account
              </button>
            )}
            {onStaffLogout && (
              <button
                onClick={onStaffLogout}
                className="px-3 py-1 text-xs font-bold text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-600 rounded-lg transition-colors border border-rose-800/80 hover:border-rose-600 cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-sm"
                title={`Log out of ${currentStaffUser.name}`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 text-white px-5 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">Guest Staff Mode</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Operating in unauthenticated mode. Log in to authenticate clinical donations and sign dispatch audits in MongoDB.
              </div>
            </div>
          </div>
          {onRequestStaffAuth && (
            <button
              onClick={onRequestStaffAuth}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm self-start sm:self-auto"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In to Account</span>
            </button>
          )}
        </div>
      )}

      {/* Backend Feedback Alert */}
      {backendFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{backendFeedback}</span>
          </div>
          <button
            onClick={() => setActiveSubTab('backend_donations')}
            className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
          >
            View in Backend Vault →
          </button>
        </div>
      )}

      {/* Top Hospital Switcher & Cold Vault Status Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600">
              <Building2 className="w-4 h-4" />
              <span>Hospital Blood Inventory Management Module</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <label htmlFor="hospitalSelect" className="text-sm font-bold text-slate-700">
                Facility Depot:
              </label>
              <select
                id="hospitalSelect"
                value={selectedHospitalId}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 font-bold text-base rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — ({h.zone}) [{h.facilityType}]
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentHospital.address}</span>
              <span>·</span>
              <span className="font-mono">Pneumatic dispatch lead time: {currentHospital.leadTimeMinutes} mins</span>
              <span>·</span>
              <span className="font-mono text-slate-600 font-semibold">{currentHospital.accreditationId}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => (onOpenQrScanner ? onOpenQrScanner() : setIsQrScannerOpen(true))}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-400 hover:text-rose-600 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Camera QR code scanner for instant blood bag status updates and stock intake"
            >
              <QrCode className="w-4 h-4 text-rose-600" />
              <span>Scan Bag QR</span>
            </button>

            <button
              onClick={() => setActiveSubTab('intake')}
              className="px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Record Incoming Donation</span>
            </button>

            <button
              onClick={onTriggerEmergencyModal}
              className="px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Zap className="w-4 h-4" />
              <span>STAT Cross-Match</span>
            </button>
          </div>
        </div>

        {/* Facility Telemetry Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <div className="text-slate-500">Ready Bank Stock</div>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5 tabular-nums">
              {units.filter((u) => u.status === 'available' && u.testedClear).length}{' '}
              <span className="text-xs font-normal text-slate-500">/ {units.length} total</span>
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <div className="text-slate-500">Cold Chain Vault</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-xl font-bold font-mono tabular-nums ${
                  currentHospital.coldChainStatus === 'optimal' ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {currentHospital.coldChainTempC.toFixed(1)}°C
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  currentHospital.coldChainStatus === 'optimal'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {currentHospital.coldChainStatus}
              </span>
            </div>
          </div>

          <div className={`p-2.5 rounded-lg border ${flaggedExpiringUnits.length > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
            <div className="text-slate-500 flex items-center justify-between">
              <span>Flagged Expiration Horizon</span>
              {flaggedExpiringUnits.length > 0 && (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              )}
            </div>
            <div className="text-xl font-bold font-mono text-amber-800 mt-0.5 tabular-nums">
              {flaggedExpiringUnits.length}{' '}
              <span className="text-xs font-normal text-amber-700">units &lt;7 days</span>
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <div className="text-slate-500">In Transit & Reserved</div>
            <div className="text-xl font-bold font-mono text-slate-800 mt-0.5 tabular-nums">
              {currentHospital.inTransitUnits + currentHospital.reservedUnits}u
            </div>
          </div>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'inventory'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Bank Stock & Units ({units.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('expiring')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'expiring'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Nearing Expiration Watchlist ({flaggedExpiringUnits.length})</span>
            {flaggedExpiringUnits.length > 0 && (
              <span className="px-1.5 py-0.2 bg-white text-rose-600 text-[10px] font-mono rounded font-bold">
                ALERT
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('intake')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'intake'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Intake Donation Log</span>
          </button>

          <button
            onClick={() => setActiveSubTab('backend_donations')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'backend_donations'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>MongoDB Donations Vault ({backendDonations.length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-mono hidden sm:inline">
          Depot ID: {currentHospital.id}
        </div>
      </div>

      {/* Sub-Tab 1: Stock Levels by Blood Group Cards */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-6">
          {/* Blood Group Grid for this hospital */}
          <div>
            <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
              <h3 className="text-sm font-bold text-slate-900">
                Current Stock Levels by Blood Type ({currentHospital.name})
              </h3>
              <span className="font-mono">ABO/Rh Inventory Matrix</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {stockByGroup.map((bgStat) => {
                const isSelected = filterGroup === bgStat.bloodGroup;
                const isZero = bgStat.available === 0;

                return (
                  <button
                    key={bgStat.bloodGroup}
                    type="button"
                    onClick={() => setFilterGroup(isSelected ? 'ALL' : bgStat.bloodGroup)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-rose-600 bg-rose-50/60 ring-2 ring-rose-500/20'
                        : isZero
                        ? 'border-rose-200 bg-rose-50/20 hover:border-rose-300'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black font-mono text-slate-900">
                        {bgStat.bloodGroup}
                      </span>
                      {bgStat.expiringSoon > 0 && (
                        <span className="w-2 h-2 rounded-full bg-amber-500" title="Has unit expiring soon"></span>
                      )}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                        {bgStat.available}
                      </span>
                      <span className="text-[11px] text-slate-500">ready</span>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400 font-mono">
                      {bgStat.reserved > 0 ? `${bgStat.reserved} reserved` : `${bgStat.total} total`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                <Filter className="w-3.5 h-3.5" />
                <span>Filters:</span>
              </div>

              {/* Group filter dropdown */}
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-mono font-bold"
              >
                <option value="ALL">All Groups</option>
                {ALL_BLOOD_GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              {/* Component filter */}
              <select
                value={filterComponent}
                onChange={(e) => setFilterComponent(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800"
              >
                <option value="ALL">All Components</option>
                {ALL_COMPONENTS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="available">Available (Ready)</option>
                <option value="EXPIRING">Nearing Expiry Flagged</option>
                <option value="reserved">Reserved</option>
                <option value="quarantined">Quarantined</option>
                <option value="in_transit">In Transit</option>
              </select>

              {(filterGroup !== 'ALL' || filterComponent !== 'ALL' || filterStatus !== 'ALL') && (
                <button
                  onClick={() => {
                    setFilterGroup('ALL');
                    setFilterComponent('ALL');
                    setFilterStatus('ALL');
                  }}
                  className="text-slate-400 hover:text-slate-700 underline text-[11px]"
                >
                  Reset filters
                </button>
              )}
            </div>

            {/* Scan Bag Trigger & Barcode Search */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => (onOpenQrScanner ? onOpenQrScanner() : setIsQrScannerOpen(true))}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                title="Scan bag QR with camera"
              >
                <QrCode className="w-3.5 h-3.5 text-rose-600" />
                <span>Scan Bag</span>
              </button>

              <div className="relative w-full md:w-60">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search barcode or location..."
                  value={searchBarcode}
                  onChange={(e) => setSearchBarcode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Units Inventory Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">ISBT Barcode / ID</th>
                    <th className="py-2.5 px-3">Blood Group</th>
                    <th className="py-2.5 px-3">Component Type</th>
                    <th className="py-2.5 px-3">Volume</th>
                    <th className="py-2.5 px-3">Vault Location</th>
                    <th className="py-2.5 px-3">Expiration Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No inventory units match the active filters for this facility.
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((unit) => {
                      const { diffHours, diffDays, isCritical48h, isWarning7d, isExpired } = getExpirationMetrics(unit.expirationDate);

                      return (
                        <tr key={unit.unitId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <Barcode className="w-3.5 h-3.5 text-slate-400" />
                              <span>{unit.bagBarcode}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono font-normal">
                              {unit.unitId}
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="font-mono font-black text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-xs">
                              {unit.bloodGroup}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {unit.component}
                          </td>

                          <td className="py-2.5 px-3 font-mono tabular-nums">
                            {unit.volumeMl} mL
                          </td>

                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {unit.storageLocation}
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="font-mono text-slate-800">
                              {unit.expirationDate.slice(0, 10)}
                            </div>
                            {isExpired ? (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded font-mono">
                                EXPIRED ({Math.abs(diffDays)}d ago)
                              </span>
                            ) : isCritical48h ? (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded font-mono animate-pulse">
                                CRITICAL: {diffHours}h left
                              </span>
                            ) : isWarning7d ? (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-mono">
                                Expiring: {diffDays} days
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Safe ({diffDays}d)
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                                unit.status === 'available'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : unit.status === 'reserved'
                                  ? 'bg-amber-100 text-amber-800'
                                  : unit.status === 'quarantined'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {unit.status}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedUnitForQr(unit)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="View / Print Scannable ISBT-128 QR Tag"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                              {unit.status === 'available' && (isCritical48h || isWarning7d) && (
                                <button
                                  onClick={() => handlePrioritizeExpiringUnit(unit.unitId)}
                                  className="px-2 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded cursor-pointer"
                                  title="Prioritize for immediate surgical use before expiration"
                                >
                                  Prioritize
                                </button>
                              )}
                              {unit.status === 'available' && (
                                <button
                                  onClick={() => handleUpdateUnitStatus(unit.unitId, 'quarantined')}
                                  className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                                  title="Quarantine unit for re-testing or investigation"
                                >
                                  Quarantine
                                </button>
                              )}
                              {unit.status === 'quarantined' && (
                                <button
                                  onClick={() => handleUpdateUnitStatus(unit.unitId, 'available')}
                                  className="px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                                  title="Release from quarantine"
                                >
                                  Release
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Nearing Expiration Watchlist */}
      {activeSubTab === 'expiring' && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Critical Expiration Risk Mitigation Protocol</span>
            </div>
            <p className="text-amber-800 mt-1">
              Short shelf-life components (Platelets have a maximum 5-day lifespan) must be prioritized for active elective surgeries or transferred to high-volume Level 1 trauma centers to prevent clinical wastage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flaggedExpiringUnits.length === 0 ? (
              <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-900">Zero Units At Expiration Risk</h4>
                <p className="text-xs text-slate-500 mt-1">
                  All stored units in {currentHospital.name} have more than 7 days of certified stability remaining.
                </p>
              </div>
            ) : (
              flaggedExpiringUnits.map((unit) => {
                const { diffHours, diffDays, isCritical48h, isExpired } = getExpirationMetrics(unit.expirationDate);

                return (
                  <div
                    key={unit.unitId}
                    className={`bg-white rounded-xl border p-4 transition-all ${
                      isExpired
                        ? 'border-rose-300 ring-1 ring-rose-200'
                        : isCritical48h
                        ? 'border-amber-300 ring-1 ring-amber-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black font-mono text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                          {unit.bloodGroup}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{unit.component}</h4>
                          <span className="font-mono text-[11px] text-slate-400">{unit.bagBarcode}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                          isExpired
                            ? 'bg-rose-100 text-rose-800'
                            : isCritical48h
                            ? 'bg-rose-100 text-rose-700 animate-pulse'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isExpired
                          ? 'EXPIRED'
                          : isCritical48h
                          ? `${diffHours}h REMAINING`
                          : `${diffDays} DAYS REMAINING`}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400">Vault Location:</span>
                        <div className="font-mono text-slate-800 mt-0.5">{unit.storageLocation}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Expiration Timestamp:</span>
                        <div className="font-mono text-slate-800 mt-0.5">
                          {unit.expirationDate.slice(0, 16).replace('T', ' ')} UTC
                        </div>
                      </div>
                    </div>

                    {/* Expiration Actions */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Recommended Action:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePrioritizeExpiringUnit(unit.unitId)}
                          className="px-2.5 py-1 text-xs font-bold text-slate-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Prioritize for OR-4
                        </button>
                        <button
                          onClick={() => handleUpdateUnitStatus(unit.unitId, 'discarded')}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Discard Unit
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Intake Incoming Blood Donation Form */}
      {activeSubTab === 'intake' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-3xl mx-auto space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-rose-600" />
              <span>Record Incoming Blood Donation</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registers new blood units into {currentHospital.name} cold vault with automated ISBT-128 barcode assignment and cryptographic ledger signature.
            </p>
          </div>

          <form onSubmit={handleRecordIntake} className="space-y-4 text-xs">
            {/* Donor metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Donor Full Name (or Anonymous ID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rachel Adams or DONOR-008"
                  value={intakeDonorName}
                  onChange={(e) => setIntakeDonorName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Donor National Registry Number / Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. REG-9942 or +1 (555) 234-9988"
                  value={intakeDonorId}
                  onChange={(e) => setIntakeDonorId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>

            {/* Blood Type & Component */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Blood Group (ABO/Rh)
                </label>
                <select
                  value={intakeBloodGroup}
                  onChange={(e) => setIntakeBloodGroup(e.target.value as BloodGroup)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono font-bold text-rose-600"
                >
                  {ALL_BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Blood Component Form
                </label>
                <select
                  value={intakeComponent}
                  onChange={(e) => {
                    const c = e.target.value as BloodComponent;
                    setIntakeComponent(c);
                    if (c.includes('Platelets')) {
                      setIntakeCustomDays(5);
                      setIntakeStorageLocation('Platelet Agitator Rack 2 (22°C)');
                    } else if (c.includes('Plasma') || c.includes('Cryo')) {
                      setIntakeCustomDays(365);
                      setIntakeStorageLocation('Deep-Freeze Cryo B-04 (-22°C)');
                    } else {
                      setIntakeCustomDays(42);
                      setIntakeStorageLocation('Cold Storage Vault Bay A (3.6°C)');
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-800"
                >
                  {ALL_COMPONENTS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Volume Collected (mL)
                </label>
                <input
                  type="number"
                  value={intakeVolumeMl}
                  onChange={(e) => setIntakeVolumeMl(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-slate-800"
                />
              </div>
            </div>

            {/* Storage Vault Location & Expiration calculation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assigned Vault / Shelf Location
                </label>
                <input
                  type="text"
                  value={intakeStorageLocation}
                  onChange={(e) => setIntakeStorageLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Shelf-Life Stability Duration (Days)
                </label>
                <input
                  type="number"
                  value={intakeCustomDays}
                  onChange={(e) => setIntakeCustomDays(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-slate-800"
                />
                <div className="text-[11px] text-slate-500 mt-1">
                  Expiration date will automatically be set to:{' '}
                  <span className="font-mono font-bold text-slate-800">
                    {new Date(now + intakeCustomDays * 86400000).toISOString().slice(0, 10)}
                  </span>
                </div>
              </div>
            </div>

            {/* Pathogen screening check */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">Molecular Pathogen Screening Verification</span>
                <span className="text-[11px] text-slate-500">
                  HIV-1/2, Hepatitis B/C NAT, Syphilis, and West Nile Virus rapid panel
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={intakeScreeningCleared}
                  onChange={(e) => setIntakeScreeningCleared(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="font-bold text-emerald-700 text-xs">Cleared & Negative</span>
              </label>
            </div>

            {/* Submit */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('inventory')}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Log Intake & Issue ISBT Barcode
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub-Tab 4: Backend Stored Donation Records */}
      {activeSubTab === 'backend_donations' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Database className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  MongoDB Backend Stored Donation Vault
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold">
                  MongoDB Collection: donations
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Every blood donation intake recorded at the hospital cold bank is stored permanently in the MongoDB backend database with donor parameters, phlebotomist authentication, and ISBT-128 barcoding.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshBackendDonations}
                disabled={isLoadingBackendDonations}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackendDonations ? 'animate-spin' : ''}`} />
                <span>Sync with Backend</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('intake')}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record New Donation</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Donation ID</th>
                    <th className="py-3 px-4">Bag Barcode & ID</th>
                    <th className="py-3 px-4">Donor Details</th>
                    <th className="py-3 px-4">Blood Group</th>
                    <th className="py-3 px-4">Volume & Component</th>
                    <th className="py-3 px-4">Collection Date</th>
                    <th className="py-3 px-4">Receiving Staff</th>
                    <th className="py-3 px-4">Storage Location</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {backendDonations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                        No backend donation records found. Use the "Record Incoming Donation" button to store a new donation.
                      </td>
                    </tr>
                  ) : (
                    backendDonations.map((d) => (
                      <tr key={d.donationId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-blue-700">{d.donationId}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{d.bagBarcode}</div>
                          <div className="text-[10px] text-slate-400 font-normal"># bag_id: {d.bagId}</div>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <div className="font-bold text-slate-900">{d.donorName}</div>
                          <div className="font-mono text-[10px] text-slate-400">{d.donorId}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                            {d.donorBloodGroup}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <div className="font-bold text-slate-800">{d.volumeMl} mL</div>
                          <div className="text-[10px] text-slate-500">{d.component}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {d.collectionDate.slice(0, 10)}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <div className="font-semibold text-slate-800">{d.phlebotomistStaffName}</div>
                          <div className="font-mono text-[10px] text-slate-400">{d.phlebotomistStaffId}</div>
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-600 text-[10px]">
                          {d.storageLocation}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-sans ${
                              d.status === 'available'
                                ? 'bg-emerald-100 text-emerald-800'
                                : d.status === 'in_transit'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {d.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Camera-based Blood Bag QR Code Scanner Modal */}
      <BloodBagQrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        hospitals={hospitals}
        currentHospitalId={currentHospital.id}
        onUpdateUnitStatus={onUpdateUnitStatus}
        onAddUnit={onAddUnit}
        onRecordDonation={onRecordDonation}
      />

      {/* ISBT-128 Unit QR Code Bag Tag Viewer / Printer Modal */}
      <UnitQrCodeBadgeModal
        unit={selectedUnitForQr}
        hospitalName={currentHospital.name}
        onClose={() => setSelectedUnitForQr(null)}
      />
    </div>
  );
};
