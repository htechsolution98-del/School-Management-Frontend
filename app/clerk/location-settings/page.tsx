"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Navigation,
  Shield,
  Save,
  LocateFixed,
  Sunrise,
  Sunset,
  AlarmClock,
  MousePointer2,
  Trash2,
  RefreshCw,
  Edit3,
  CalendarCheck,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import {
  deleteLocationSettings,
  getLocationSettings,
  saveLocationSettings,
} from "@/lib/clerk";
import {
  getAttendanceSettings,
  createAttendanceSetting,
  updateAttendanceSetting,
} from "@/lib/hr-config";
import type { AttendanceSetting } from "@/types";
import type { LocationSettingsRecord } from "@/types/clerk";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const RADIUS_PRESETS = [50, 100, 200, 500, 1000];

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteConfirmDialog({
  onConfirm,
  onCancel,
  isDeleting,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-sm mx-4 overflow-hidden">
        <div className="h-1.5 w-full bg-red-600" />
        <div className="p-6 space-y-4">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-600">
              <Trash2 className="h-7 w-7" />
            </div>
          </div>
          <div className="text-center space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              Delete Attendance Zone?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This will remove the current geofence perimeter and shift schedule.
              Teachers will be unable to verify their attendance location until a new zone is created.
            </p>
          </div>
          <div className="flex gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 rounded-xl text-xs h-10"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 rounded-xl text-xs font-bold h-10 gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Yes, Delete
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Permission Dialog ────────────────────────────────────────────────────────

function LocationPermissionDialog({
  onAllow,
  onDeny,
}: {
  onAllow: () => void;
  onDeny: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-sm mx-4 overflow-hidden">
        <div className="h-1.5 w-full bg-indigo-600" />
        <div className="p-6 space-y-4">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <LocateFixed className="h-7 w-7" />
            </div>
          </div>
          <div className="text-center space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              Allow Location Access
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We request your device's GPS position to configure the school's central attendance geofence coordinate.
            </p>
          </div>
          <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-400">
            {[
              "Used only to position the geofence center",
              "You can fine-tune or click the map manually anytime",
              "High precision coordinates for geofence reliability",
            ].map((text) => (
              <div
                key={text}
                className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 px-3 py-2 text-[11px]"
              >
                <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onDeny}
              className="flex-1 rounded-xl text-xs h-10"
            >
              Not Now
            </Button>
            <Button
              type="button"
              onClick={onAllow}
              className="flex-1 rounded-xl text-xs font-bold h-10 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Allow Access
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Interactive Map ──────────────────────────────────────────────────────────

declare global {
  interface Window {
    L: any;
  }
}

function InteractiveMap({
  lat,
  lng,
  radius,
  onLocationSelect,
  readOnly = false,
}: {
  lat: string;
  lng: string;
  radius: string;
  onLocationSelect: (lat: string, lng: string) => void;
  readOnly?: boolean;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const init = () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const L = window.L;

      const defaultLat = parseFloat(lat) || 23.022505;
      const defaultLng = parseFloat(lng) || 72.571362;

      if (!mapRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapRef.current, {
        center: [defaultLat, defaultLng],
        zoom: isNaN(parseFloat(lat)) ? 13 : 16,
        zoomControl: true,
        dragging: !readOnly,
        scrollWheelZoom: !readOnly,
        doubleClickZoom: !readOnly,
        touchZoom: !readOnly,
      });

      setTimeout(() => {
        map.invalidateSize();
      }, 200);

      L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        attribution: "© Google Maps",
        maxZoom: 20,
      }).addTo(map);

      mapInstanceRef.current = map;

      if (!readOnly) {
        map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
          const { lat: clickLat, lng: clickLng } = e.latlng;
          placeMarker(map, clickLat, clickLng, parseInt(radius || "100"));
          onLocationSelect(clickLat.toFixed(6), clickLng.toFixed(6));
          reverseGeocode(clickLat, clickLng);
        });
      }

      const pLat = parseFloat(lat);
      const pLng = parseFloat(lng);
      if (!isNaN(pLat) && !isNaN(pLng)) {
        map.whenReady(() => {
          setTimeout(() => {
            placeMarker(map, pLat, pLng, parseInt(radius || "100"));
          }, 150);
        });
      }
    };

    if (window.L && mapRef.current) {
      setTimeout(() => {
        init();
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = init;
    document.head.appendChild(script);

    return () => {
      try {
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }

        if (circleRef.current) {
          circleRef.current.remove();
          circleRef.current = null;
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      } catch (err) {
        console.log("Leaflet cleanup error", err);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const pLat = parseFloat(lat);
    const pLng = parseFloat(lng);
    if (isNaN(pLat) || isNaN(pLng)) return;
    placeMarker(mapInstanceRef.current, pLat, pLng, parseInt(radius || "100"));
  }, [lat, lng]);

  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !window.L) return;
    if (!markerRef.current?.getLatLng) return;

    const pos = markerRef.current.getLatLng();
    if (!pos) return;

    if (circleRef.current) {
      try {
        circleRef.current.remove();
      } catch {}
      circleRef.current = null;
    }

    setTimeout(() => {
      if (!mapInstanceRef.current || !window.L) return;
      try {
        circleRef.current = window.L.circle([pos.lat, pos.lng], {
          radius: parseInt(radius || "100"),
          color: "#4f46e5",
          fillColor: "#4f46e5",
          fillOpacity: 0.15,
          weight: 2,
          dashArray: "6 4",
        }).addTo(mapInstanceRef.current);
      } catch (err) {
        console.warn("Circle render error:", err);
      }
    }, 50);
  }, [radius]);

  function placeMarker(map: any, latVal: number, lngVal: number, r: number) {
    const L = window.L;
    if (!L || !map || !mapRef.current) return;
    if (markerRef.current) markerRef.current.remove();
    if (circleRef.current) circleRef.current.remove();

    const icon = L.divIcon({
      className: "",
      html: `<div style="position:relative;width:32px;height:40px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#4f46e5,#4338ca);border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 14px rgba(79,70,229,0.45);"></div>
        <div style="position:absolute;top:9px;left:9px;width:11px;height:11px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
      </div>`,
      iconSize: [32, 40],
      iconAnchor: [16, 40],
    });

    if (
      latVal === undefined ||
      lngVal === undefined ||
      isNaN(latVal) ||
      isNaN(lngVal)
    ) {
      return;
    }

    markerRef.current = L.marker([latVal, lngVal], { icon })
      .addTo(map)
      .bindPopup(
        `<div style="font-family:monospace;font-size:11px;font-weight:700;padding:2px 4px;color:#1e293b;">📍 ${Number(latVal).toFixed(6)}, ${Number(lngVal).toFixed(6)}</div>`
      );

    setTimeout(() => {
      if (!map || !mapInstanceRef.current) return;
      if (circleRef.current) {
        circleRef.current.remove();
        circleRef.current = null;
      }
      circleRef.current = L.circle([latVal, lngVal], {
        radius: r,
        color: "#4f46e5",
        fillColor: "#4f46e5",
        fillOpacity: 0.15,
        weight: 2,
        dashArray: "6 4",
      }).addTo(map);

      map.fitBounds(circleRef.current.getBounds(), { padding: [25, 25] });
    }, 50);
  }

  const reverseGeocode = async (latVal: number, lngVal: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latVal}&lon=${lngVal}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data?.display_name) setAddress(data.display_name);
    } catch {}
  };

  const doGetLocation = () => {
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude.toFixed(6);
        const newLng = pos.coords.longitude.toFixed(6);
        onLocationSelect(newLat, newLng);
        reverseGeocode(parseFloat(newLat), parseFloat(newLng));
        setLocating(false);
      },
      (err: GeolocationPositionError) => {
        const msgs: Record<number, string> = {
          [err.PERMISSION_DENIED]: "Location permission denied.",
          [err.POSITION_UNAVAILABLE]:
            "Location unavailable. Please select coordinate manually on map.",
        };
        setLocationError(msgs[err.code] || "Could not detect GPS location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCurrentLocationClick = () => {
    setLocationError("");
    if (navigator.permissions) {
      navigator.permissions
        .query({
          name: "geolocation" as PermissionName,
        })
        .then((result) => {
          if (result.state === "granted") doGetLocation();
          else if (result.state === "denied")
            setLocationError(
              "Location blocked by browser. Please enable location permissions."
            );
          else setShowPermissionDialog(true);
        })
        .catch(() => {
          setShowPermissionDialog(true);
        });
    } else {
      setShowPermissionDialog(true);
    }
  };

  return (
    <>
      {showPermissionDialog && (
        <LocationPermissionDialog
          onAllow={() => {
            setShowPermissionDialog(false);
            doGetLocation();
          }}
          onDeny={() => {
            setShowPermissionDialog(false);
            setLocationError(
              "Location access denied. Click on the map to set coordinate manually."
            );
          }}
        />
      )}

      <div className="space-y-3">
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            onClick={handleCurrentLocationClick}
            disabled={locating}
            className="w-full h-10 rounded-xl bg-indigo-50/60 hover:bg-indigo-100/80 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 border border-indigo-200/80 font-semibold text-xs gap-2 transition-all active:scale-[0.99] disabled:opacity-50 shadow-2xs"
          >
            {locating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                Detecting GPS Location...
              </>
            ) : (
              <>
                <LocateFixed className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Use Current GPS Location
              </>
            )}
          </Button>
        )}

        {locationError && (
          <div className="flex items-start gap-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed">
              {locationError}
            </p>
          </div>
        )}

        {address && (
          <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed line-clamp-2">
              {address}
            </p>
          </div>
        )}

        <div className="relative rounded-2xl overflow-hidden border border-zinc-200/90 dark:border-zinc-800 shadow-2xs bg-slate-100 dark:bg-zinc-800">
          {!readOnly && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] pointer-events-none">
              <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                <MousePointer2 className="h-3 w-3" />
                Click anywhere on map to set center
              </div>
            </div>
          )}

          <div ref={mapRef} style={{ height: "320px", width: "100%" }} />

          {lat && lng && !isNaN(parseFloat(lat)) && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-[999]">
              <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-xl px-2.5 py-1 text-xs text-slate-800 dark:text-zinc-200 font-mono font-bold border border-slate-200 dark:border-zinc-700 shadow-xs">
                {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
              </div>
              <div className="bg-indigo-600/95 text-white backdrop-blur-md rounded-xl px-2.5 py-1 text-xs font-bold font-mono shadow-xs">
                Radius: {radius}m
              </div>
            </div>
          )}
        </div>

        {!readOnly && (
          <p className="text-[11px] text-muted-foreground text-center">
            Tap &quot;Use Current GPS Location&quot; or click on the map to set the geofence center.
          </p>
        )}
      </div>
    </>
  );
}

