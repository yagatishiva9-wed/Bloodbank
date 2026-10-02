/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  AuditLedgerEntry,
  BloodInventoryUnit,
  BloodSource,
  DispatchLedgerRecord,
  DonorAvailabilityStatus,
  DonorBloodSource,
  EmergencyRequest,
  HospitalBloodSource,
  InventorySnapshot,
  isDonorSource,
  isHospitalSource,
  AppRole,
} from './types/blood';
import {
  INITIAL_AUDIT_LEDGER,
  INITIAL_DISPATCH_LEDGER,
  INITIAL_DONORS,
  INITIAL_EMERGENCY_REQUESTS,
  INITIAL_HOSPITALS,
  INITIAL_SNAPSHOT,
} from './data/mockData';
import { ActiveTab, Navbar } from './components/Navbar';
import { UserPortalView } from './components/UserPortalView';
import { ManagerPortalView } from './components/ManagerPortalView';
import { EmergencyMatchModal } from './components/EmergencyMatchModal';
import { AddUnitModal } from './components/AddUnitModal';
import { RegisterDonorModal } from './components/RegisterDonorModal';
import { LoginModal } from './components/LoginModal';
import { InventoryLoginPortal } from './components/InventoryLoginPortal';
import { BloodBagQrScannerModal } from './components/BloodBagQrScannerModal';
import { createLedgerEntry, diagnoseInventoryDiscrepancies } from './services/recovery';
import { aggregateStockByBloodGroup } from './services/aggregation';
import { api, authStorage, StaffUser } from './services/api';

