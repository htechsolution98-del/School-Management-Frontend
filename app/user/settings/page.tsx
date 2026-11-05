import { AccountSettingsHub } from "@/components/settings/account-settings-hub";

export default function UserSettingsPage() {
  return (
    <AccountSettingsHub
      roleTitle="Applicant"
      pageTitle="Applicant Account & Security Settings"
      pageSubtitle="Manage your admission account information and update your portal password."
    />
  );
}
