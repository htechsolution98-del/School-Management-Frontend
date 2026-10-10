import { AccountSettingsHub } from "@/components/settings/account-settings-hub";

export default function TeacherSettingsPage() {
  return (
    <AccountSettingsHub
      roleTitle="Teacher"
      pageTitle="Faculty Account & Security Settings"
      pageSubtitle="View your academic department profile and change your faculty login password."
    />
  );
}
