"use client";

import React from "react";
import { cn } from "../../lib/utils";

interface FloatingPanelProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "compact";
}

const FloatingPanel = React.forwardRef<HTMLDivElement, FloatingPanelProps>(
  (
    { children, className, size = "md", variant = "default", ...props },
    ref,
  ) => {
    const sizeClasses = {
      sm: "p-2 space-y-2",
      md: "p-4 space-y-3",
      lg: "p-6 space-y-4",
    };

    const variantClasses = {
      default: "space-y-3",
      compact: "space-y-2",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "floating-panel",
          sizeClasses[size],
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

FloatingPanel.displayName = "FloatingPanel";

interface FloatingPanelHeaderProps {
  children: React.ReactNode;
  className?: string;
}

const FloatingPanelHeader: React.FC<FloatingPanelHeaderProps> = ({
  children,
  className,
}) => (
  <h3
    className={cn(
      "text-sm font-semibold text-axiom-neutral-700 dark:text-axiom-neutral-300",
      className,
    )}
  >
    {children}
  </h3>
);

interface FloatingPanelContentProps {
  children: React.ReactNode;
  className?: string;
}

const FloatingPanelContent: React.FC<FloatingPanelContentProps> = ({
  children,
  className,
}) => <div className={cn("space-y-2", className)}>{children}</div>;

interface FloatingPanelItemProps {
  label: string;
  value: string | number;
  className?: string;
  mono?: boolean;
}

const FloatingPanelItem: React.FC<FloatingPanelItemProps> = ({
  label,
  value,
  className,
  mono = false,
}) => (
  <div className={cn("flex justify-between items-center", className)}>
    <span className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400">
      {label}
    </span>
    <span
      className={cn(
        "text-sm text-axiom-neutral-900 dark:text-axiom-neutral-100",
        mono && "font-mono",
      )}
    >
      {value}
    </span>
  </div>
);

interface FloatingPanelSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const FloatingPanelSection: React.FC<FloatingPanelSectionProps> = ({
  title,
  children,
  className,
}) => (
  <div className={cn("space-y-2", className)}>
    <div className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400">
      {title}
    </div>
    {children}
  </div>
);

interface FloatingPanelDividerProps {
  className?: string;
}

const FloatingPanelDivider: React.FC<FloatingPanelDividerProps> = ({
  className,
}) => (
  <div
    className={cn(
      "border-t border-axiom-neutral-200 dark:border-axiom-neutral-700",
      className,
    )}
  />
);

// Pre-built variants for common use cases

interface FloatingCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const FloatingCard: React.FC<FloatingCardProps> = ({
  title,
  children,
  className,
}) => (
  <FloatingPanel className={className}>
    <FloatingPanelHeader>{title}</FloatingPanelHeader>
    <FloatingPanelContent>{children}</FloatingPanelContent>
  </FloatingPanel>
);

interface FloatingStatsProps {
  title: string;
  stats: Array<{ label: string; value: string | number; mono?: boolean }>;
  className?: string;
}

const FloatingStats: React.FC<FloatingStatsProps> = ({
  title,
  stats,
  className,
}) => (
  <FloatingPanel className={className}>
    <FloatingPanelHeader>{title}</FloatingPanelHeader>
    <FloatingPanelContent>
      {stats.map((stat, index) => (
        <FloatingPanelItem
          key={index}
          label={stat.label}
          value={stat.value}
          mono={stat.mono}
        />
      ))}
    </FloatingPanelContent>
  </FloatingPanel>
);

interface FloatingHelpProps {
  instructions: string[];
  action?: string;
  className?: string;
}

const FloatingHelp: React.FC<FloatingHelpProps> = ({
  instructions,
  action,
  className,
}) => (
  <FloatingPanel size="sm" variant="compact" className={className}>
    <div className="text-xs text-axiom-neutral-600 dark:text-axiom-neutral-400">
      {instructions.map((instruction, index) => (
        <span
          key={index}
          className={index > 0 ? "hidden md:inline" : "md:hidden"}
        >
          {instruction}
        </span>
      ))}
    </div>
    {action && (
      <div className="text-xs text-axiom-primary-500 font-medium mt-1">
        {action}
      </div>
    )}
  </FloatingPanel>
);

export {
  FloatingPanel,
  FloatingPanelHeader,
  FloatingPanelContent,
  FloatingPanelItem,
  FloatingPanelSection,
  FloatingPanelDivider,
  // Pre-built variants
  FloatingCard,
  FloatingStats,
  FloatingHelp,
};
