import { AccountSettingsHub } from "@/components/settings/account-settings-hub";

export default function TeacherSettingsPage() {
  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
      <AccountSettingsHub
        roleTitle="Teacher"
        pageTitle="Faculty Account & Security Settings"
        pageSubtitle="View your academic department profile and change your faculty login password."
      />
    </div>
  );
}
