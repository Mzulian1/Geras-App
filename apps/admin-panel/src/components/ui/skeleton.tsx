import { cn } from "@/lib/utils";

/** Placeholder de carga (loading state) para tablas y formularios. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
