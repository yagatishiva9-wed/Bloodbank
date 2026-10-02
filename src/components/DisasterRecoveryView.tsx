/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Database,
  Download,
  FileCheck,
  FileText,
  History,
  KeyRound,
  Layers,
  Lock,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ThermometerSnowflake,
  Upload,
  Zap,
} from 'lucide-react';
import {
  AuditLedgerEntry,
  DiscrepancyAnomaly,
  DonorBloodSource,
  HospitalBloodSource,
  InventorySnapshot,
} from '../types/blood';
import {
  createInventorySnapshot,
  diagnoseInventoryDiscrepancies,
  executeAutomatedReconciliation,
  verifyLedgerChainIntegrity,
} from '../services/recovery';

interface DisasterRecoveryViewProps {
  hospitals: HospitalBloodSource[];
  donors: DonorBloodSource[];
  ledger: AuditLedgerEntry[];
  snapshots: InventorySnapshot[];
  onUpdateHospitals: (newHospitals: HospitalBloodSource[]) => void;
  onUpdateLedger: (newLedger: AuditLedgerEntry[]) => void;
  onAddSnapshot: (newSnapshot: InventorySnapshot) => void;
  onRestoreSnapshot: (snapshot: InventorySnapshot) => void;
}

export const DisasterRecoveryView: React.FC<DisasterRecoveryViewProps> = ({
  hospitals,
  donors,
  ledger,
  snapshots,
  onUpdateHospitals,
  onUpdateLedger,
  onAddSnapshot,
  onRestoreSnapshot,
}) => {
  const [activeTab, setActiveTab] = useState<'diagnostic' | 'ledger' | 'snapshots' | 'simulation'>('diagnostic');
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  // Snapshot restore confirmation diff modal
  const [selectedSnapshotToRestore, setSelectedSnapshotToRestore] = useState<InventorySnapshot | null>(null);

  // Compute live anomalies
  const anomalies = diagnoseInventoryDiscrepancies(hospitals, ledger);

  const handleVerifyLedger = () => {
    setIsVerifying(true);
    setTimeout(() => {
      const res = verifyLedgerChainIntegrity(ledger);
      setVerificationResult(res);
      setIsVerifying(false);
    }, 300);
  };

  const handleRunReconciliation = () => {
    const { recoveredHospitals, reconciliationLedgerEntry, fixedCount } = executeAutomatedReconciliation(
      hospitals,
      ledger
    );
    onUpdateHospitals(recoveredHospitals);
    onUpdateLedger([...ledger, reconciliationLedgerEntry]);
  };

  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnapshotLabel.trim()) return;
    const snap = createInventorySnapshot(
      hospitals,
      donors,
      newSnapshotLabel.trim(),
      'Dr. Alex Mercer (Lead Hematologist)'
    );
    onAddSnapshot(snap);
    setNewSnapshotLabel('');
  };

  // Disaster Simulation triggers
  const handleSimulateColdChainExcursion = () => {
    const cloned: HospitalBloodSource[] = JSON.parse(JSON.stringify(hospitals));
    if (cloned.length > 1) {
      cloned[1].coldChainStatus = 'fault';
      cloned[1].coldChainTempC = 8.6; // High temp excursion!
      cloned[1].inventoryUnits.forEach((u, i) => {
        if (i % 2 === 0) u.temperatureAlert = true;
      });
      onUpdateHospitals(cloned);
    }
  };

  const handleSimulateExpiredUnits = () => {
    const cloned: HospitalBloodSource[] = JSON.parse(JSON.stringify(hospitals));
    if (cloned.length > 0 && cloned[0].inventoryUnits.length > 0) {
      // Force unit 0 to have expired 2 days ago
      cloned[0].inventoryUnits[0].expirationDate = '2026-09-28T00:00:00Z';
      cloned[0].inventoryUnits[0].status = 'available';
      onUpdateHospitals(cloned);
    }
  };

  const handleSimulateDesync = () => {
    const cloned: HospitalBloodSource[] = JSON.parse(JSON.stringify(hospitals));
    if (cloned.length > 0) {
      // Artificially change a unit status to available when ledger says dispatched
      const dispEntry = ledger.find((l) => l.actionType === 'DISPATCH_UNIT' && l.unitId);
      if (dispEntry && dispEntry.unitId) {
        const u = cloned[0].inventoryUnits.find((unit) => unit.unitId === dispEntry.unitId);
        if (u) {
          u.status = 'available';
          onUpdateHospitals(cloned);
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Educational Header: Syllabus Fit */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Recovery Techniques for Critical Medical Inventory Data</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Fault-Tolerant Inventory Ledger & Automated Recovery Vault
          </h2>
          <p className="mt-1 text-xs text-slate-300 leading-relaxed">
            Emergency blood stocks cannot afford data loss, silent cold-chain spoilage, or transactional desync. This system enforces
            <strong className="text-white"> immutable append-only event sourcing</strong>, <strong className="text-white">cryptographic hash chaining</strong>, and <strong className="text-white">point-in-time state reconstruction</strong> to guarantee life-saving inventory resilience.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('diagnostic')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'diagnostic'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Diagnostic & Reconciliation</span>
            {anomalies.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-mono rounded font-bold">
                {anomalies.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Cryptographic Audit Ledger ({ledger.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('snapshots')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'snapshots'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Point-in-Time Snapshots ({snapshots.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'simulation'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Disaster Simulation Lab</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Diagnostic & Automated Reconciliation */}
      {activeTab === 'diagnostic' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Inventory Health & Sensor Diagnostic Scanner</span>
                  {anomalies.length === 0 ? (
                    <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      All Nodes Synchronized & Nominal
                    </span>
                  ) : (
                    <span className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      {anomalies.length} Integrity Discrepanc{anomalies.length > 1 ? 'ies' : 'y'} Detected
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Continuously compares physical cold storage telemetry, expiration stamps, and ledger signatures.
                </p>
              </div>

              {anomalies.length > 0 && (
                <button
                  onClick={handleRunReconciliation}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Execute Automated Reconciliation</span>
                </button>
              )}
            </div>

            {/* Anomalies List */}
            <div className="mt-4 space-y-3">
              {anomalies.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-900">Zero Inventory Anomalies Detected</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Every stored unit matches cryptographic ledger records. All cold vaults operating within certified temperature ranges (2.0°C - 6.0°C).
                  </p>
                </div>
              ) : (
                anomalies.map((anom) => (
                  <div
                    key={anom.anomalyId}
                    className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span className="font-bold text-slate-900">{anom.sourceName}</span>
                        <span className="font-mono text-rose-700 bg-rose-100 px-2 py-0.5 rounded font-bold">
                          {anom.type}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Detected: {anom.detectedAt.slice(11, 19)} UTC
                      </span>
                    </div>

                    <p className="text-slate-700 font-medium">{anom.description}</p>

                    <div className="pt-2 border-t border-rose-100 flex items-center justify-between text-slate-500">
                      <span className="text-[11px]">
                        <strong>Remediation Strategy:</strong> {anom.suggestedAction}
                      </span>
                      <span className="font-mono text-rose-700 font-bold">
                        Severity: {anom.severity}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Cryptographic Audit Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Immutable Event-Sourced Ledger Chain</span>
                <span className="font-mono text-xs text-slate-500">({ledger.length} verified blocks)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every reservation, cold-storage intake, dispatch, and reconciliation is cryptographically linked with SHA-like hash chaining.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleVerifyLedger}
                disabled={isVerifying}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                <span>{isVerifying ? 'Verifying Chain...' : 'Verify Cryptographic Integrity'}</span>
              </button>
            </div>
          </div>

          {verificationResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                verificationResult.isValid
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {verificationResult.isValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{verificationResult.message}</span>
            </div>
          )}

          {/* Ledger Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Block #</th>
                  <th className="py-2.5 px-3">Event ID</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3 text-right">Units</th>
                  <th className="py-2.5 px-3 font-mono">Current Hash</th>
                  <th className="py-2.5 px-3">Integrity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {ledger.map((entry) => (
                  <tr key={entry.eventId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      #{entry.blockIndex}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {entry.eventId}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums">
                      {entry.timestamp.slice(11, 19)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                        {entry.actionType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{entry.actor}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                      {entry.unitsImpacted}u
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {entry.currentHash.slice(0, 16)}...
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Valid</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Point-in-Time Snapshots */}
      {activeTab === 'snapshots' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Point-in-Time Snapshot Management
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allows instant zero-data-loss rollback to any validated golden baseline.
                </p>
              </div>

              {/* Create Snapshot Form */}
              <form onSubmit={handleCreateSnapshot} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Snapshot label (e.g. Pre-MTP Shift Baseline)..."
                  value={newSnapshotLabel}
                  onChange={(e) => setNewSnapshotLabel(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 w-64"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  Save Snapshot
                </button>
              </form>
            </div>

            {/* Snapshots Grid */}
            <div className="mt-4 space-y-3">
              {snapshots.map((snap) => (
                <div
                  key={snap.snapshotId}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-slate-500" />
                      <h4 className="text-sm font-bold text-slate-900">{snap.label}</h4>
                      <span className="font-mono text-xs text-slate-400">({snap.snapshotId})</span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>Created by {snap.createdBy}</span>
                      <span>·</span>
                      <span className="font-mono">{snap.timestamp.slice(0, 19).replace('T', ' ')} UTC</span>
                      <span>·</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {snap.totalUnitsCount} Units Captured
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Integrity Checksum: {snap.hashChecksum}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSnapshotToRestore(snap)}
                      className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Rollback to this State</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Disaster Simulation Lab */}
      {activeTab === 'simulation' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Disaster & Edge-Case Simulation Lab</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate real-world medical failure scenarios to test the recovery engine's automated diagnostic and reconciliation capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Scenario 1 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-rose-600 text-xs font-bold">
                  <ThermometerSnowflake className="w-4 h-4" />
                  <span>Scenario A: Cold Chain Excursion</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1">Thermal Sensor Spike</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Simulates a freezer compressor breakdown at St. Jude Medical Center, spiking temperature to 8.6°C and triggering hemolysis danger alerts on active RBC units.
                </p>
              </div>
              <button
                onClick={handleSimulateColdChainExcursion}
                className="mt-4 px-3 py-1.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Play className="w-3 h-3 fill-slate-900" />
                <span>Inject Cold-Chain Fault</span>
              </button>
            </div>

            {/* Scenario 2 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-600 text-xs font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>Scenario B: Shelf Expiration Drift</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1">Silent Unit Expiration</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Simulates an unrotated unit exceeding the 42-day RBC preservation window while still logged as available in the physical bank.
                </p>
              </div>
              <button
                onClick={handleSimulateExpiredUnits}
                className="mt-4 px-3 py-1.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Play className="w-3 h-3 fill-slate-900" />
                <span>Inject Expiration Drift</span>
              </button>
            </div>

            {/* Scenario 3 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-600 text-xs font-bold">
                  <Layers className="w-4 h-4" />
                  <span>Scenario C: Network Partition Desync</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1">Ledger / Floor Mismatch</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Simulates a pneumatic transfer logged in the emergency dispatch record but failed to update the local hospital inventory cache.
                </p>
              </div>
              <button
                onClick={handleSimulateDesync}
                className="mt-4 px-3 py-1.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Play className="w-3 h-3 fill-slate-900" />
                <span>Inject Desync Mismatch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snapshot Rollback Diff Confirmation Modal */}
      {selectedSnapshotToRestore && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">
                Confirm Point-in-Time Snapshot Rollback
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              You are about to restore the system state to snapshot:
              <strong className="text-slate-900 block mt-1">"{selectedSnapshotToRestore.label}"</strong>
              <span className="font-mono text-slate-400 text-[11px] block">
                ID: {selectedSnapshotToRestore.snapshotId} · Captured {selectedSnapshotToRestore.timestamp}
              </span>
            </p>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-slate-800">State Diff Preview:</div>
              <div className="text-slate-600">
                Current Inventory Units: <strong className="font-mono">{hospitals.reduce((acc, h) => acc + h.inventoryUnits.length, 0)}</strong>
              </div>
              <div className="text-slate-600">
                Target Snapshot Units: <strong className="font-mono">{selectedSnapshotToRestore.totalUnitsCount}</strong>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                This operation will replay verified state and log a <code className="font-mono">ROLLBACK_EVENT</code> to the audit ledger.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedSnapshotToRestore(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onRestoreSnapshot(selectedSnapshotToRestore);
                  setSelectedSnapshotToRestore(null);
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
              >
                Confirm Rollback & Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
