import { Plug } from "lucide-react";

import FeaturePlaceholder from "@/components/ui/FeaturePlaceholder";

export default function IntegrationsPage() {
  return (
    <FeaturePlaceholder
      title="Integrations"
      description="Connections to external agricultural systems and data providers will be available here once their secure integration workflows are complete."
      icon={Plug}
    />
  );
}