"use client";

import { useEffect, useState } from "react";
import {
  Percent,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { getAcademicYearsForPrincipal } from "@/lib/principal/academic-year";
import {
  getWeightageConfigs,
  createWeightageConfig,
  saveWeightageComponents,
  toggleWeightageLock,
  type ResultWeightageConfig,
  type ResultWeightageComponent,
} from "@/lib/exam-api";

export default function WeightageConfigPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [currentConfig, setCurrentConfig] = useState<ResultWeightageConfig | null>(null);

  const [components, setComponents] = useState<ResultWeightageComponent[]>([
    { name: "Term 1 Examination", component_type: "EXAM", weightage_percentage: 40, sequence: 1 },
    { name: "Term 2 Examination", component_type: "EXAM", weightage_percentage: 40, sequence: 2 },
    { name: "Attendance Percentage", component_type: "ATTENDANCE", weightage_percentage: 10, sequence: 3 },
    { name: "Teacher Assessment", component_type: "TEACHER_ASSESSMENT", weightage_percentage: 10, sequence: 4 },
  ]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load initial academic years and weightage config
  const loadData = async () => {
    setIsLoading(true);
    try {
      const years = await getAcademicYearsForPrincipal();
      setAcademicYears(years || []);

      if (years && years.length > 0) {
        const activeYr = years.find((y: any) => y.is_active) || years[0];
        const yrId = selectedYearId || String(activeYr.id);
        setSelectedYearId(yrId);

        const configs = await getWeightageConfigs(Number(yrId));
        if (configs && configs.length > 0) {
          const cfg = configs[0];
          setCurrentConfig(cfg);
          if (cfg.components && cfg.components.length > 0) {
            setComponents(
              cfg.components.map((c) => ({
                id: c.id,
                name: c.name,
                component_type: c.component_type,
                weightage_percentage: Number(c.weightage_percentage),
                sequence: c.sequence,
              }))
            );
          }
        } else {
          setCurrentConfig(null);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load weightage configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYearId]);

  // Calculate live sum
  const totalPercentage = components.reduce((acc, c) => acc + (Number(c.weightage_percentage) || 0), 0);
  const isValid100 = Math.abs(totalPercentage - 100) < 0.01;

  // Add new component
  const handleAddComponent = () => {
    setComponents((prev) => [
      ...prev,
      {
        name: `Component ${prev.length + 1}`,
        component_type: "EXAM",
        weightage_percentage: 0,
        sequence: prev.length + 1,
      },
    ]);
  };

  // Remove component
  const handleRemoveComponent = (index: number) => {
    if (components.length <= 1) {
      toast.error("At least one dynamic weightage component is required.");
      return;
    }
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  // Change component property
  const handleComponentChange = (index: number, field: keyof ResultWeightageComponent, val: any) => {
    setComponents((prev) =>
      prev.map((c, i) => {
        if (i === index) {
          return {
            ...c,
            [field]: field === "weightage_percentage" ? Number(val) || 0 : val,
          };
        }
        return c;
      })
    );
  };

  // Save Config and Components
  const handleSave = async () => {
    if (!selectedYearId) return;

    if (!isValid100) {
      toast.error(`Total weightage sum is ${totalPercentage}%. Sum of all components MUST equal 100%!`);
      return;
    }

    setIsSaving(true);
    try {
      let cfgId = currentConfig?.id;
      if (!cfgId) {
        const newCfg = await createWeightageConfig(Number(selectedYearId), "Academic Year Dynamic Weightage");
        cfgId = newCfg.id;
      }

      const res = await saveWeightageComponents(cfgId, components);
      toast.success("🎉 Dynamic Result Weightage saved and activated successfully!");
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save weightage components.");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Lock
  const handleToggleLock = async () => {
    if (!currentConfig) return;
    try {
      const res = await toggleWeightageLock(currentConfig.id);
      toast.success(res.message || "Updated lock status.");
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to toggle lock.");
    }
  };

  const isLocked = currentConfig?.is_locked || false;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Percent className="h-6 w-6 text-indigo-600" />
              Dynamic Result Weightage Builder
            </h1>
            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200">
              100% Fully Dynamic
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Define dynamic components (Terms, Attendance, Assessment, Projects) & assign weightage percentages. Total must sum to 100%.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedYearId} onValueChange={(val) => { if (val) setSelectedYearId(val); }}>
            <SelectTrigger className="w-52 h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 font-semibold">
              <SelectValue placeholder="Select Academic Year">
                {academicYears.find((y) => String(y.id) === selectedYearId)
                  ? (academicYears.find((y) => String(y.id) === selectedYearId).name ||
                     `${academicYears.find((y) => String(y.id) === selectedYearId).start_year || ""}-${academicYears.find((y) => String(y.id) === selectedYearId).end_year || ""}`.replace(/^-$/, "") ||
                     `Academic Year #${selectedYearId}`)
                  : "Select Academic Year"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((y) => {
                const label = y.name || (y.start_year && y.end_year ? `${y.start_year}-${y.end_year}` : `Academic Year #${y.id}`);
                return (
                  <SelectItem key={y.id} value={String(y.id)}>
                    {label} {y.is_active ? "(Active)" : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {currentConfig && (
            <Button
              size="sm"
              variant={isLocked ? "destructive" : "outline"}
              onClick={handleToggleLock}
              className="rounded-xl text-xs gap-1.5"
            >
              {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              {isLocked ? "Locked" : "Lock Config"}
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || isLocked || !isValid100}
            className={`rounded-xl text-xs gap-1.5 font-bold shadow-xs ${
              !isValid100 || isLocked
                ? "bg-zinc-300 text-zinc-600 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-500"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save & Activate
          </Button>
        </div>
      </div>

      {/* Validation Banner */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 shadow-2xs ${
          isValid100
            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200"
            : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200"
        }`}
      >
        <div className="flex items-center gap-3">
          {isValid100 ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
          )}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">
              {isValid100 ? "Valid Weightage Configuration (Sum = 100%)" : "Invalid Weightage Sum"}
            </h4>
            <p className="text-xs mt-0.5 opacity-90">
              {isValid100
                ? "Total weightage equals 100%. The Result Engine can process final report cards using this dynamic breakdown."
                : `Total weightage is currently ${totalPercentage}%. Adjust component percentages until the total equals 100%.`}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs uppercase font-semibold block text-slate-500">Live Total:</span>
          <span
            className={`text-2xl font-black font-mono ${
              isValid100 ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
            }`}
          >
            {totalPercentage}% / 100%
          </span>
        </div>
      </div>

      {/* Component Editor Table Card */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600" />
                Dynamic Component Weightage Breakdown
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Add custom evaluation components and set their percentage contribution towards the final 100% result.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-indigo-600" /> Select Academic Year:
                </label>
                <Select value={selectedYearId} onValueChange={(val) => { if (val) setSelectedYearId(val); }}>
                  <SelectTrigger className="w-56 h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 font-bold border-indigo-200">
                    <SelectValue placeholder="Select Academic Year...">
                      {academicYears.find((y) => String(y.id) === selectedYearId)
                        ? (academicYears.find((y) => String(y.id) === selectedYearId).name ||
                           `${academicYears.find((y) => String(y.id) === selectedYearId).start_year || ""}-${academicYears.find((y) => String(y.id) === selectedYearId).end_year || ""}`.replace(/^-$/, "") ||
                           `Academic Year #${selectedYearId}`)
                        : "Select Academic Year..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((y) => {
                      const label = y.name || (y.start_year && y.end_year ? `${y.start_year}-${y.end_year}` : `Academic Year #${y.id}`);
                      return (
                        <SelectItem key={y.id} value={String(y.id)}>
                          {label} {y.is_active ? "(Active Year)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="sm"
                onClick={handleAddComponent}
                disabled={isLocked}
                className="rounded-xl text-xs gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 font-bold self-end h-9"
              >
                <Plus className="h-3.5 w-3.5" /> Add Custom Component
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" /> Loading dynamic configuration...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-zinc-800/50">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold text-xs">Seq</TableHead>
                    <TableHead className="font-bold text-xs">Component Name</TableHead>
                    <TableHead className="w-48 font-bold text-xs">Component Type</TableHead>
                    <TableHead className="w-40 text-center font-bold text-xs">Weightage %</TableHead>
                    <TableHead className="w-20 text-center font-bold text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {components.map((comp, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center font-mono font-bold text-xs text-slate-500">
                        {idx + 1}
                      </TableCell>

                      {/* Component Name */}
                      <TableCell>
                        <Input
                          type="text"
                          value={comp.name}
                          disabled={isLocked}
                          onChange={(e) => handleComponentChange(idx, "name", e.target.value)}
                          placeholder="e.g. Term 1 Examination"
                          className="h-8 text-xs font-semibold rounded-lg"
                        />
                      </TableCell>

                      {/* Component Type */}
                      <TableCell>
                        <Select
                          value={comp.component_type}
                          disabled={isLocked}
                          onValueChange={(val: any) => handleComponentChange(idx, "component_type", val)}
                        >
                          <SelectTrigger className="h-8 text-xs rounded-lg bg-white dark:bg-zinc-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EXAM">Examination</SelectItem>
                            <SelectItem value="ATTENDANCE">Attendance Percentage</SelectItem>
                            <SelectItem value="TEACHER_ASSESSMENT">Teacher Assessment</SelectItem>
                            <SelectItem value="CUSTOM">Custom Project / Test</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Weightage Percentage */}
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={comp.weightage_percentage}
                            disabled={isLocked}
                            onChange={(e) => handleComponentChange(idx, "weightage_percentage", e.target.value)}
                            className="h-8 w-24 text-center font-mono font-bold text-xs text-indigo-600 rounded-lg"
                          />
                          <span className="text-xs font-bold text-slate-500">%</span>
                        </div>
                      </TableCell>

                      {/* Delete Action */}
                      <TableCell className="text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={isLocked}
                          onClick={() => handleRemoveComponent(idx)}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