// ─── Schedule Timeline Preview ────────────────────────────────────────────────

function ScheduleTimeline({
  start,
  end,
  halfDay,
}: {
  start?: string;
  end?: string;
  halfDay?: string;
}) {
  const toMinutes = (t?: string) => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const startMin = toMinutes(start || "09:00");
  const endMin = toMinutes(end || "17:00");
  const halfMin = toMinutes(halfDay || "13:00");

  const totalDurationMin = Math.max(0, endMin - startMin);
  const totalHours = (totalDurationMin / 60).toFixed(1);

  // Proportional progress calculation
  const halfDayPct =
    totalDurationMin > 0
      ? Math.max(0, Math.min(100, ((halfMin - startMin) / totalDurationMin) * 100))
      : 50;

  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40 p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <CalendarCheck className="h-3.5 w-3.5 text-indigo-600" /> Schedule Visualizer
        </span>
        <Badge variant="outline" className="font-mono text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
          {totalHours}h Shift Duration
        </Badge>
      </div>

      {/* Visual Timeline Bar */}
      <div className="relative h-4 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden shadow-inner">
        <div
          className="absolute inset-y-0 left-0 bg-indigo-500/30 dark:bg-indigo-500/40 rounded-full"
          style={{ width: "100%" }}
        />
        {/* Half day threshold line */}
        <div
          className="absolute inset-y-0 w-1 bg-amber-500 shadow-xs z-10 -ml-0.5"
          style={{ left: `${halfDayPct}%` }}
        />
      </div>

      {/* Legend & Milestone Labels */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-zinc-300">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
          <span>Start: <strong className="font-mono">{start || "09:00"}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
          <span>Half-Day: <strong className="font-mono text-amber-700 dark:text-amber-400">{halfDay || "13:00"}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-800 dark:bg-zinc-200 shrink-0" />
          <span>End: <strong className="font-mono">{end || "17:00"}</strong></span>
        </div>
      </div>
    </div>
  );
}

