import { AccountSettingsHub } from "@/components/settings/account-settings-hub";

export default function UserSettingsPage() {
  return (
    <AccountSettingsHub
      roleTitle="Staff"
      pageTitle="Staff Account & Security Settings"
      pageSubtitle="Manage your profile information and update your portal password."
    />
  );
}
