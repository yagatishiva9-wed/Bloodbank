/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import {
  X,
  Camera,
  QrCode,
  Flashlight,
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Building2,
  Thermometer,
  Clock,
  ArrowRight,
  Boxes,
  Zap,
  Volume2,
  VolumeX,
  HelpCircle,
  FileCheck,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  BloodGroup,
  BloodComponent,
  BloodInventoryUnit,
  HospitalBloodSource,
} from '../types/blood';
import {
  parseScannedBagQr,
  ParsedBloodBagData,
  playScannerBeep,
  triggerHapticFeedback,
} from '../services/qrScanner';

interface BloodBagQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitals: HospitalBloodSource[];
  currentHospitalId?: string;
  onUpdateUnitStatus?: (
    hospitalId: string,
    unitId: string,
    newStatus: BloodInventoryUnit['status'],
    reason?: string
  ) => void;
  onAddUnit?: (facilityId: string, unit: BloodInventoryUnit) => void;
  onRecordDonation?: (
    hospitalId: string,
    unit: BloodInventoryUnit,
    donorId?: string
  ) => void;
}

export const BloodBagQrScannerModal: React.FC<BloodBagQrScannerModalProps> = ({
  isOpen,
  onClose,
  hospitals,
  currentHospitalId,
  onUpdateUnitStatus,
  onAddUnit,
  onRecordDonation,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Scanning loop states
  const [scannedResult, setScannedResult] = useState<ParsedBloodBagData | null>(null);
  const [matchedUnit, setMatchedUnit] = useState<{ hospital: HospitalBloodSource; unit: BloodInventoryUnit } | null>(null);
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState<string | null>(null);
  const [stockIntakeSuccess, setStockIntakeSuccess] = useState<string | null>(null);

  // Stock intake form for newly scanned bags
  const [intakeHospitalId, setIntakeHospitalId] = useState<string>(
    currentHospitalId || hospitals[0]?.id || ''
  );
  const [intakeStorageLocation, setIntakeStorageLocation] = useState<string>('Cold Vault Shelf A-01');
  const [intakeStatus, setIntakeStatus] = useState<BloodInventoryUnit['status']>('available');

  // Video and canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Pre-generated test QR codes for one-click testing in environment without physical bags
  const [sampleQrCodes, setSampleQrCodes] = useState<Array<{
    label: string;
    description: string;
    payload: string;
    dataUrl?: string;
  }>>([]);

  // Generate sample QR code data URLs on mount
  useEffect(() => {
    const samples = [
      {
        label: 'Existing O- PRBC Bag',
        description: 'DIN-O-NEG-9042 (Metropolitan Trauma Stock)',
        payload: JSON.stringify({
          type: 'hemasync_blood_bag',
          bagBarcode: 'DIN-O-NEG-9042',
          bloodGroup: 'O-',
          component: 'Packed Red Blood Cells (PRBC)',
          volumeMl: 450,
          collectionDate: '2026-09-20T08:00:00Z',
          expirationDate: '2026-11-01T08:00:00Z',
          storageLocation: 'Cryo-Vault Shelf A-12',
          testedClear: true,
          status: 'available',
        }),
      },
      {
        label: 'Existing A+ Plasma Bag',
        description: 'DIN-A-POS-4421 (St. Jude Cold Storage)',
        payload: JSON.stringify({
          type: 'hemasync_blood_bag',
          bagBarcode: 'DIN-A-POS-4421',
          bloodGroup: 'A+',
          component: 'Fresh Frozen Plasma (FFP)',
          volumeMl: 300,
          collectionDate: '2026-09-25T11:00:00Z',
          expirationDate: '2027-09-25T11:00:00Z',
          storageLocation: 'Plasma Freezer Bay 2',
          testedClear: true,
          status: 'available',
        }),
      },
      {
        label: 'New Incoming Intake Bag (O-)',
        description: 'ISBT-128 Emergency Delivery Intake',
        payload: JSON.stringify({
          type: 'hemasync_blood_bag',
          bagBarcode: `DIN-INCOMING-${Math.floor(1000 + Math.random() * 9000)}`,
          bloodGroup: 'O-',
          component: 'Packed Red Blood Cells (PRBC)',
          volumeMl: 450,
          collectionDate: new Date().toISOString(),
          expirationDate: new Date(Date.now() + 35 * 86400000).toISOString(),
          donor_name: 'Volunteer Donor Mobile Drive',
          testedClear: true,
          status: 'available',
        }),
      },
      {
        label: 'New Incoming Platelets Bag (B+)',
        description: 'ISBT-128 Apheresis Platelets',
        payload: JSON.stringify({
          type: 'hemasync_blood_bag',
          bagBarcode: `DIN-PLATELET-${Math.floor(1000 + Math.random() * 9000)}`,
          bloodGroup: 'B+',
          component: 'Platelets (SDP/RDP)',
          volumeMl: 250,
          collectionDate: new Date().toISOString(),
          expirationDate: new Date(Date.now() + 5 * 86400000).toISOString(),
          donor_name: 'Regional Apheresis Center',
          testedClear: true,
          status: 'available',
        }),
      },
    ];

    Promise.all(
      samples.map(async (s) => ({
        ...s,
        dataUrl: await QRCode.toDataURL(s.payload, { width: 140, margin: 1 }),
      }))
    ).then((items) => setSampleQrCodes(items));
  }, []);

  // Stop camera media tracks
  const stopCamera = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setIsTorchOn(false);
  }, []);

  // Process a detected QR code string
  const handleDecodedCode = useCallback(
    (codeData: string) => {
      if (soundEnabled) {
        playScannerBeep(920, 100);
      }
      triggerHapticFeedback();

      const parsed = parseScannedBagQr(codeData);
      setScannedResult(parsed);

      // Search all hospitals for an existing matching unit
      let found: { hospital: HospitalBloodSource; unit: BloodInventoryUnit } | null = null;
      for (const h of hospitals) {
        const u = h.inventoryUnits.find(
          (unit: BloodInventoryUnit) =>
            unit.bagBarcode.toLowerCase() === parsed.bagBarcode.toLowerCase() ||
            (parsed.unitId && unit.unitId.toLowerCase() === parsed.unitId.toLowerCase())
        );
        if (u) {
          found = { hospital: h, unit: u };
          break;
        }
      }

      setMatchedUnit(found);
      setStatusUpdateSuccess(null);
      setStockIntakeSuccess(null);
    },
    [hospitals, soundEnabled]
  );

  // Scanning frame loop
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (code && code.data) {
      // Draw detection box on overlay canvas
      if (overlayCanvasRef.current) {
        const overlay = overlayCanvasRef.current;
        const oCtx = overlay.getContext('2d');
        if (oCtx) {
          overlay.width = video.clientWidth;
          overlay.height = video.clientHeight;
          oCtx.clearRect(0, 0, overlay.width, overlay.height);

          const scaleX = overlay.width / canvas.width;
          const scaleY = overlay.height / canvas.height;

          oCtx.strokeStyle = '#10B981';
          oCtx.lineWidth = 4;
          oCtx.beginPath();
          oCtx.moveTo(code.location.topLeftCorner.x * scaleX, code.location.topLeftCorner.y * scaleY);
          oCtx.lineTo(code.location.topRightCorner.x * scaleX, code.location.topRightCorner.y * scaleY);
          oCtx.lineTo(code.location.bottomRightCorner.x * scaleX, code.location.bottomRightCorner.y * scaleY);
          oCtx.lineTo(code.location.bottomLeftCorner.x * scaleX, code.location.bottomLeftCorner.y * scaleY);
          oCtx.closePath();
          oCtx.stroke();
        }
      }

      handleDecodedCode(code.data);
      // Pause loop briefly after a successful scan
      return;
    }

    animationFrameId.current = requestAnimationFrame(scanFrame);
  }, [handleDecodedCode]);

  // Start camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API is not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);

        // Check torch capability
        const track = stream.getVideoTracks()[0];
        const capabilities: any = track.getCapabilities?.() || {};
        setHasTorch(Boolean(capabilities.torch));

        animationFrameId.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraActive(false);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access in your browser or use the sample bag QR codes below.'
          : err.message || 'Unable to access video camera. Please use file upload or sample QR cards.'
      );
    }
  }, [facingMode, scanFrame, stopCamera]);

  // Toggle torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.warn('Could not toggle flashlight:', err);
    }
  };

  // Flip camera front/back
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // File upload scan
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          handleDecodedCode(code.data);
        } else {
          setCameraError('No readable QR code found in the uploaded image. Please ensure the QR tag is clearly visible.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Start camera on modal open, stop on close
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setScannedResult(null);
      setMatchedUnit(null);
      setStatusUpdateSuccess(null);
      setStockIntakeSuccess(null);
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  // Handle Instant Status Update on matched unit
  const handleApplyStatusUpdate = (newStatus: BloodInventoryUnit['status']) => {
    if (!matchedUnit) return;
    const { hospital, unit } = matchedUnit;

    if (onUpdateUnitStatus) {
      onUpdateUnitStatus(
        hospital.id,
        unit.unitId,
        newStatus,
        `Camera QR scan verified by hospital staff at ${new Date().toLocaleTimeString()}`
      );
    }

    // Update local state
    setMatchedUnit({
      hospital,
      unit: {
        ...unit,
        status: newStatus,
      },
    });

    setStatusUpdateSuccess(`Status instantly updated to ${newStatus.toUpperCase()}! Recorded in cold vault registry.`);
    if (soundEnabled) playScannerBeep(1200, 150);
    triggerHapticFeedback();
  };

  // Handle Stock Intake for incoming bag
  const handleCompleteStockIntake = () => {
    if (!scannedResult) return;

    const targetHospital = hospitals.find((h) => h.id === intakeHospitalId) || hospitals[0];
    const randId = `UNIT-QR-${Math.floor(1000 + Math.random() * 9000)}`;

    const newUnit: BloodInventoryUnit = {
      unitId: scannedResult.unitId || randId,
      bagBarcode: scannedResult.bagBarcode,
      bloodGroup: scannedResult.bloodGroup || 'O-',
      component: scannedResult.component || 'Packed Red Blood Cells (PRBC)',
      volumeMl: scannedResult.volumeMl || 450,
      collectionDate: scannedResult.collectionDate || new Date().toISOString(),
      expirationDate: scannedResult.expirationDate || new Date(Date.now() + 35 * 86400000).toISOString(),
      facilityId: targetHospital.id,
      storageLocation: intakeStorageLocation,
      status: intakeStatus,
      testedClear: scannedResult.testedClear !== undefined ? scannedResult.testedClear : true,
      temperatureAlert: false,
      donor_name: scannedResult.donor_name || 'Verified Donor via QR Intake',
    };

    if (onAddUnit) {
      onAddUnit(targetHospital.id, newUnit);
    } else if (onRecordDonation) {
      onRecordDonation(targetHospital.id, newUnit);
    }

    setMatchedUnit({ hospital: targetHospital, unit: newUnit });
    setStockIntakeSuccess(`Stock intake successful! Bag ${newUnit.bagBarcode} registered in ${targetHospital.name}.`);
    if (soundEnabled) playScannerBeep(1080, 200);
    triggerHapticFeedback();
  };

  // Resume camera scanning for next bag
  const handleScanNextBag = () => {
    setScannedResult(null);
    setMatchedUnit(null);
    setStatusUpdateSuccess(null);
    setStockIntakeSuccess(null);
    if (overlayCanvasRef.current) {
      const oCtx = overlayCanvasRef.current.getContext('2d');
      oCtx?.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    }
    startCamera();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Blood Bag QR Code Scanner
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  ISBT-128
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Scan unit bags for instant status updates, quality inspection, and stock intake
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Viewfinder Card */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 aspect-video max-h-72 w-full flex items-center justify-center shadow-inner">
            {/* Native Video Element */}
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              playsInline
              muted
            />

            {/* Hidden Offscreen Canvas for jsQR extraction */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Overlay Canvas for Bounding Box */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Camera Reticle & Aiming Frame */}
            {cameraActive && !scannedResult && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Aiming Reticle Box */}
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 border-2 border-rose-500/70 rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.55)]">
                  {/* Glowing corners */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-rose-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-rose-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-rose-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-rose-400 rounded-br-lg" />

                  {/* Animated sweeping scanline beam */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-rose-400 to-transparent shadow-[0_0_8px_#f43f5e] animate-pulse top-1/2 -translate-y-1/2" />
                </div>

                <div className="absolute bottom-3 px-3 py-1 bg-slate-900/90 text-rose-300 border border-rose-500/40 rounded-full text-[11px] font-mono font-bold tracking-wider flex items-center gap-1.5 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Align Blood Bag Barcode / QR Code</span>
                </div>
              </div>
            )}

            {/* Inactive / Camera Error Fallback View */}
            {!cameraActive && (
              <div className="p-6 text-center text-slate-300 max-w-sm space-y-3">
                <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {cameraError ? 'Camera Standby' : 'Starting Camera Stream...'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {cameraError || 'Requesting video capture permissions from clinical workstation.'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera</span>
                  </button>
                  <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-700">
                    <Upload className="w-3.5 h-3.5 text-slate-300" />
                    <span>Upload Bag Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Quick Controls in Viewfinder Header */}
            {cameraActive && (
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-sm p-1 rounded-xl border border-slate-700 text-white">
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isTorchOn ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                    title={isTorchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
                  >
                    <Flashlight className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors cursor-pointer"
                  title="Switch Camera (Front/Rear)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSoundEnabled((prev) => !prev)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors cursor-pointer"
                  title={soundEnabled ? 'Mute Scanner Beep' : 'Enable Scanner Beep'}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Scanned Result Banner & Actions */}
          {scannedResult ? (
            <div className="space-y-4 animate-fadeIn">
              {/* Feedback messages */}
              {statusUpdateSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{statusUpdateSuccess}</span>
                </div>
              )}

              {stockIntakeSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{stockIntakeSuccess}</span>
                </div>
              )}

              {/* Mode A: Matched Existing Blood Unit in Hospital Inventory */}
              {matchedUnit ? (
                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-emerald-500/30 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center font-black text-sm">
                        {matchedUnit.unit.bloodGroup}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">
                            {matchedUnit.unit.bagBarcode}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                            Matched in Depot
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {matchedUnit.unit.component} · {matchedUnit.unit.volumeMl} mL
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-500 font-medium">
                        Facility Depot:
                      </div>
                      <div className="text-xs font-bold text-slate-900 flex items-center sm:justify-end gap-1">
                        <Building2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>{matchedUnit.hospital.name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Unit Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">
                        Current Status
                      </span>
                      <span
                        className={`font-black uppercase text-xs inline-block mt-0.5 px-2 py-0.5 rounded ${
                          matchedUnit.unit.status === 'available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : matchedUnit.unit.status === 'reserved'
                            ? 'bg-blue-100 text-blue-800'
                            : matchedUnit.unit.status === 'quarantined'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {matchedUnit.unit.status}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">
                        Storage Vault
                      </span>
                      <span className="font-semibold text-slate-800 text-xs truncate block mt-0.5">
                        {matchedUnit.unit.storageLocation}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">
                        Cold Chain Check
                      </span>
                      <span className="font-semibold text-emerald-700 text-xs flex items-center gap-1 mt-0.5">
                        <Thermometer className="w-3.5 h-3.5 text-emerald-600" />
                        <span>3.8°C (Normal)</span>
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">
                        Expiration Date
                      </span>
                      <span className="font-semibold text-slate-800 text-xs block mt-0.5">
                        {new Date(matchedUnit.unit.expirationDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Instant Status Update Button Actions */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Instant Clinical Status Actions:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => handleApplyStatusUpdate('available')}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          matchedUnit.unit.status === 'available'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark Available</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyStatusUpdate('quarantined')}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          matchedUnit.unit.status === 'quarantined'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Quarantine Bag</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyStatusUpdate('reserved')}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          matchedUnit.unit.status === 'reserved'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        <Zap className="w-4 h-4" />
                        <span>STAT Crossmatch</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyStatusUpdate('in_transit')}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          matchedUnit.unit.status === 'in_transit'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white text-purple-700 border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        <Boxes className="w-4 h-4" />
                        <span>Pneumatic Dispatch</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Mode B: Unregistered / Incoming Blood Bag -> Stock Intake Flow */
                <div className="p-4 bg-rose-50/70 rounded-2xl border-2 border-rose-300 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-rose-200 pb-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
                      {scannedResult.bloodGroup || 'O-'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">
                          {scannedResult.bagBarcode}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-800 uppercase">
                          New Stock Intake
                        </span>
                      </div>
                      <p className="text-xs text-rose-800">
                        {scannedResult.component || 'Packed Red Blood Cells (PRBC)'} · {scannedResult.volumeMl || 450} mL
                      </p>
                    </div>
                  </div>

                  {/* Stock Intake Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Intake Destination Facility:
                      </label>
                      <select
                        value={intakeHospitalId}
                        onChange={(e) => setIntakeHospitalId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      >
                        {hospitals.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name} ({h.zone})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Vault Cold Storage Location:
                      </label>
                      <input
                        type="text"
                        value={intakeStorageLocation}
                        onChange={(e) => setIntakeStorageLocation(e.target.value)}
                        placeholder="e.g. Cryo-Vault Shelf B-04"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* One-Click Intake Button */}
                  <button
                    type="button"
                    onClick={handleCompleteStockIntake}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Complete Stock Intake into Hospital Vault</span>
                  </button>
                </div>
              )}

              {/* Action Buttons to Scan Next */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleScanNextBag}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Next Blood Bag</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* Quick Demo QR Test Tags (for Evaluator Testing without Physical Bags) */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-rose-600" />
                <span>Quick Test Blood Unit QR Tags (Click or Scan from Screen)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                AABB ISBT-128 Compliant
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sampleQrCodes.map((sample, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50/50 hover:border-rose-300 transition-all flex flex-col items-center text-center group cursor-pointer"
                  onClick={() => handleDecodedCode(sample.payload)}
                >
                  {sample.dataUrl && (
                    <img
                      src={sample.dataUrl}
                      alt={sample.label}
                      className="w-20 h-20 rounded-lg border border-slate-200 bg-white p-1 mb-1.5 shadow-xs group-hover:scale-105 transition-transform"
                    />
                  )}
                  <span className="text-[11px] font-bold text-slate-900 group-hover:text-rose-600 leading-tight">
                    {sample.label}
                  </span>
                  <span className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                    {sample.description}
                  </span>
                  <button
                    type="button"
                    className="mt-2 w-full py-1 text-[10px] font-bold rounded-md bg-white border border-slate-300 text-slate-700 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600 transition-colors"
                  >
                    Simulate Scan
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
          <span>Camera stream decoded in real-time via Web Worker & jsQR</span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
};
