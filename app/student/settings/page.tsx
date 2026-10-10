import { AccountSettingsHub } from "@/components/settings/account-settings-hub";

export default function StudentSettingsPage() {
  return (
    <AccountSettingsHub
      roleTitle="Student"
      pageTitle="Student Account & Security Settings"
      pageSubtitle="View your enrollment and class records and update your student portal password."
    />
  );
}
