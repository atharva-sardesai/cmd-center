import * as React from "react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type GlassPanelProps = React.ComponentProps<typeof Card> & {
  variant?: "default" | "left"
}

function GlassPanel({ className, variant = "default", ...props }: GlassPanelProps) {
  return (
    <Card
      data-glass-panel={variant}
      className={cn(
        "glass-panel gap-0 overflow-hidden rounded-[12px] p-0 text-[var(--text-primary)]",
        variant === "left" && "glass-panel-left",
        className
      )}
      {...props}
    />
  )
}

export { GlassPanel }
