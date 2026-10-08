import { ReportsView } from "@/components/dashboard/ReportsView";

export const metadata = {
  title: "Reports: Phoneme Builder",
  description: "Word list, activity configuration and generation history reports with CSV export.",
};

export default function ReportsPage() {
  return <ReportsView />;
}
