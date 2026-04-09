import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ title, value, icon: Icon, description, className }: StatCardProps) {
  return (
    <div className={`stat-card ${className || ""}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </div>
  );
}
