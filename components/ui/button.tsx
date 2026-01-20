import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  `
    inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm
    font-medium whitespace-nowrap transition-all duration-200 ease-out
    outline-none
    focus-visible:ring-2 focus-visible:ring-foreground/20
    focus-visible:ring-offset-2 focus-visible:ring-offset-background
    active:scale-[0.98]
    disabled:pointer-events-none disabled:opacity-50
    aria-invalid:border-destructive aria-invalid:ring-destructive/20
    dark:aria-invalid:ring-destructive/40
    [&_svg]:pointer-events-none [&_svg]:shrink-0
    [&_svg:not([class*='size-'])]:size-4
  `,
  {
    variants: {
      variant: {
        default: `
          bg-foreground/90 text-background shadow-sm
          hover:bg-foreground hover:shadow-md
        `,
        destructive: `
            bg-destructive text-white
            hover:bg-destructive/90
            focus-visible:ring-destructive/20
            dark:bg-destructive/60
            dark:focus-visible:ring-destructive/40
          `,
        outline: `
            border border-foreground/10 bg-transparent text-foreground/80
            hover:border-foreground/20 hover:bg-foreground/5
            hover:text-foreground
          `,
        secondary: `
            border border-foreground/5 bg-foreground/5 text-foreground/80
            hover:border-foreground/10 hover:bg-foreground/10
            hover:text-foreground
          `,
        ghost: `
            text-foreground/70
            hover:bg-foreground/5 hover:text-foreground
          `,
        link: `
          text-foreground/70 underline-offset-4
          hover:text-foreground hover:underline
        `,
      },
      size: {
        default: `
          h-9 px-4 py-2
          has-[>svg]:px-3
        `,
        sm: `
          h-8 gap-1.5 rounded-md px-3
          has-[>svg]:px-2.5
        `,
        lg: `
          h-10 rounded-md px-6
          has-[>svg]:px-4
        `,
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type = "button",
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      {...(!asChild && { type })}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button };