// ─── Data View (Read-only view when settings exist) ───────────────────────────

function DataView({
  data,
  onDelete,
  onEdit,
}: {
  data: LocationSettingsRecord;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fmt = (t?: string) => {
    if (!t || String(t).trim() === "") return "N/A";
    return t.slice(0, 5);
  };

  const handleDeleteConfirm = async () => {
    if (!data.id) {
      setDeleteError("Missing record ID to delete.");
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteLocationSettings(data.id);
      setShowDeleteDialog(false);
      toast.success("Attendance zone configuration removed.");
      onDelete();
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete.");
      setIsDeleting(false);
    }
  };

  return (
    <>
      {showDeleteDialog && (
        <DeleteConfirmDialog
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowDeleteDialog(false);
            setDeleteError(null);
          }}
          isDeleting={isDeleting}
        />
      )}

      {deleteError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-xs text-red-900">Delete Action Failed</p>
            <p className="text-xs text-red-700 mt-0.5">{deleteError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Location & Geofence Card */}
        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardHeader className="pb-3 border-b dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-indigo-600" /> Active School Geofence
              </CardTitle>
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 font-semibold text-[11px] gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live Enforcing
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Registered GPS center and allowed radius used for teacher attendance validation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Navigation className="h-3 w-3 text-indigo-600" /> Latitude
                </span>
                <p className="font-mono text-sm font-bold text-slate-900 dark:text-zinc-100">
                  {data.latitude || "N/A"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Navigation className="h-3 w-3 text-indigo-600" /> Longitude
                </span>
                <p className="font-mono text-sm font-bold text-slate-900 dark:text-zinc-100">
                  {data.longitude || "N/A"}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-indigo-600" /> Allowed Radius
              </span>
              <span className="font-mono font-extrabold text-sm text-indigo-700 dark:text-indigo-300">
                {data.radius ? `${data.radius} meters` : "N/A"}
              </span>
            </div>

            {/* Read-Only Map */}
            {data.latitude && data.longitude && !isNaN(parseFloat(String(data.latitude))) ? (
              <InteractiveMap
                lat={String(data.latitude)}
                lng={String(data.longitude)}
                radius={String(data.radius || "100")}
                onLocationSelect={() => {}}
                readOnly
              />
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40 h-44 flex flex-col items-center justify-center gap-2 text-slate-400">
                <MapPin className="h-8 w-8 text-slate-300" />
                <p className="text-xs font-medium">No coordinates set</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Working Hours & Management */}
        <div className="space-y-6">
          <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
            <CardHeader className="pb-3 border-b dark:border-zinc-800">
              <CardTitle className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-600" /> Operating Schedule
              </CardTitle>
              <CardDescription className="text-xs">
                Attendance timestamps falling beyond these boundaries determine late arrivals and half-day penalties.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Sunrise className="h-3 w-3 text-indigo-600" /> Start Time
                  </span>
                  <p className="font-mono text-sm font-bold text-slate-900 dark:text-zinc-100">
                    {fmt(data.start_time)}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Sunset className="h-3 w-3 text-indigo-600" /> End Time
                  </span>
                  <p className="font-mono text-sm font-bold text-slate-900 dark:text-zinc-100">
                    {fmt(data.end_time)}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <AlarmClock className="h-4 w-4 text-amber-600" /> Half-Day Cutoff
                </span>
                <span className="font-mono font-extrabold text-sm text-amber-800 dark:text-amber-300">
                  {fmt(data.half_day_time)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="h-3 w-3 text-indigo-600" /> Grace Period
                  </span>
                  <p className="font-mono text-sm font-bold text-slate-900 dark:text-zinc-100">
                    {(data as any).grace_period_mins ?? 15} mins
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <AlarmClock className="h-3 w-3 text-amber-600" /> Half-Day Threshold
                  </span>
                  <p className="font-mono text-sm font-bold text-slate-900 dark:text-zinc-100">
                    {(data as any).half_day_threshold_mins ?? 120} mins
                  </p>
                </div>
              </div>

              {data.start_time && data.end_time && (
                <ScheduleTimeline
                  start={fmt(data.start_time)}
                  end={fmt(data.end_time)}
                  halfDay={fmt(data.half_day_time)}
                />
              )}
            </CardContent>
          </Card>

          {/* Action Footer Card */}
          <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                  Manage Attendance Policy
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Update geofence radius or adjust shift cutoffs anytime.
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Button
                  onClick={onEdit}
                  className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-9 px-4 gap-1.5 shadow-sm"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Configuration
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(true)}
                  className="flex-1 sm:flex-initial rounded-xl text-xs font-semibold h-9 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/50 gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

// ─── Location Settings Form ───────────────────────────────────────────────────

function LocationForm({
  initialData,
  onSaved,
  onCancel,
}: {
  initialData?: LocationSettingsRecord | null;
  onSaved: (data: any) => void;
  onCancel?: () => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    shift_name: (initialData as any)?.shift_name || "General Shift",
    latitude: initialData?.latitude ? String(initialData.latitude) : "23.022505",
    longitude: initialData?.longitude ? String(initialData.longitude) : "72.571362",
    radius: initialData?.radius ? String(initialData.radius) : "100",
    start_time: initialData?.start_time || "09:00:00",
    end_time: initialData?.end_time || "17:00:00",
    half_day_time: initialData?.half_day_time || "13:00:00",
    grace_period_mins: String((initialData as any)?.grace_period_mins ?? 15),
    half_day_threshold_mins: String((initialData as any)?.half_day_threshold_mins ?? 120),
  });

  const setVal = (key: string, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const toTimeInput = (t?: string) => t?.slice(0, 5) || "";
  const toTimeVal = (t?: string) => (t?.length === 5 ? t + ":00" : t || "");

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.latitude || !form.longitude) {
      toast.error("Please set valid GPS latitude and longitude coordinates.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await saveLocationSettings(form);

      // Also persist to dynamic AttendanceSetting
      const existingSettings = await getAttendanceSettings().catch(() => []);
      const primarySetting = existingSettings.length > 0 ? existingSettings[0] : null;

      const dynamicPayload = {
        name: form.shift_name.trim() || "General Shift",
        check_in_time: form.start_time,
        check_out_time: form.end_time,
        grace_period_mins: Number(form.grace_period_mins) || 15,
        half_day_threshold_mins: Number(form.half_day_threshold_mins) || 120,
        geo_radius_meters: Number(form.radius) || 100,
        geo_required: true,
        is_active: true,
      };

      if (primarySetting?.id) {
        await updateAttendanceSetting(primarySetting.id, dynamicPayload).catch(() => {});
      } else {
        await createAttendanceSetting(dynamicPayload).catch(() => {});
      }

      toast.success("Attendance zone & policy settings saved successfully!");
      onSaved(form);
    } catch (err: any) {
      const msg = err.message || "Failed to save location settings.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900/60 p-4">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-xs text-red-900 dark:text-red-200">Save Failed</p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Location & Geofence Coordinates */}
        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardHeader className="pb-3 border-b dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-indigo-600" /> Step 1: School Geofence Center
              </CardTitle>
              <Badge variant="outline" className="font-mono text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200">
                GPS Center
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Position the attendance zone center by clicking on the map or using your device GPS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Coordinate Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                  <Navigation className="h-3.5 w-3.5 text-indigo-600" /> Latitude:
                </label>
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="23.022505"
                  value={form.latitude}
                  onChange={(e) => setVal("latitude", e.target.value)}
                  className="h-10 text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700"
                  required
                />
                <p className="text-[11px] text-muted-foreground">e.g. 23.022505</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                  <Navigation className="h-3.5 w-3.5 text-indigo-600" /> Longitude:
                </label>
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="72.571362"
                  value={form.longitude}
                  onChange={(e) => setVal("longitude", e.target.value)}
                  className="h-10 text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700"
                  required
                />
                <p className="text-[11px] text-muted-foreground">e.g. 72.571362</p>
              </div>
            </div>

            {/* Allowed Radius */}
            <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-indigo-600" /> Allowed Radius (Meters):
                </label>
                <span className="font-mono text-xs font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-900">
                  {form.radius} meters
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="10"
                  max="5000"
                  step="10"
                  value={form.radius}
                  onChange={(e) => setVal("radius", e.target.value)}
                  className="h-9 w-28 text-xs font-mono font-bold rounded-lg text-center bg-white dark:bg-zinc-900"
                  required
                />
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={form.radius}
                  onChange={(e) => setVal("radius", e.target.value)}
                  className="flex-1 accent-indigo-600 cursor-pointer h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg"
                />
              </div>

              {/* Quick Preset Chips */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="text-[10px] font-semibold text-muted-foreground mr-1">Presets:</span>
                {RADIUS_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setVal("radius", String(m))}
                    className={cn(
                      "text-[11px] font-mono px-2 py-0.5 rounded-md border transition-all cursor-pointer",
                      String(form.radius) === String(m)
                        ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs"
                        : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:border-indigo-300"
                    )}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Map */}
            <InteractiveMap
              lat={form.latitude}
              lng={form.longitude}
              radius={form.radius}
              onLocationSelect={(latVal, lngVal) => {
                setVal("latitude", latVal);
                setVal("longitude", lngVal);
              }}
            />
          </CardContent>
        </Card>

        {/* Right Column: Working Hours & Summary */}
        <div className="space-y-6">
          {/* Card: Working Hours */}
          <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
            <CardHeader className="pb-3 border-b dark:border-zinc-800">
              <CardTitle className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-600" /> Step 2: Working Hours & Schedule
              </CardTitle>
              <CardDescription className="text-xs">
                Configure official school shift hours, grace periods, and cutoff threshold for half-day status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-indigo-600" /> Shift Policy Name:
                </label>
                <Input
                  type="text"
                  placeholder="e.g. General School Shift"
                  value={form.shift_name}
                  onChange={(e) => setVal("shift_name", e.target.value)}
                  className="h-10 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                    <Sunrise className="h-3.5 w-3.5 text-indigo-600" /> Start Time:
                  </label>
                  <Input
                    type="time"
                    value={toTimeInput(form.start_time)}
                    onChange={(e) => setVal("start_time", toTimeVal(e.target.value))}
                    className="h-10 text-xs font-mono font-medium rounded-xl bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">School opening hour</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                    <Sunset className="h-3.5 w-3.5 text-indigo-600" /> End Time:
                  </label>
                  <Input
                    type="time"
                    value={toTimeInput(form.end_time)}
                    onChange={(e) => setVal("end_time", toTimeVal(e.target.value))}
                    className="h-10 text-xs font-mono font-medium rounded-xl bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">School closing hour</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                  <AlarmClock className="h-3.5 w-3.5 text-amber-600" /> Half-Day Cutoff Threshold (Time):
                </label>
                <Input
                  type="time"
                  value={toTimeInput(form.half_day_time)}
                  onChange={(e) => setVal("half_day_time", toTimeVal(e.target.value))}
                  className="h-10 text-xs font-mono font-medium rounded-xl bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Teachers punching in after this cutoff are logged as half-day.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-indigo-600" /> Grace Period (Minutes):
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    placeholder="15"
                    value={form.grace_period_mins}
                    onChange={(e) => setVal("grace_period_mins", e.target.value)}
                    className="h-10 text-xs font-mono font-medium rounded-xl bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700"
                  />
                  <p className="text-[11px] text-muted-foreground">Allowed late buffer (e.g. 15 mins)</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                    <AlarmClock className="h-3.5 w-3.5 text-amber-600" /> Half-Day Threshold (Mins):
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="480"
                    placeholder="120"
                    value={form.half_day_threshold_mins}
                    onChange={(e) => setVal("half_day_threshold_mins", e.target.value)}
                    className="h-10 text-xs font-mono font-medium rounded-xl bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700"
                  />
                  <p className="text-[11px] text-muted-foreground">Lateness threshold (e.g. 120 mins)</p>
                </div>
              </div>

              <ScheduleTimeline
                start={toTimeInput(form.start_time)}
                end={toTimeInput(form.end_time)}
                halfDay={toTimeInput(form.half_day_time)}
              />
            </CardContent>
          </Card>

          {/* Card: Configuration Overview & Submission */}
          <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
            <CardHeader className="pb-3 border-b dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" /> Configuration Preview
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200">
                  Ready to Apply
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Summary of active values that will be committed to the backend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                {[
                  {
                    label: "Policy Name",
                    value: form.shift_name || "General Shift",
                    icon: Layers,
                  },
                  {
                    label: "Coordinates",
                    value: `${form.latitude || "—"}, ${form.longitude || "—"}`,
                    icon: Navigation,
                  },
                  {
                    label: "Allowed Radius",
                    value: form.radius ? `${form.radius} meters` : "—",
                    icon: Shield,
                  },
                  {
                    label: "Operating Shift",
                    value:
                      form.start_time && form.end_time
                        ? `${toTimeInput(form.start_time)} – ${toTimeInput(form.end_time)}`
                        : "—",
                    icon: Clock,
                  },
                  {
                    label: "Half-Day After",
                    value: toTimeInput(form.half_day_time) || "—",
                    icon: AlarmClock,
                  },
                  {
                    label: "Grace Period",
                    value: `${form.grace_period_mins || 15} mins`,
                    icon: Clock,
                  },
                  {
                    label: "Half-Day Threshold",
                    value: `${form.half_day_threshold_mins || 120} mins`,
                    icon: AlarmClock,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-xs"
                  >
                    <span className="flex items-center gap-2 font-medium text-slate-500 dark:text-zinc-400">
                      <Icon className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      {label}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2.5">
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="rounded-xl text-xs font-semibold h-10 px-4"
                  >
                    Cancel
                  </Button>
                )}

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving Attendance Zone...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Attendance Zone
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function LocationSettingsPage() {
  const [pageState, setPageState] = useState<"loading" | "view" | "empty" | "form">("loading");
  const [existingData, setExistingData] = useState<LocationSettingsRecord | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadData = async () => {
    setPageState("loading");
    setFetchError(null);
    try {
      const [data, attendanceList] = await Promise.all([
        getLocationSettings(),
        getAttendanceSettings().catch(() => []),
      ]);
      const primaryAttendance = attendanceList.length > 0 ? attendanceList[0] : null;

      const hasData =
        (data &&
          (String(data.latitude || "").trim() !== "" ||
            String(data.longitude || "").trim() !== "")) ||
        primaryAttendance !== null;

      if (hasData) {
        const mergedData = {
          ...(data || {}),
          id: data?.id,
          latitude: data?.latitude,
          longitude: data?.longitude,
          radius: data?.radius || (primaryAttendance ? String(primaryAttendance.geo_radius_meters) : "100"),
          start_time: data?.start_time || primaryAttendance?.check_in_time || "09:00:00",
          end_time: data?.end_time || primaryAttendance?.check_out_time || "17:00:00",
          half_day_time: data?.half_day_time || "13:00:00",
          shift_name: primaryAttendance?.name || "General Shift",
          grace_period_mins: primaryAttendance?.grace_period_mins ?? 15,
          half_day_threshold_mins: primaryAttendance?.half_day_threshold_mins ?? 120,
          attendance_setting_id: primaryAttendance?.id,
        };
        setExistingData(mergedData as any);
        setPageState("view");
      } else {
        setExistingData(null);
        setPageState("empty");
      }
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() || "";
      if (msg.includes("404") || msg.includes("not found")) {
        setExistingData(null);
        setPageState("empty");
      } else {
        setFetchError(err.message || "Failed to load location settings.");
        setExistingData(null);
        setPageState("empty");
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <LocateFixed className="h-6 w-6 text-indigo-600" />
              Attendance Zone Settings
            </h1>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">
              Clerk Portal
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Configure geofence boundaries and working hours for automated teacher attendance verification.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {pageState === "view" && (
            <Button
              size="sm"
              onClick={() => setPageState("form")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold gap-1.5 h-9 px-4 shadow-sm"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Settings
            </Button>
          )}

          {pageState === "form" && existingData && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPageState("view")}
              className="rounded-xl text-xs gap-1.5 h-9"
            >
              Cancel Edit
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={pageState === "loading"}
            className="rounded-xl text-xs gap-1.5 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${pageState === "loading" ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Fetch Error Warning */}
      {fetchError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-xs text-amber-900">Notice</p>
            <p className="text-xs text-amber-700">
              {fetchError} — You can still configure and save new settings below.
            </p>
          </div>
        </div>
      )}

      {/* ── State 1: Loading ── */}
      {pageState === "loading" && (
        <div className="flex items-center justify-center py-24 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            <p className="text-xs font-medium">Loading attendance zone settings...</p>
          </div>
        </div>
      )}

      {/* ── State 2: Active Config Exists (View Mode) ── */}
      {pageState === "view" && existingData && (
        <DataView
          data={existingData}
          onDelete={() => {
            setExistingData(null);
            setPageState("empty");
          }}
          onEdit={() => setPageState("form")}
        />
      )}

      {/* ── State 3: Empty State ── */}
      {pageState === "empty" && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 flex flex-col items-center gap-5 text-center px-6 shadow-2xs">
          <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <MapPin className="h-8 w-8" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base font-bold text-slate-900">
              No Attendance Zone Configured
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Define the school GPS coordinates, allowed geofence perimeter radius, and daily working hours so teachers can verify attendance.
            </p>
          </div>

          <Button
            onClick={() => setPageState("form")}
            className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm gap-2 mt-2"
          >
            <Sparkles className="h-4 w-4" />
            Configure Attendance Zone
          </Button>
        </div>
      )}

      {/* ── State 4: Form (Create or Edit) ── */}
      {pageState === "form" && (
        <LocationForm
          initialData={existingData}
          onSaved={(savedData) => {
            setExistingData(savedData);
            setPageState("view");
          }}
          onCancel={existingData ? () => setPageState("view") : undefined}
        />
      )}
    </div>
  );
}
