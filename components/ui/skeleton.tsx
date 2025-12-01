import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "animate-pulse-slow rounded-md bg-muted/60",
        "transition-opacity duration-500 ease-in-out",
        className
      )} 
      {...props} 
    />
  );
}

export { Skeleton };
