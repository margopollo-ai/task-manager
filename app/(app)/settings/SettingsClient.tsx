"use client";

import { useState } from "react";
import { Settings } from "lucide-react";

const TIMEZONES = [
  { value: "Pacific/Honolulu",      label: "Hawaii (UTC−10)" },
  { value: "America/Anchorage",     label: "Alaska (UTC−9)" },
  { value: "America/Los_Angeles",   label: "Pacific Time (UTC−8/−7)" },
  { value: "America/Denver",        label: "Mountain Time (UTC−7/−6)" },
  { value: "America/Chicago",       label: "Central Time (UTC−6/−5)" },
  { value: "America/New_York",      label: "Eastern Time (UTC−5/−4)" },
  { value: "America/Sao_Paulo",     label: "Brasília (UTC−3)" },
  { value: "Europe/London",         label: "London (UTC+0/+1)" },
  { value: "Europe/Paris",          label: "Paris / Berlin (UTC+1/+2)" },
  { value: "Europe/Moscow",         label: "Moscow (UTC+3)" },
  { value: "Asia/Dubai",            label: "Dubai (UTC+4)" },
  { value: "Asia/Kolkata",          label: "India (UTC+5:30)" },
  { value: "Asia/Singapore",        label: "Singapore (UTC+8)" },
  { value: "Asia/Tokyo",            label: "Tokyo (UTC+9)" },
  { value: "Australia/Sydney",      label: "Sydney (UTC+10/+11)" },
  { value: "UTC",                   label: "UTC" },
];

interface Props {
  timezone: string;
}

export default function SettingsClient({ timezone: initialTimezone }: Props) {
  const [timezone, setTimezone] = useState(initialTimezone);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSave() {
    setSaveState("saving");
    const res = await fetch("/api/users/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone }),
    });
    if (res.ok) {
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } else {
      setSaveState("error");
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-gray-600" />
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
      </div>

      <div className="bg-white border border-[#dadce0] rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={saveState === "saving"}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            saveState === "saved"  ? "bg-green-100 text-green-700 border border-green-200" :
            saveState === "error"  ? "bg-red-100 text-red-700 border border-red-200" :
            "bg-[#1a73e8] text-white hover:bg-[#1765cc]"
          }`}
        >
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved!" : saveState === "error" ? "Error saving" : "Save"}
        </button>
      </div>
    </div>
  );
}
