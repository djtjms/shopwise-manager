import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-4">
          <SettingsIcon className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Shop Configuration</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Settings page coming soon. You'll be able to configure shop details, tax rates, receipt templates, and more.
        </p>
      </div>
    </div>
  );
}
