"use client";

import React from "react";
import { cn } from "../../lib/utils";

// Main text component for body text
interface TextProps {
  children: React.ReactNode;
  className?: string;
  variant?: "body" | "secondary" | "primary" | "muted";
}

const Text: React.FC<TextProps> = ({
  children,
  className,
  variant = "body",
}) => {
  const variantClasses = {
    body: "text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400",
    secondary: "text-xs text-axiom-neutral-500 dark:text-axiom-neutral-500",
    primary: "text-sm text-axiom-neutral-900 dark:text-axiom-neutral-100",
    muted: "text-xs text-axiom-neutral-400 dark:text-axiom-neutral-600",
  };

  return (
    <span className={cn(variantClasses[variant], className)}>{children}</span>
  );
};

// Header text component
interface HeadingProps {
  children: React.ReactNode;
  className?: string;
  level?: 1 | 2 | 3 | 4;
}

const Heading: React.FC<HeadingProps> = ({
  children,
  className,
  level = 3,
}) => {
  const levelClasses = {
    1: "text-xl font-bold text-axiom-neutral-800 dark:text-axiom-neutral-200",
    2: "text-lg font-semibold text-axiom-neutral-700 dark:text-axiom-neutral-300",
    3: "text-sm font-semibold text-axiom-neutral-700 dark:text-axiom-neutral-300",
    4: "text-xs font-medium text-axiom-neutral-600 dark:text-axiom-neutral-400",
  };

  if (level === 1) {
    return <h1 className={cn(levelClasses[level], className)}>{children}</h1>;
  }
  if (level === 2) {
    return <h2 className={cn(levelClasses[level], className)}>{children}</h2>;
  }
  if (level === 4) {
    return <h4 className={cn(levelClasses[level], className)}>{children}</h4>;
  }
  return <h3 className={cn(levelClasses[level], className)}>{children}</h3>;
};

// Monospace text for values/codes
interface MonoProps {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary";
}

const Mono: React.FC<MonoProps> = ({
  children,
  className,
  variant = "primary",
}) => {
  const variantClasses = {
    primary:
      "font-mono text-sm text-axiom-neutral-900 dark:text-axiom-neutral-100",
    secondary:
      "font-mono text-xs text-axiom-neutral-600 dark:text-axiom-neutral-400",
  };

  return (
    <span className={cn(variantClasses[variant], className)}>{children}</span>
  );
};

// Accent text for highlights
interface AccentProps {
  children: React.ReactNode;
  className?: string;
  color?: "primary" | "success" | "warning" | "error";
}

const Accent: React.FC<AccentProps> = ({
  children,
  className,
  color = "primary",
}) => {
  const colorClasses = {
    primary: "text-axiom-primary-500 font-medium",
    success: "text-axiom-success-500 font-medium",
    warning: "text-axiom-warning-500 font-medium",
    error: "text-axiom-error-500 font-medium",
  };

  return (
    <span className={cn("text-xs", colorClasses[color], className)}>
      {children}
    </span>
  );
};

// Label text for form fields and descriptions
interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

const Label: React.FC<LabelProps> = ({ children, className }) => (
  <label
    className={cn(
      "text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400 font-medium",
      className,
    )}
  >
    {children}
  </label>
);

export { Text, Heading, Mono, Accent, Label };
