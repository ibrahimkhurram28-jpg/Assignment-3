import { DashboardView } from "@/components/dashboard/DashboardView";

export const metadata = {
  title: "Dashboard: Phoneme Builder",
  description: "Health status, usage statistics, alerts and activity reports for the Phoneme Builder.",
};

export default function DashboardPage() {
  return <DashboardView />;
}
