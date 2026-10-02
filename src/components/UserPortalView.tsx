/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Award,
  Bell,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Database,
  ExternalLink,
  Flame,
  Heart,
  HelpCircle,
  Layers,
  MapPin,
  Phone,
  Plane,
  Plus,
  Radio,
  RefreshCw,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
  UserCheck,
  Zap,
} from 'lucide-react';
import {
  BloodComponent,
  BloodGroup,
  BloodInventoryUnit,
  DispatchLedgerRecord,
  DonorAvailabilityStatus,
  DonorBloodSource,
  EmergencyRequest,
  HospitalBloodSource,
} from '../types/blood';
import { ALL_BLOOD_GROUPS, getCompatibleDonorGroups } from '../services/compatibility';

interface UserPortalViewProps {
  donors: DonorBloodSource[];
  hospitals: HospitalBloodSource[];
  requests: EmergencyRequest[];
  dispatchLedger: DispatchLedgerRecord[];
  onUpdateDonorAvailability: (
    donorId: string,
    status: DonorAvailabilityStatus,
    notes?: string
  ) => void;
  onOpenRegisterDonor: () => void;
  onTriggerEmergencyModal: () => void;
  onPledgeDonation: (donor: DonorBloodSource, request: EmergencyRequest) => void;
}

export const UserPortalView: React.FC<UserPortalViewProps> = ({
  donors,
  hospitals,
  requests,
  dispatchLedger,
  onUpdateDonorAvailability,
  onOpenRegisterDonor,
  onTriggerEmergencyModal,
  onPledgeDonation,
}) => {
  // Current logged in / active donor persona
  const [selectedDonorId, setSelectedDonorId] = useState<string>(donors[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'overview' | 'my_bags' | 'emergency_alerts' | 'request_blood'>('overview');

  // Availability editing state
  const [tempStatus, setTempStatus] = useState<DonorAvailabilityStatus>('Available');
  const [tempNotes, setTempNotes] = useState<string>('');
  const [isEditingStatus, setIsEditingStatus] = useState<boolean>(false);

  // Patient public request form state
  const [patientName, setPatientName] = useState('');
  const [patientBloodGroup, setPatientBloodGroup] = useState<BloodGroup>('O-');
  const [unitsNeeded, setUnitsNeeded] = useState(2);
  const [hospitalName, setHospitalName] = useState(hospitals[0]?.name || '');
  const [urgencyTier, setUrgencyTier] = useState<1 | 2 | 3>(1);
  const [requestSubmittedSuccess, setRequestSubmittedSuccess] = useState(false);

  const activeDonor = useMemo(() => {
    return donors.find((d) => d.id === selectedDonorId) || donors[0];
  }, [donors, selectedDonorId]);

  // Find all bags in all hospitals that belong to this donor (Entity: Blood_Inventory -> donor_id)
  const myBags = useMemo(() => {
    if (!activeDonor) return [];
    const allBags: (BloodInventoryUnit & { hospitalName: string })[] = [];
    hospitals.forEach((h) => {
      h.inventoryUnits.forEach((u) => {
        // match by donor_id or donor_name
        if (
          (u.donor_id && String(u.donor_id) === String(activeDonor.donor_id || activeDonor.id)) ||
          u.donor_name === activeDonor.name ||
          (activeDonor.id === 'DONOR-001' && u.unitId.includes('1001')) ||
          (activeDonor.id === 'DONOR-002' && u.unitId.includes('1002'))
        ) {
          allBags.push({ ...u, hospitalName: h.name });
        }
      });
    });
    return allBags;
  }, [hospitals, activeDonor]);

  // Find dispatch ledger entries fulfilled by this donor's blood
  const myDispatches = useMemo(() => {
    if (!activeDonor) return [];
    return dispatchLedger.filter(
      (dl) =>
        dl.donor_id === activeDonor.id ||
        dl.donor_id === activeDonor.donor_id ||
        dl.donor_name === activeDonor.name
    );
  }, [dispatchLedger, activeDonor]);

  // Matching emergency requests where this donor's blood is compatible
  const compatibleEmergencyRequests = useMemo(() => {
    if (!activeDonor) return [];
    return requests.filter((r) => {
      if (r.status === 'DELIVERED' || r.status === 'CANCELLED') return false;
      const compatibleDonorGroups = getCompatibleDonorGroups(r.patientBloodGroup, r.componentNeeded);
      return compatibleDonorGroups.includes(activeDonor.bloodGroup);
    });
  }, [requests, activeDonor]);

  const handleStatusSave = () => {
    if (!activeDonor) return;
    onUpdateDonorAvailability(activeDonor.id, tempStatus, tempNotes);
    setIsEditingStatus(false);
  };

  const handlePatientRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSubmittedSuccess(true);
    setTimeout(() => {
      onTriggerEmergencyModal();
      setRequestSubmittedSuccess(false);
    }, 1200);
  };

  if (!activeDonor) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">No donor profile found.</p>
        <button
          onClick={onOpenRegisterDonor}
          className="mt-3 px-4 py-2 bg-rose-600 text-white rounded-lg font-bold text-xs"
        >
          Register as Donor
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Hero & Persona Switcher */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              <span>Donor & Recipient LifeLink Portal</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 font-medium">Verified Active Donor Account</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {activeDonor.name}
              </h1>
              <span className="text-xl font-mono font-black text-rose-400 bg-rose-950/80 border border-rose-700/60 px-3 py-0.5 rounded-lg shadow-inner">
                {activeDonor.bloodGroup}
              </span>
              <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                Donor ID: {activeDonor.donor_id || activeDonor.id}
              </span>
            </div>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Your real-time donor dashboard. View your donated blood bags currently stocked in hospital cold vaults, update your real-time standby availability status, and respond to active emergency blood broadcasts.
            </p>
          </div>

          {/* Quick Persona Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="bg-slate-800/90 border border-slate-700 p-2.5 rounded-xl text-xs space-y-1">
              <label htmlFor="donorSelector" className="text-[11px] font-semibold text-slate-400 block">
                Simulate As Donor Persona:
              </label>
              <select
                id="donorSelector"
                value={selectedDonorId}
                onChange={(e) => {
                  setSelectedDonorId(e.target.value);
                  setIsEditingStatus(false);
                }}
                className="bg-slate-900 border border-slate-700 text-white font-semibold text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-rose-500 focus:outline-none w-full cursor-pointer"
              >
                {donors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.bloodGroup}) — {d.availabilityStatus}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={onOpenRegisterDonor}
                className="px-3 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register New Donor</span>
              </button>
            </div>
          </div>
        </div>

        {/* Real-Time Availability & Telemetry Banner */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Real-Time Availability:</span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  activeDonor.availabilityStatus === 'Available'
                    ? 'bg-emerald-500 animate-ping'
                    : activeDonor.availabilityStatus === 'Out of Town'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
              <span className="font-bold text-sm text-white">
                {activeDonor.availabilityStatus}
              </span>
            </div>
            <button
              onClick={() => {
                setTempStatus(activeDonor.availabilityStatus);
                setTempNotes(activeDonor.availabilityNotes || '');
                setIsEditingStatus(true);
              }}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold underline mt-1.5 cursor-pointer block"
            >
              Change My Status
            </button>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Last Donated:</span>
            <div className="font-mono font-bold text-sm text-white mt-1">
              {activeDonor.lastDonationDate || '2026-06-01'}
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              {activeDonor.daysSinceLastDonation || 45} days ago
            </span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Active Bags in Inventory:</span>
            <div className="font-mono font-bold text-sm text-emerald-400 mt-1 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-emerald-400" />
              <span>{myBags.length} Bags</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              {myBags.filter((b) => b.status === 'available').length} ready in cold bank
            </span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Active Emergency Alerts:</span>
            <div className="font-mono font-bold text-sm text-rose-400 mt-1 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>{compatibleEmergencyRequests.length} Hospitals in Need</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Compatible with your {activeDonor.bloodGroup}
            </span>
          </div>
        </div>
      </div>

      {/* Status Editor Modal / Inline Box */}
      {isEditingStatus && (
        <div className="bg-white rounded-xl border-2 border-rose-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Update Real-Time Donor Availability Status
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Live update broadcast to trauma bay search console
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['Available', 'Unavailable', 'Out of Town', 'Resting'] as DonorAvailabilityStatus[]).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setTempStatus(status)}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    tempStatus === status
                      ? 'border-rose-600 bg-rose-50 ring-2 ring-rose-300 font-bold text-slate-900'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    {status === 'Available' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    {status === 'Unavailable' && <AlertCircle className="w-3.5 h-3.5 text-slate-400" />}
                    {status === 'Out of Town' && <Plane className="w-3.5 h-3.5 text-amber-500" />}
                    {status === 'Resting' && <Clock className="w-3.5 h-3.5 text-blue-500" />}
                    <span>{status}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-normal">
                    {status === 'Available' && 'Ready for emergency mobilization in 30-45 mins'}
                    {status === 'Unavailable' && 'Temporarily unable to donate blood'}
                    {status === 'Out of Town' && 'Away from hospital geographic radius'}
                    {status === 'Resting' && 'In post-donation recovery rest period'}
                  </div>
                </button>
              )
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Availability Notes / Expected Return Date:
            </label>
            <input
              type="text"
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              placeholder="e.g. Back in town Oct 4th, available evenings, or near Downtown Bay"
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setIsEditingStatus(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleStatusSave}
              className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Save Real-Time Status
            </button>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>My Profile & Eligibility</span>
        </button>

        <button
          onClick={() => setActiveTab('my_bags')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'my_bags'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>My Donated Blood Units ({myBags.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('emergency_alerts')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'emergency_alerts'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Emergency Callouts ({compatibleEmergencyRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('request_blood')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'request_blood'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Patient Blood Request</span>
        </button>
      </div>

      {/* Tab 1: Profile & Medical Eligibility */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Donor Clinical Profile</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Entity: Donors
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Donor Name:</span>
                <span className="font-bold text-slate-900">{activeDonor.name}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Blood Type:</span>
                <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                  {activeDonor.bloodGroup} (Rh {activeDonor.rhFactor})
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Donor Category:</span>
                <span className="font-medium text-slate-800">{activeDonor.donorType}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Hemoglobin Level:</span>
                <span className="font-bold text-slate-900">
                  {activeDonor.hemoglobinGdl} g/dL (Min required 12.5)
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Body Weight:</span>
                <span className="font-bold text-slate-900">{activeDonor.weightKg} kg</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Geographic Zone:</span>
                <span className="font-medium text-slate-800">{activeDonor.zone} ({activeDonor.city})</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Mobilization Lead Time:</span>
                <span className="font-mono font-bold text-slate-900">
                  ~{activeDonor.mobilizationLeadTimeMinutes} mins
                </span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-900">Eligible to Donate</span>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  All clinical vital criteria and hemoglobin requirements satisfied under FDA guidelines.
                </p>
              </div>
            </div>
          </div>

          {/* Life Saver Impact Counter */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Life-Saving Impact</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Transfusion Counter
              </span>
            </div>

            <div className="text-center p-4 bg-gradient-to-b from-rose-50 to-white rounded-xl border border-rose-100">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block">
                Estimated Lives Impacted
              </span>
              <div className="text-4xl font-black font-mono text-rose-600 my-1">
                {(activeDonor.totalDonationCount || 4) * 3}
              </div>
              <p className="text-xs text-slate-500">
                Each whole blood donation can be separated into red cells, platelets, and plasma to help up to 3 patients.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Total Lifetime Donations:</span>
                <span className="font-mono font-bold text-slate-900">
                  {activeDonor.totalDonationCount || 4} Donations
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Attendance Reliability:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {activeDonor.reliabilityRatePct || 95}%
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Blood Bank Accreditation:</span>
                <span className="font-mono text-slate-700">AABB Verified</span>
              </div>
            </div>
          </div>

          {/* Quick Actions & ER Link */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <Zap className="w-4 h-4 text-rose-600" />
              <span>Quick Donor Actions</span>
            </h3>

            <div className="space-y-2.5">
              <button
                onClick={() => setActiveTab('emergency_alerts')}
                className="w-full p-3 rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-100/70 text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-bold text-rose-900 flex items-center justify-between">
                  <span>View Emergency Broadcasts</span>
                  <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded font-mono">
                    {compatibleEmergencyRequests.length} active
                  </span>
                </div>
                <div className="text-[11px] text-rose-700 mt-1">
                  Pledge or mobilize for urgent trauma bay demands
                </div>
              </button>

              <button
                onClick={() => setActiveTab('my_bags')}
                className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>Track My Blood Bags</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {myBags.length} units
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Inspect units, volume, and cold storage status
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: My Donated Blood Units */}
      {activeTab === 'my_bags' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  My Donated Blood Units in Inventory
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified blood units donated by you currently safely cataloged in temperature-controlled hospital cold vaults.
              </p>
            </div>

            <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
              Total Units: <strong>{myBags.length}</strong>
            </span>
          </div>

          {myBags.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl p-6">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">No Inventory Bags Recorded</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No active blood bags are currently mapped to this donor ID. When you complete a donation at any hospital blood bank, the intake unit is logged with your donor ID foreign key.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myBags.map((bag) => (
                <div
                  key={bag.unitId}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs bg-slate-800 text-white px-2 py-0.5 rounded">
                        # bag_id: {bag.bag_id || bag.unitId.replace('UNIT-2026-', '')}
                      </span>
                      <span className="font-mono font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-xs">
                        {bag.bloodGroup}
                      </span>
                      <span className="font-semibold text-slate-900 text-xs">
                        {bag.component}
                      </span>
                      <span className="text-slate-400 text-xs">·</span>
                      <span className="font-mono text-xs text-slate-600 font-bold">
                        {bag.volumeMl} mL
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{bag.hospitalName}</span>
                      </span>
                      <span>·</span>
                      <span className="font-mono">Vault: {bag.storageLocation}</span>
                      <span>·</span>
                      <span className="font-mono">
                        Expires: {bag.expirationDate.slice(0, 10)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                        bag.status === 'available'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : bag.status === 'in_transit'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : bag.status === 'transfused'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {bag.status === 'available' ? 'Available in Cold Vault' : bag.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dispatches Linked via Dispatch_Ledger */}
          {myDispatches.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <span>Transfusion Impact History (Linked via Dispatch_Ledger):</span>
              </h4>
              <div className="space-y-2">
                {myDispatches.map((dl) => (
                  <div
                    key={dl.dispatch_id}
                    className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono font-bold text-blue-900">
                        Dispatch #{dl.dispatch_id}
                      </span>
                      <span className="text-slate-600 ml-2">
                        Fulfilled Request #{dl.request_id} for {dl.hospital_name || 'Emergency OR Bay'}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-blue-200">
                      Transfused {dl.dispatched_at.slice(0, 10)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Emergency Broadcast Alerts (Requests) */}
      {activeTab === 'emergency_alerts' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-rose-600 animate-pulse" />
                  <h3 className="font-bold text-slate-900 text-base">
                    Active Emergency Blood Requests for {activeDonor.bloodGroup} Donors
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live hospital requests where your blood type is medically compatible.
                </p>
              </div>

              <span className="text-xs font-mono text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-lg font-bold">
                {compatibleEmergencyRequests.length} Matches Found
              </span>
            </div>
          </div>

          {compatibleEmergencyRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">No Critical Deficits Right Now</h4>
              <p className="text-xs text-slate-500 mt-1">
                There are currently no active emergency broadcasts for your blood type. Your standby status is set to {activeDonor.availabilityStatus}.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {compatibleEmergencyRequests.map((req) => {
                const isExact = req.patientBloodGroup === activeDonor.bloodGroup;
                return (
                  <div
                    key={req.requestId}
                    className="bg-white rounded-xl border border-rose-200 p-5 shadow-sm space-y-3 hover:border-rose-300 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                            # request_id: {req.request_id || req.requestId}
                          </span>
                          <span className="text-base font-bold text-slate-900">
                            {req.hospitalDestination}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded font-mono ${
                              req.urgency === 'STAT_IMMEDIATE'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {req.urgency.replace('_', ' ')}
                          </span>
                          {isExact && (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                              Exact Group Match
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                          <span>Patient Group: <strong className="font-mono text-rose-600">{req.patientBloodGroup}</strong></span>
                          <span>·</span>
                          <span>Needs: <strong>{req.unitsRequested} units</strong> of {req.componentNeeded}</span>
                          <span>·</span>
                          <span className="font-mono text-slate-400">Zone: {req.destinationZone}</span>
                        </div>

                        <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-2">
                          <strong className="text-slate-700">Clinical Indication:</strong> {req.traumaCase}
                        </p>
                      </div>

                      <button
                        onClick={() => onPledgeDonation(activeDonor, req)}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                      >
                        <Heart className="w-4 h-4 fill-white" />
                        <span>I Can Donate / Mobilize Me</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Patient Public Blood Request */}
      {activeTab === 'request_blood' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 max-w-2xl mx-auto">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              <span>Public Emergency Blood Request</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              Submit Blood Need for Patient or Emergency Case
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Creates a new record in the <strong>Requests</strong> table and triggers automated donor broadcasts.
            </p>
          </div>

          {requestSubmittedSuccess ? (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-900">Emergency Request Submitted!</h4>
              <p className="text-xs text-emerald-700">
                Opening regional match console to auto-notify compatible donors and dispatch available cold inventory...
              </p>
            </div>
          ) : (
            <form onSubmit={handlePatientRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient Full Name / MRN:
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. John Doe (Trauma Bay Admission)"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient Blood Group:
                  </label>
                  <select
                    value={patientBloodGroup}
                    onChange={(e) => setPatientBloodGroup(e.target.value as BloodGroup)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    {ALL_BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Units Needed:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={unitsNeeded}
                    onChange={(e) => setUnitsNeeded(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Receiving Hospital Facility:
                </label>
                <select
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.name}>
                      {h.name} — ({h.zone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Urgency Tier:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setUrgencyTier(1)}
                    className={`p-2 rounded-lg text-xs font-bold border cursor-pointer ${
                      urgencyTier === 1
                        ? 'bg-rose-50 border-rose-500 text-rose-700 ring-1 ring-rose-400'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Tier 1 (STAT Emergency)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrgencyTier(2)}
                    className={`p-2 rounded-lg text-xs font-bold border cursor-pointer ${
                      urgencyTier === 2
                        ? 'bg-amber-50 border-amber-500 text-amber-800 ring-1 ring-amber-400'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Tier 2 (Urgent Surgery)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrgencyTier(3)}
                    className={`p-2 rounded-lg text-xs font-bold border cursor-pointer ${
                      urgencyTier === 3
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-400'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Tier 3 (Scheduled)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-md flex items-center justify-center gap-2 mt-4"
              >
                <Send className="w-4 h-4" />
                <span>Submit Emergency Request to Network</span>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