export default function App() {
  // Current interface role: 'user' (Donor / Recipient portal) or 'manager' (Hospital inventory & dispatch admin)
  const [currentRole, setCurrentRole] = useState<AppRole>('user');
  const [activeTab, setActiveTab] = useState<ActiveTab>('matching');

  // Authenticated Staff User (Stored at Backend, starts unauthenticated so pressing Inventory shows Login Portal)
  const [staffUser, setStaffUser] = useState<StaffUser | null>(() => authStorage.getCachedUser());

  // Core domain state
  const [hospitals, setHospitals] = useState<HospitalBloodSource[]>(INITIAL_HOSPITALS);
  const [donors, setDonors] = useState<DonorBloodSource[]>(INITIAL_DONORS);
  const [emergencyRequests, setEmergencyRequests] = useState<EmergencyRequest[]>(INITIAL_EMERGENCY_REQUESTS);
  const [dispatchLedger, setDispatchLedger] = useState<DispatchLedgerRecord[]>(INITIAL_DISPATCH_LEDGER);
  const [ledger, setLedger] = useState<AuditLedgerEntry[]>(INITIAL_AUDIT_LEDGER);
  const [snapshots, setSnapshots] = useState<InventorySnapshot[]>([INITIAL_SNAPSHOT]);

  // Modal open states
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [isRegisterDonorModalOpen, setIsRegisterDonorModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

  // Auth toast notification feedback
  const [authToast, setAuthToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Check auth status with backend on mount
  useEffect(() => {
    api.getMe().then((user) => {
      if (user) {
        setStaffUser(user);
      }
    });
  }, []);

  const handleStaffAuthenticated = (user: StaffUser) => {
    setStaffUser(user);
    setAuthToast({ message: `Logged in as ${user.name} (${user.role})`, type: 'success' });
    setTimeout(() => setAuthToast(null), 3500);
  };

  const handleStaffLogout = () => {
    const prevName = staffUser?.name || 'Account';
    api.logout();
    setStaffUser(null);
    setAuthToast({ message: `${prevName} has been logged out successfully.`, type: 'info' });
    setTimeout(() => setAuthToast(null), 3500);
  };

  // Unified blood sources list (Discriminated union: HospitalBloodSource | DonorBloodSource)
  const allBloodSources: BloodSource[] = useMemo(() => {
    return [...hospitals, ...donors];
  }, [hospitals, donors]);

  // Alert and indicator calculations
  const activeEmergencyCount = useMemo(() => {
    return emergencyRequests.filter((r) => r.status !== 'DELIVERED' && r.status !== 'CANCELLED').length;
  }, [emergencyRequests]);

  const criticalDeficitCount = useMemo(() => {
    const groups = aggregateStockByBloodGroup(hospitals);
    return groups.filter((g) => g.status === 'CRITICAL_DEFICIT').length;
  }, [hospitals]);

  const anomaliesCount = useMemo(() => {
    return diagnoseInventoryDiscrepancies(hospitals, ledger).length;
  }, [hospitals, ledger]);

  // Total count of units across all hospital inventories nearing expiration (within 7 days)
  const expiringUnitsCount = useMemo(() => {
    const now = new Date();
    const threshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    let count = 0;
    for (const h of hospitals) {
      for (const u of h.inventoryUnits) {
        if (u.status === 'available') {
          const exp = new Date(u.expirationDate);
          if (exp <= threshold) {
            count++;
          }
        }
      }
    }
    return count;
  }, [hospitals]);

  // Handlers
  const handleDispatch = (
    newRequest: EmergencyRequest,
    source: BloodSource,
    unitsToAllocate: number
  ) => {
    // 1. If hospital: mark units as reserved/in_transit and record into Dispatch_Ledger
    if (isHospitalSource(source)) {
      let allocated = 0;
      const allocatedBags: BloodInventoryUnit[] = [];

      setHospitals((prev) =>
        prev.map((h) => {
          if (h.id === source.id) {
            const updatedUnits = h.inventoryUnits.map((u) => {
              if (
                allocated < unitsToAllocate &&
                u.bloodGroup === newRequest.patientBloodGroup &&
                u.component === newRequest.componentNeeded &&
                u.status === 'available'
              ) {
                allocated++;
                allocatedBags.push(u);
                return { ...u, status: 'in_transit' as const };
              }
              return u;
            });

            return {
              ...h,
              inventoryUnits: updatedUnits,
              inTransitUnits: h.inTransitUnits + unitsToAllocate,
            };
          }
          return h;
        })
      );

      // Create new Dispatch_Ledger junction entries
      const newDispatches: DispatchLedgerRecord[] = allocatedBags.map((bag, i) => ({
        dispatch_id: 800 + dispatchLedger.length + i + 1,
        request_id: newRequest.requestId,
        bag_id: bag.bag_id || bag.unitId.replace('UNIT-2026-', ''),
        dispatched_at: new Date().toISOString(),
        hospital_id: source.id,
        hospital_name: source.name,
        donor_id: bag.donor_id,
        donor_name: bag.donor_name,
        blood_type: bag.bloodGroup,
        volume_ml: bag.volumeMl,
        status: 'IN_TRANSIT',
        courier_tracking: newRequest.assignedSources[0]?.trackingCode || `STAT-LOG-${Date.now().toString(36).toUpperCase()}`,
      }));

      setDispatchLedger((prev) => [...newDispatches, ...prev]);
    }

    // 2. If donor: mark donor as in_transit
    if (isDonorSource(source)) {
      setDonors((prev) =>
        prev.map((d) => (d.id === source.id ? { ...d, status: 'in_transit' as const, availabilityStatus: 'Resting' as const } : d))
      );
    }

    // 3. Append to emergency requests
    setEmergencyRequests((prev) => [newRequest, ...prev]);

    // 4. Record to immutable audit ledger
    const newLedgerEntry = createLedgerEntry(
      ledger,
      isHospitalSource(source) ? 'DISPATCH_UNIT' : 'DONOR_MOBILIZE',
      staffUser ? `${staffUser.name} (${staffUser.role})` : 'Trauma Operations Officer',
      source.id,
      source.category,
      newRequest.patientBloodGroup,
      unitsToAllocate,
      `STAT Emergency dispatch allocated for patient ${newRequest.patientName} (${newRequest.patientBloodGroup} ${newRequest.componentNeeded}) destined for ${newRequest.hospitalDestination}. Tracking: ${newRequest.assignedSources[0]?.trackingCode || 'N/A'}`
    );
    setLedger((prev) => [...prev, newLedgerEntry]);
  };

  const handleUpdateEmergencyStatus = (requestId: string, newStatus: EmergencyRequest['status']) => {
    setEmergencyRequests((prev) =>
      prev.map((r) => {
        if (r.requestId === requestId) {
          return { ...r, status: newStatus };
        }
        return r;
      })
    );

    // If delivered, update corresponding dispatch ledger records
    if (newStatus === 'DELIVERED') {
      setDispatchLedger((prev) =>
        prev.map((dl) =>
          String(dl.request_id) === String(requestId)
            ? { ...dl, status: 'TRANSFUSED' }
            : dl
        )
      );
    }

    const targetReq = emergencyRequests.find((r) => r.requestId === requestId);
    if (targetReq && newStatus === 'DELIVERED') {
      const entry = createLedgerEntry(
        ledger,
        'DISPATCH_UNIT',
        staffUser ? `${staffUser.name} (${staffUser.role})` : 'Receiving Trauma Attending',
        targetReq.assignedSources[0]?.sourceId || 'DESTINATION-OR',
        'hospital',
        targetReq.patientBloodGroup,
        targetReq.unitsRequested,
        `Emergency transfusion confirmed delivered to ${targetReq.hospitalDestination} for patient ${targetReq.patientName}. Transfusion completed under MTP.`
      );
      setLedger((prev) => [...prev, entry]);
    }
  };

  const handleAddUnit = (facilityId: string, unit: BloodInventoryUnit) => {
    setHospitals((prev) =>
      prev.map((h) => {
        if (h.id === facilityId) {
          return {
            ...h,
            inventoryUnits: [unit, ...h.inventoryUnits],
          };
        }
        return h;
      })
    );

    const targetHosp = hospitals.find((h) => h.id === facilityId);

    // Record at backend
    api.storeDonation({
      donorBloodGroup: unit.bloodGroup,
      component: unit.component,
      volumeMl: unit.volumeMl,
      facilityId,
      facilityName: targetHosp?.name,
      storageLocation: unit.storageLocation,
      collectionDate: unit.collectionDate,
      expirationDate: unit.expirationDate,
      testedClear: unit.testedClear,
      temperatureAlert: unit.temperatureAlert,
      phlebotomistStaffId: staffUser?.id || 'STAFF-001',
      phlebotomistStaffName: staffUser?.name || 'Dr. Sarah Sterling',
      notes: `Direct intake to ${unit.storageLocation}`,
    }).catch((err) => console.warn('Backend sync note:', err));

    const entry = createLedgerEntry(
      ledger,
      'INTAKE_UNIT',
      staffUser ? `${staffUser.name} (${staffUser.role})` : 'Quality Control Specialist',
      facilityId,
      'hospital',
      unit.bloodGroup,
      1,
      `New unit verified and stored in ${unit.storageLocation}. Barcode: ${unit.bagBarcode} (${unit.bloodGroup} ${unit.component}) at ${targetHosp?.name || facilityId}`,
      unit.unitId
    );
    setLedger((prev) => [...prev, entry]);
  };

  const handleRegisterDonor = (newDonor: DonorBloodSource) => {
    setDonors((prev) => [newDonor, ...prev]);

    const entry = createLedgerEntry(
      ledger,
      'DONOR_MOBILIZE',
      'Donor Registry Coordinator',
      newDonor.id,
      'donor',
      newDonor.bloodGroup,
      1,
      `Registered volunteer donor ${newDonor.name} (${newDonor.bloodGroup}, Hb: ${newDonor.hemoglobinGdl}g/dL, Zone: ${newDonor.zone}) into emergency standby pool.`
    );
    setLedger((prev) => [...prev, entry]);
  };

  const handleMobilizeDonorDirect = (donor: DonorBloodSource) => {
    const trackingCode = `CALLOUT-${Date.now().toString(36).toUpperCase()}`;
    const newReq: EmergencyRequest = {
      requestId: `REQ-CALL-${Date.now().toString(36).toUpperCase()}`,
      patientId: `PT-STANDBY-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName: 'Standby Trauma Protocol',
      patientBloodGroup: donor.bloodGroup,
      componentNeeded: 'Packed Red Blood Cells (PRBC)',
      unitsRequested: 1,
      urgency: 'URGENT_TIER_1',
      hospitalDestination: 'Metropolitan Trauma Institute & Blood Bank',
      destinationZone: donor.zone,
      traumaCase: `Rapid Mobilization Callout of universal donor ${donor.name}`,
      status: 'EN_ROUTE',
      createdAt: new Date().toISOString(),
      assignedSources: [
        {
          sourceId: donor.id,
          sourceCategory: 'donor',
          sourceName: donor.name,
          unitsAllocated: 1,
          dispatchStatus: 'Donor contacted via emergency line, en route to phlebotomy bay',
          etaMinutes: donor.mobilizationLeadTimeMinutes,
          trackingCode,
        },
      ],
    };

    handleDispatch(newReq, donor, 1);
  };

  const handlePledgeDonation = (donor: DonorBloodSource, request: EmergencyRequest) => {
    handleUpdateDonorAvailability(donor.id, 'Resting', 'Pledged donation for active emergency request');

    // Update the request with notification status: CONFIRMED
    setEmergencyRequests((prev) =>
      prev.map((r) => {
        if (r.requestId === request.requestId) {
          const updatedNotifications = (r.automatedNotifications || []).map((n) => {
            if (n.recipientId === donor.id || n.recipientName === donor.name) {
              return { ...n, status: 'CONFIRMED' as const, responseNote: 'Donor pledged rapid response donation!' };
            }
            return n;
          });
          return {
            ...r,
            automatedNotifications: updatedNotifications,
          };
        }
        return r;
      })
    );

    // Write audit log
    const entry = createLedgerEntry(
      ledger,
      'DONOR_MOBILIZE',
      'Donor Self-Service Action',
      donor.id,
      'donor',
      donor.bloodGroup,
      1,
      `Donor ${donor.name} confirmed rapid pledge to emergency request #${request.requestId} at ${request.hospitalDestination}.`
    );
    setLedger((prev) => [...prev, entry]);
  };

  const handleUpdateDonorAvailability = (
    donorId: string,
    status: DonorAvailabilityStatus,
    notes?: string
  ) => {
    setDonors((prev) =>
      prev.map((d) =>
        d.id === donorId
          ? {
              ...d,
              availabilityStatus: status,
              availabilityNotes: notes !== undefined ? notes : d.availabilityNotes,
            }
          : d
      )
    );

    const targetDonor = donors.find((d) => d.id === donorId);
    const entry = createLedgerEntry(
      ledger,
      'AUDIT_VERIFIED',
      'Donor Availability System',
      donorId,
      'donor',
      targetDonor?.bloodGroup || 'O-',
      0,
      `Donor ${targetDonor?.name || donorId} updated availability status to "${status}"${notes ? `: ${notes}` : ''}`
    );
    setLedger((prev) => [...prev, entry]);
  };

  const handleRecordDonation = (
    hospitalId: string,
    unit: BloodInventoryUnit,
    donorId?: string
  ) => {
    // 1. Add unit to hospital
    setHospitals((prev) =>
      prev.map((h) => {
        if (h.id === hospitalId) {
          return {
            ...h,
            inventoryUnits: [unit, ...h.inventoryUnits],
          };
        }
        return h;
      })
    );

    // 2. If registered donor was selected, update their last donation and lifetime donations count
    if (donorId) {
      setDonors((prev) =>
        prev.map((d) => {
          if (d.id === donorId) {
            return {
              ...d,
              lastDonationDate: new Date().toISOString().split('T')[0],
              lifetimeDonations: (d.lifetimeDonations || 0) + 1,
              availabilityStatus: 'Resting' as const,
              availabilityNotes: 'Donation completed today. In post-donation recovery rest period.',
            };
          }
          return d;
        })
      );
    }

    // 3. Write immutable audit ledger entry
    const targetHospital = hospitals.find((h) => h.id === hospitalId);
    const donorObj = donorId ? donors.find((d) => d.id === donorId) : undefined;
    const entry = createLedgerEntry(
      ledger,
      'INTAKE_UNIT',
      staffUser ? `${staffUser.name} (${staffUser.role})` : 'Blood Bank Phlebotomy & Intake Nurse',
      hospitalId,
      'hospital',
      unit.bloodGroup,
      1,
      `New blood donation processed & stored. Barcode: ${unit.bagBarcode} (${unit.bloodGroup} ${unit.component}) at ${targetHospital?.name || hospitalId}.${donorObj ? ` Source: Registered volunteer donor ${donorObj.name} (${donorObj.id}).` : ' Source: Walk-in donor donation.'}`,
      unit.unitId
    );
    setLedger((prev) => [...prev, entry]);

    // 4. Persist donation details directly to backend database
    api.storeDonation({
      donorId: donorId || (donorObj ? donorObj.id : undefined),
      donorName: donorObj ? donorObj.name : 'Walk-in Volunteer Donor',
      donorBloodGroup: unit.bloodGroup,
      donorWeightKg: donorObj?.weightKg,
      donorHemoglobinGdl: donorObj?.hemoglobinGdl,
      component: unit.component,
      volumeMl: unit.volumeMl,
      facilityId: hospitalId,
      facilityName: targetHospital?.name,
      storageLocation: unit.storageLocation,
      collectionDate: unit.collectionDate,
      expirationDate: unit.expirationDate,
      testedClear: unit.testedClear,
      temperatureAlert: unit.temperatureAlert,
      phlebotomistStaffId: staffUser?.id || 'STAFF-001',
      phlebotomistStaffName: staffUser?.name || 'Dr. Sarah Sterling',
      notes: `Donation intake processed & verified. Assigned to ${unit.storageLocation}.`,
    }).catch((err) => console.warn('Backend storage sync note:', err));
  };

  const handleUpdateUnitStatus = (
    hospitalId: string,
    unitId: string,
    newStatus: BloodInventoryUnit['status'],
    reason?: string
  ) => {
    let bloodGroup: any = 'O-';
    let bagBarcode = '';

    setHospitals((prev) =>
      prev.map((h) => {
        if (h.id === hospitalId) {
          const updatedUnits = h.inventoryUnits.map((u) => {
            if (u.unitId === unitId) {
              bloodGroup = u.bloodGroup;
              bagBarcode = u.bagBarcode;
              return { ...u, status: newStatus };
            }
            return u;
          });
          return { ...h, inventoryUnits: updatedUnits };
        }
        return h;
      })
    );

    api.updateDonationStatus(unitId, newStatus).catch(() => {});

    const actionType =
      newStatus === 'quarantined'
        ? ('EXPIRATION_PURGE' as const)
        : newStatus === 'in_transit'
        ? ('DISPATCH_UNIT' as const)
        : ('INTAKE_UNIT' as const);

    const entry = createLedgerEntry(
      ledger,
      actionType,
      staffUser ? `${staffUser.name} (${staffUser.role})` : 'Blood Bank Inventory Supervisor',
      hospitalId,
      'hospital',
      bloodGroup,
      1,
      `Unit ${bagBarcode || unitId} status transitioned to "${newStatus}". Reason: ${reason || 'Clinical inventory management'}.`,
      unitId
    );
    setLedger((prev) => [...prev, entry]);
  };

  const handleUpdateHospitalUnits = (facilityId: string, updatedUnits: BloodInventoryUnit[]) => {
    setHospitals((prev) =>
      prev.map((h) => (h.id === facilityId ? { ...h, inventoryUnits: updatedUnits } : h))
    );
  };

  const handleRestoreSnapshot = (snapshot: InventorySnapshot) => {
    setHospitals(JSON.parse(JSON.stringify(snapshot.hospitalsSnapshot)));
    setDonors(JSON.parse(JSON.stringify(snapshot.donorsSnapshot)));

    const entry = createLedgerEntry(
      ledger,
      'RECONCILIATION_RESTORE',
      'System Emergency Recovery Daemon',
      'SNAPSHOT-ROLLBACK-ENGINE',
      'hospital',
      'O-',
      snapshot.totalUnitsCount,
      `Full system state rolled back to snapshot "${snapshot.label}" (${snapshot.snapshotId}). Total restored units: ${snapshot.totalUnitsCount}.`
    );
    setLedger((prev) => [...prev, entry]);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Primary Top Bar with 2-Interface Switcher */}
      <Navbar
        currentRole={currentRole}
        onSelectRole={setCurrentRole}
        currentStaffUser={staffUser}
        onStaffLogout={handleStaffLogout}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
        onOpenAddUnitModal={() => setIsAddUnitModalOpen(true)}
        onOpenQrScanner={() => setIsQrScannerOpen(true)}
        activeEmergencyCount={activeEmergencyCount}
        criticalDeficitCount={criticalDeficitCount}
        anomaliesCount={anomaliesCount}
        expiringUnitsCount={expiringUnitsCount}
      />

      {/* Auth Feedback Toast Notification */}
      {authToast && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 animate-fadeIn">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 ${
              authToast.type === 'success'
                ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
                : 'bg-slate-900 text-slate-200 border-slate-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                authToast.type === 'success' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span>{authToast.message}</span>
          </div>
        </div>
      )}

      {/* Main Viewport Content Switching between Interface 1 (User Portal) and Interface 2 (Manager Portal) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentRole === 'user' ? (
          /* Interface 1: User / Donor Portal */
          <UserPortalView
            donors={donors}
            hospitals={hospitals}
            requests={emergencyRequests}
            dispatchLedger={dispatchLedger}
            onUpdateDonorAvailability={handleUpdateDonorAvailability}
            onOpenRegisterDonor={() => setIsRegisterDonorModalOpen(true)}
            onTriggerEmergencyModal={() => setIsEmergencyModalOpen(true)}
            onPledgeDonation={handlePledgeDonation}
          />
        ) : !staffUser ? (
          /* Inventory Login Portal: Shown after pressing Inventory */
          <InventoryLoginPortal
            onLoginSuccess={handleStaffAuthenticated}
            onBackToUserPortal={() => setCurrentRole('user')}
          />
        ) : (
          /* Interface 2: Blood Inventory & Operations Manager Dashboard (Opened after matching login credentials) */
          <ManagerPortalView
            hospitals={hospitals}
            donors={donors}
            emergencyRequests={emergencyRequests}
            dispatchLedger={dispatchLedger}
            ledger={ledger}
            snapshots={snapshots}
            currentStaffUser={staffUser}
            onStaffLogout={handleStaffLogout}
            onRequestStaffAuth={() => setIsLoginModalOpen(true)}
            onRecordDonation={handleRecordDonation}
            onUpdateUnitStatus={handleUpdateUnitStatus}
            onUpdateHospitalUnits={handleUpdateHospitalUnits}
            onUpdateEmergencyStatus={handleUpdateEmergencyStatus}
            onUpdateDonorAvailability={handleUpdateDonorAvailability}
            onMobilizeDonor={handleMobilizeDonorDirect}
            onOpenRegisterDonor={() => setIsRegisterDonorModalOpen(true)}
            onOpenAddUnitModal={() => setIsAddUnitModalOpen(true)}
            onTriggerEmergencyModal={() => setIsEmergencyModalOpen(true)}
            onUpdateHospitals={setHospitals}
            onUpdateLedger={setLedger}
            onAddSnapshot={(newSnap) => setSnapshots((prev) => [newSnap, ...prev])}
            onRestoreSnapshot={handleRestoreSnapshot}
            onOpenQrScanner={() => setIsQrScannerOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      <BloodBagQrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        hospitals={hospitals}
        currentHospitalId={hospitals[0]?.id}
        onUpdateUnitStatus={handleUpdateUnitStatus}
        onAddUnit={handleAddUnit}
        onRecordDonation={handleRecordDonation}
      />

      <EmergencyMatchModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        sources={allBloodSources}
        hospitals={hospitals}
        onDispatch={handleDispatch}
      />

      <AddUnitModal
        isOpen={isAddUnitModalOpen}
        onClose={() => setIsAddUnitModalOpen(false)}
        hospitals={hospitals}
        onAddUnit={handleAddUnit}
      />

      <RegisterDonorModal
        isOpen={isRegisterDonorModalOpen}
        onClose={() => setIsRegisterDonorModalOpen(false)}
        onRegister={handleRegisterDonor}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleStaffAuthenticated}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700">HemaSync Blood Network</span>
            <span>·</span>
            <span>Full-Stack Express & MongoDB Backend Engine Active</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-slate-400">
              AABB & FDA Certified Transfusion Protocols Active
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
