import * as React from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  className,
  elevated = false,
  focus = false,
  ...props
}: React.ComponentProps<"div"> & {
  elevated?: boolean;
  focus?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl p-5 sm:p-6",
        focus ? "surface-card-focus" : elevated ? "surface-card-elevated" : "surface-card",
        className
      )}
      {...props}
    />
  );
}

