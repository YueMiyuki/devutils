import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground/50",
        "flex field-sizing-content min-h-20 w-full rounded-xl",
        "border border-foreground/10 bg-foreground/2 px-4 py-3 text-base",
        "transition-all duration-200 outline-none",
        "hover:border-foreground/15 hover:bg-foreground/3",
        `
          focus-visible:border-foreground/20 focus-visible:bg-foreground/4
          focus-visible:ring-2 focus-visible:ring-foreground/10
        `,
        `
          aria-invalid:border-destructive aria-invalid:ring-destructive/20
          dark:aria-invalid:ring-destructive/40
        `,
        `
          disabled:cursor-not-allowed disabled:opacity-50
          md:text-sm
        `,
        "resize-none",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
