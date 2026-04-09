import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function PageHeader({ title, description, actionLabel, onAction }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
