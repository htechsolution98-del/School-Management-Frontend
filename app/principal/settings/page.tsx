import { AccountSettingsHub } from "@/components/settings/account-settings-hub";

export default function PrincipalSettingsPage() {
  return (
    <AccountSettingsHub
      roleTitle="Principal"
      pageTitle="Principal Account & Security Settings"
      pageSubtitle="View your administrator credentials and change your portal password."
    />
  );
}
