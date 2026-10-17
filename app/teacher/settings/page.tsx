import { AccountSettingsHub } from "@/components/settings/account-settings-hub";

export default function TeacherSettingsPage() {
  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28 lg:pb-8 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      <AccountSettingsHub
        roleTitle="Teacher"
        pageTitle="Faculty Account & Security Settings"
        pageSubtitle="View your academic department profile and change your faculty login password."
      />
    </div>
  );
}
