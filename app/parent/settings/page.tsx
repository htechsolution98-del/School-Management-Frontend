import { AccountSettingsHub } from "@/components/settings/account-settings-hub";

export default function ParentSettingsPage() {
  return (
    <AccountSettingsHub
      roleTitle="Parent"
      pageTitle="Parent Account & Security Settings"
      pageSubtitle="View your parent guardian profile and update your login password."
    />
  );
}
