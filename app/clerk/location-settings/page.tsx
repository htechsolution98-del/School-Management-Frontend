"use client";

import { useEffect, useRef, useState } from "react";
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
  Radar,
  Sunrise,
  Sunset,
  AlarmClock,
  MousePointer2,
  Info,
  Trash2,
} from "lucide-react";
import {
  deleteLocationSettings,
  getLocationSettings,
  saveLocationSettings,
} from "@/lib/clerk";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
}) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all",
        className,
      )}
      {...props}
    />
  );
}

function Field({
  label,
  icon: Icon,
  hint,
  children,
}: {
  label: string;
  icon?: any;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        {Icon && <Icon className="h-3.5 w-3.5 text-teal-500" />}
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Section({
  title,
  description,
  icon: Icon,
  children,
  accent = "teal",
}: {
  title: string;
  description: string;
  icon: any;
  children: React.ReactNode;
  accent?: string;
}) {
  const accents: Record<string, string> = {
    teal: "bg-teal-500",
    slate: "bg-slate-600",
    amber: "bg-amber-500",
    violet: "bg-violet-500",
    rose: "bg-rose-500",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/60 flex items-start gap-4">
        <div
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
            accents[accent],
          )}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm mx-4 overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-400 to-red-500" />
        <div className="p-6 space-y-5">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
              <Trash2 className="h-8 w-8 text-rose-500" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-slate-900">
              Delete Location Settings?
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              This will permanently remove the attendance zone configuration.
              Teachers will not be able to mark attendance until new settings
              are added.
            </p>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white text-sm font-semibold shadow-lg shadow-rose-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Yes, Delete
                </>
              )}
            </button>
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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm mx-4 overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-400 to-emerald-500" />
        <div className="p-6 space-y-5">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center">
              <LocateFixed className="h-8 w-8 text-teal-600" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-slate-900">
              Allow Location Access
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              This app needs your device's GPS location to set the school
              attendance zone accurately.
            </p>
          </div>
          <div className="space-y-2">
            {[
              "Used only to set the geofence center",
              "Not stored or shared anywhere",
              "You can change it manually anytime",
            ].map((text) => (
              <div
                key={text}
                className="flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                <span className="text-xs text-slate-600 font-medium">
                  {text}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onDeny}
              className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Not Now
            </button>
            <button
              type="button"
              onClick={onAllow}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-sm font-semibold shadow-lg shadow-teal-500/20 transition-all active:scale-95"
            >
              Allow Access
            </button>
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

    // Remove old circle safely
    if (circleRef.current) {
      try {
        circleRef.current.remove();
      } catch { }
      circleRef.current = null;
    }

    // ✅ Defer so Leaflet SVG renderer is ready before projecting coordinates
    setTimeout(() => {
      if (!mapInstanceRef.current || !window.L) return;
      try {
        circleRef.current = window.L.circle([pos.lat, pos.lng], {
          radius: parseInt(radius || "100"),
          color: "#0d9488",
          fillColor: "#0d9488",
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

    if (!L || !map) return;

    if (!L || !mapRef.current) return;
    if (markerRef.current) markerRef.current.remove();
    if (circleRef.current) circleRef.current.remove();

    const icon = L.divIcon({
      className: "",
      html: `<div style="position:relative;width:32px;height:40px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#0d9488,#0f766e);border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(13,148,136,0.5);"></div>
        <div style="position:absolute;top:8px;left:8px;width:12px;height:12px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
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
        `<div style="font-family:monospace;font-size:11px;font-weight:700;padding:2px 4px;">📍 ${Number(latVal).toFixed(6)}, ${Number(lngVal).toFixed(6)}</div>`,
      )
      .openPopup();

    setTimeout(() => {
      if (!map || !mapInstanceRef.current) return;
      if (circleRef.current) {
        circleRef.current.remove();
        circleRef.current = null;
      }
      circleRef.current = L.circle([latVal, lngVal], {
        radius: r,
        color: "#0d9488",
        fillColor: "#0d9488",
        fillOpacity: 0.15,
        weight: 2,
        dashArray: "6 4",
      }).addTo(map);
      // ✅ Auto-fit map to show the full circle
      map.fitBounds(circleRef.current.getBounds(), { padding: [20, 20] });
    }, 50);
  }

  const reverseGeocode = async (latVal: number, lngVal: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latVal}&lon=${lngVal}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "en" } },
      );
      const data = await res.json();
      if (data?.display_name) setAddress(data.display_name);
    } catch { }
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
            "Location unavailable. Set manually on the map.",
        };
        setLocationError(msgs[err.code] || "Could not get location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
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
              "Location blocked. Enable it in browser settings.",
            );
          else setShowPermissionDialog(true);
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
              "Location access not granted. Click on the map to set manually.",
            );
          }}
        />
      )}

      <div className="space-y-3">
        {!readOnly && (
          <button
            type="button"
            onClick={handleCurrentLocationClick}
            disabled={locating}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-teal-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
          >
            {locating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Detecting your location...
              </>
            ) : (
              <>
                <LocateFixed className="h-4 w-4" />
                Use Current Location
              </>
            )}
          </button>
        )}

        {locationError && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5">
            <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 font-medium leading-relaxed">
              {locationError}
            </p>
          </div>
        )}

        {address && (
          <div className="flex items-start gap-2 rounded-xl bg-teal-50 border border-teal-100 px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
            <p className="text-xs text-teal-700 font-medium leading-relaxed">
              {address}
            </p>
          </div>
        )}

        {!readOnly && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              or click map
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
        )}

        <div className="relative z-0 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          {!readOnly && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] pointer-events-none">
              <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                <MousePointer2 className="h-3 w-3" />
                Click on the map to set location
              </div>
            </div>
          )}

          <div ref={mapRef} style={{ height: "320px", width: "100%" }} />

          {lat && lng && !isNaN(parseFloat(lat)) && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-[999]">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-mono border border-slate-200 shadow-sm">
                {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
              </div>
              <div className="bg-teal-600/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-xs text-white font-medium shadow-sm">
                r = {radius}m
              </div>
            </div>
          )}
        </div>

        {!readOnly && (
          <p className="text-[11px] text-slate-400 text-center font-medium">
            📍 Tap "Use Current Location" or click anywhere on the map to set
            the geofence center
          </p>
        )}
      </div>
    </>
  );
}

// ─── Time Display ─────────────────────────────────────────────────────────────

function TimeRange({
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
    return h * 60 + m;
  };
  const base = toMinutes("09:00");
  const total = toMinutes("17:00") - base;
  const pct = (v: number) =>
    Math.max(0, Math.min(100, (v / total) * 100)).toFixed(1) + "%";
  const startMin = toMinutes(start || "09:00") - base;
  const endMin = toMinutes(end || "17:00") - base;
  const halfMin = toMinutes(halfDay || "13:00") - base;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Schedule Preview
      </p>
      <div className="relative h-8 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="absolute top-0 bottom-0 bg-teal-500/30 border-x-2 border-teal-500"
          style={{
            left: pct(startMin),
            right: `${100 - parseFloat(pct(endMin))}%`,
          }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-500"
          style={{ left: pct(halfMin) }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-teal-600 border-2 border-white shadow-md"
          style={{ left: `calc(${pct(startMin)} - 10px)` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-teal-600 border-2 border-white shadow-md"
          style={{ left: `calc(${pct(endMin)} - 10px)` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-teal-500" />
          Start: {start || "—"}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Half-day: {halfDay || "—"}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-teal-500" />
          End: {end || "—"}
        </span>
      </div>
    </div>
  );
}

// ─── Info Row (N/A aware) ─────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon: any;
}) {
  const displayValue = value && String(value).trim() !== "" ? value : "N/A";
  const isNA = displayValue === "N/A";
  return (
    <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-slate-50 border border-slate-100">
      <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        {label}
      </span>
      <span
        className={cn(
          "text-xs font-semibold font-mono",
          isNA ? "text-slate-400 italic" : "text-slate-800",
        )}
      >
        {displayValue}
      </span>
    </div>
  );
}

// ─── Data View (data exists — read-only with delete) ──────────────────────────

function DataView({ data, onDelete }: { data: any; onDelete: () => void }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fmt = (t?: string) => {
    if (!t || String(t).trim() === "") return "N/A";
    return t.slice(0, 5);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteLocationSettings(data.id);
      setShowDeleteDialog(false);
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
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-red-800">Delete Failed</p>
            <p className="text-xs text-red-700 opacity-80 mt-0.5">
              {deleteError}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* ── Left: Location + Map ── */}
        <div className="space-y-5">
          <Section
            title="School Location"
            description="Active geofence center and radius for teacher attendance."
            icon={MapPin}
            accent="teal"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Latitude", value: data.latitude, icon: Navigation },
                  {
                    label: "Longitude",
                    value: data.longitude,
                    icon: Navigation,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-1"
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <Icon className="h-3 w-3" />
                      {label}
                    </span>
                    <p
                      className={cn(
                        "text-sm font-bold font-mono",
                        !value || String(value).trim() === ""
                          ? "text-slate-400 italic"
                          : "text-slate-800",
                      )}
                    >
                      {value && String(value).trim() !== "" ? value : "N/A"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold text-teal-700">
                  <Shield className="h-4 w-4 text-teal-500" />
                  Allowed Radius
                </span>
                <span
                  className={cn(
                    "text-sm font-bold font-mono",
                    !data.radius || String(data.radius).trim() === ""
                      ? "text-slate-400 italic"
                      : "text-teal-800",
                  )}
                >
                  {data.radius && String(data.radius).trim() !== ""
                    ? `${data.radius} meters`
                    : "N/A"}
                </span>
              </div>

              {/* Map — only render if valid coords */}
              {data.latitude &&
                data.longitude &&
                !isNaN(parseFloat(data.latitude)) ? (
                <InteractiveMap
                  lat={data.latitude}
                  lng={data.longitude}
                  radius={data.radius || "100"}
                  onLocationSelect={() => { }}
                  readOnly
                />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 h-40 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <MapPin className="h-8 w-8" />
                  <p className="text-xs font-medium">
                    No coordinates — map unavailable
                  </p>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* ── Right: Schedule + Full Record + Actions ── */}
        <div className="space-y-5">
          <Section
            title="Working Hours"
            description="Schedule applied to teacher attendance calculation."
            icon={Clock}
            accent="slate"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Start Time",
                    value: fmt(data.start_time),
                    icon: Sunrise,
                  },
                  {
                    label: "End Time",
                    value: fmt(data.end_time),
                    icon: Sunset,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-1"
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <Icon className="h-3 w-3" />
                      {label}
                    </span>
                    <p
                      className={cn(
                        "text-sm font-bold font-mono",
                        value === "N/A"
                          ? "text-slate-400 italic"
                          : "text-slate-800",
                      )}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                  <AlarmClock className="h-4 w-4 text-amber-500" />
                  Half-Day Cutoff
                </span>
                <span
                  className={cn(
                    "text-sm font-bold font-mono",
                    fmt(data.half_day_time) === "N/A"
                      ? "text-slate-400 italic"
                      : "text-amber-800",
                  )}
                >
                  {fmt(data.half_day_time)}
                </span>
              </div>

              {data.start_time && data.end_time && (
                <TimeRange
                  start={
                    fmt(data.start_time) !== "N/A"
                      ? fmt(data.start_time)
                      : undefined
                  }
                  end={
                    fmt(data.end_time) !== "N/A"
                      ? fmt(data.end_time)
                      : undefined
                  }
                  halfDay={
                    fmt(data.half_day_time) !== "N/A"
                      ? fmt(data.half_day_time)
                      : undefined
                  }
                />
              )}
            </div>
          </Section>

          {/* Complete record */}
          <Section
            title="Complete Record"
            description="All stored fields for this configuration."
            icon={Info}
            accent="violet"
          >
            <div className="space-y-2">
              <InfoRow
                label="Latitude"
                value={data.latitude}
                icon={Navigation}
              />
              <InfoRow
                label="Longitude"
                value={data.longitude}
                icon={Navigation}
              />
              <InfoRow
                label="Radius"
                value={data.radius ? `${data.radius} meters` : null}
                icon={Shield}
              />
              <InfoRow
                label="Start Time"
                value={data.start_time?.slice(0, 5)}
                icon={Sunrise}
              />
              <InfoRow
                label="End Time"
                value={data.end_time?.slice(0, 5)}
                icon={Sunset}
              />
              <InfoRow
                label="Half-Day Cutoff"
                value={data.half_day_time?.slice(0, 5)}
                icon={AlarmClock}
              />
            </div>
          </Section>

          {/* Action buttons */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              className="flex-1 h-14 text-base rounded-2xl font-semibold border-2 border-rose-400 text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center gap-3"
            >
              <Trash2 className="h-5 w-5" />
              Delete Record
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Insert / Edit Form ───────────────────────────────────────────────────────

function LocationForm({
  initialData,
  onSaved,
}: {
  initialData?: any;
  onSaved: (data: any) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    latitude: initialData?.latitude || "",
    longitude: initialData?.longitude || "",
    radius: initialData?.radius || "100",
    start_time: initialData?.start_time || "09:00:00",
    end_time: initialData?.end_time || "17:00:00",
    half_day_time: initialData?.half_day_time || "13:00:00",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const toTimeInput = (t?: string) => t?.slice(0, 5) || "";
  const toTimeVal = (t?: string) => (t?.length === 5 ? t + ":00" : t);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveLocationSettings(form);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onSaved(form);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave}>
      {/* Cancel bar when editing */}

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-red-800">Error</p>
            <p className="text-xs text-red-700 opacity-80 mt-0.5">{error}</p>
          </div>
        </div>
      )}
      {saved && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-emerald-800">Settings Saved</p>
            <p className="text-xs text-emerald-700 opacity-80 mt-0.5">
              Location zone and schedule are now active for all teachers.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Left column */}
        <div className="space-y-5">
          <Section
            title="School Location"
            description="Use your current GPS location or click the map to set the attendance zone center."
            icon={MapPin}
            accent="teal"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Latitude" icon={Navigation} hint="e.g. 23.022505">
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="23.022505"
                    value={form.latitude}
                    onChange={set("latitude")}
                    required
                  />
                </Field>
                <Field
                  label="Longitude"
                  icon={Navigation}
                  hint="e.g. 72.571362"
                >
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="72.571362"
                    value={form.longitude}
                    onChange={set("longitude")}
                    required
                  />
                </Field>
              </div>

              <Field
                label="Allowed Radius"
                icon={Shield}
                hint="Teachers must be within this radius (in meters) to mark attendance"
              >
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="10"
                    max="5000"
                    step="10"
                    placeholder="100"
                    value={form.radius}
                    onChange={set("radius")}
                    className="flex-1"
                    required
                  />
                  <span className="text-sm font-semibold text-slate-500 shrink-0">
                    meters
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={form.radius}
                  onChange={set("radius")}
                  className="w-full mt-2 accent-teal-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>10m</span>
                  <span>500m</span>
                  <span>1000m</span>
                </div>
              </Field>

              <InteractiveMap
                lat={form.latitude}
                lng={form.longitude}
                radius={form.radius}
                onLocationSelect={(latVal, lngVal) =>
                  setForm((f) => ({
                    ...f,
                    latitude: latVal,
                    longitude: lngVal,
                  }))
                }
              />
            </div>
          </Section>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <Section
            title="Working Hours"
            description="Define the daily schedule used for attendance calculation."
            icon={Clock}
            accent="slate"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Start Time"
                  icon={Sunrise}
                  hint="School opening time"
                >
                  <Input
                    type="time"
                    value={toTimeInput(form.start_time)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        start_time: toTimeVal(e.target.value),
                      }))
                    }
                    required
                  />
                </Field>
                <Field
                  label="End Time"
                  icon={Sunset}
                  hint="School closing time"
                >
                  <Input
                    type="time"
                    value={toTimeInput(form.end_time)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        end_time: toTimeVal(e.target.value),
                      }))
                    }
                    required
                  />
                </Field>
              </div>
              <Field
                label="Half-Day Cutoff"
                icon={AlarmClock}
                hint="Teachers arriving after this time are marked as half-day"
              >
                <Input
                  type="time"
                  value={toTimeInput(form.half_day_time)}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      half_day_time: toTimeVal(e.target.value),
                    }))
                  }
                  required
                />
              </Field>
              <TimeRange
                start={toTimeInput(form.start_time)}
                end={toTimeInput(form.end_time)}
                halfDay={toTimeInput(form.half_day_time)}
              />
            </div>
          </Section>

          <Section
            title="Configuration Preview"
            description="Settings to be saved."
            icon={CheckCircle2}
            accent="violet"
          >
            <div className="space-y-2">
              {[
                {
                  label: "Latitude",
                  value: form.latitude || "—",
                  icon: Navigation,
                },
                {
                  label: "Longitude",
                  value: form.longitude || "—",
                  icon: Navigation,
                },
                {
                  label: "Radius",
                  value: form.radius ? `${form.radius} meters` : "—",
                  icon: Shield,
                },
                {
                  label: "Work Hours",
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
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl px-4 py-2.5 bg-slate-50 border border-slate-100"
                >
                  <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Icon className="h-3.5 w-3.5 text-slate-400" />
                    {label}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 font-mono">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full h-14 text-base rounded-2xl font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xl shadow-teal-500/20 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving Settings...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {"Save Attendance Zone"}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LocationSettingsPage() {
  // "loading" | "view" | "empty" | "form"
  const [pageState, setPageState] = useState<
    "loading" | "view" | "empty" | "form"
  >("loading");
  const [existingData, setExistingData] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadData = async () => {
    setPageState("loading");
    setFetchError(null);
    try {
      const data = await getLocationSettings();
      const hasData =
        data &&
        (String(data.latitude || "").trim() !== "" ||
          String(data.longitude || "").trim() !== "");

      if (hasData) {
        setExistingData(data);
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
        setFetchError(err.message || "Failed to load settings.");
        setExistingData(null);
        setPageState("empty");
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600 shadow-sm border border-teal-500/20">
          <Radar className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Attendance Zone Settings
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Configure geofence boundaries and working hours for teacher
            attendance.
          </p>
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Fetch error banner */}
      {fetchError && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-amber-800">
              Could not load existing settings
            </p>
            <p className="text-xs text-amber-700 opacity-80 mt-0.5">
              {fetchError} — You can still configure and save below.
            </p>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {pageState === "loading" && (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            <p className="text-sm font-medium">
              Loading attendance zone settings...
            </p>
          </div>
        </div>
      )}

      {/* ── Data exists ── */}
      {pageState === "view" && existingData && (
        <DataView
          data={existingData}
          onDelete={() => {
            setExistingData(null);
            setPageState("empty");
          }}
        />
      )}

      {/* ── No data: empty state ── */}
      {pageState === "empty" && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 flex flex-col items-center gap-6 text-center px-6">
          <div className="h-20 w-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <MapPin className="h-10 w-10 text-slate-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-700">
              No Attendance Zone Configured
            </h3>
            <p className="text-sm text-slate-500 max-w-md leading-relaxed">
              No location settings found. Configure the geofence center, allowed
              radius, and working hours so teachers can mark attendance.
            </p>
          </div>

          {/* N/A summary grid */}
          <div className="w-full max-w-md grid grid-cols-2 gap-2 text-left">
            {[
              { label: "Latitude", icon: Navigation },
              { label: "Longitude", icon: Navigation },
              { label: "Radius", icon: Shield },
              { label: "Start Time", icon: Sunrise },
              { label: "End Time", icon: Sunset },
              { label: "Half-Day Cutoff", icon: AlarmClock },
            ].map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-white border border-slate-200"
              >
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <Icon className="h-3 w-3 text-slate-400" />
                  {label}
                </span>
                <span className="text-[11px] font-semibold text-slate-400 italic font-mono">
                  N/A
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPageState("form")}
            className="h-12 px-8 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-teal-500/25 transition-all active:scale-[0.98] flex items-center gap-2.5"
          >
            <Save className="h-4 w-4" />
            Configure Attendance Zone
          </button>
        </div>
      )}

      {/* ── Form (insert or edit) ── */}
      {pageState === "form" && (
        <LocationForm
          initialData={existingData}
          onSaved={(savedData) => {
            setExistingData(savedData);
            setPageState("view");
          }}
        />
      )}
    </div>
  );
}
