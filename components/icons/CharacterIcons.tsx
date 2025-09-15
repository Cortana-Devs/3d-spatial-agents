"use client";

import React from "react";

interface IconProps {
  size?: number;
  className?: string;
}

// Executive/Business Professional Icon
export function ExecutiveIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M20 7H4C3.45 7 3 7.45 3 8V19C3 19.55 3.45 20 4 20H20C20.55 20 21 19.55 21 19V8C21 7.45 20.55 7 20 7Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M16 7V5C16 4.45 15.55 4 15 4H9C8.45 4 8 4.45 8 5V7"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="12" cy="13" r="2" fill="currentColor" fillOpacity="0.3" />
      <path
        d="M12 15C10.34 15 9 16.34 9 18H15C15 16.34 13.66 15 12 15Z"
        fill="currentColor"
        fillOpacity="0.3"
      />
    </svg>
  );
}

// Virtual Assistant Icon
export function AssistantIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M9.5 9C9.5 8.17 10.17 7.5 11 7.5C11.83 7.5 12.5 8.17 12.5 9"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M14.5 9C14.5 8.17 15.17 7.5 16 7.5C16.83 7.5 17.5 8.17 17.5 9"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="9" cy="11" r="1" fill="currentColor" />
      <circle cx="15" cy="11" r="1" fill="currentColor" />
      <path
        d="M8 15C8 15 10 17 12 17C14 17 16 15 16 15"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Creative Director Icon
export function CreativeIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path
        d="M10 4L12 2L14 4L12 6L10 4Z"
        fill="currentColor"
        fillOpacity="0.3"
      />
    </svg>
  );
}

// Parent/Family Icon
export function ParentIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" fillOpacity="0.5" />
      <circle cx="15" cy="10" r="1.5" fill="currentColor" fillOpacity="0.5" />
      <path
        d="M12 13C10.5 13 9.5 14 9.5 15H14.5C14.5 14 13.5 13 12 13Z"
        fill="currentColor"
        fillOpacity="0.3"
      />
    </svg>
  );
}

// Team Leader Icon
export function LeaderIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <circle cx="12" cy="10" r="2" fill="currentColor" fillOpacity="0.3" />
      <path
        d="M6 18C6 16 8 14 12 14C16 14 18 16 18 18"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

// Custom Character Icon
export function CustomIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle
        cx="12"
        cy="8"
        r="4"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M6 21V19C6 16.79 7.79 15 10 15H14C16.21 15 18 16.79 18 19V21"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M19 7L21 9L19 11"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M5 7L3 9L5 11"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Receptionist Icon
export function ReceptionistIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="2"
        y="10"
        width="20"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <circle cx="12" cy="6" r="3" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
      <path
        d="M8 14H16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 17H13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="18" cy="14" r="1" fill="currentColor" />
      <circle cx="18" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

// Teacher/Educator Icon
export function TeacherIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M6 8H18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6 11H15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="19" r="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
      <path
        d="M8 17L12 17L16 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Customer Service Icon
export function CustomerServiceIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle
        cx="12"
        cy="8"
        r="4"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M6 21V19C6 16.79 7.79 15 10 15H14C16.21 15 18 16.79 18 19V21"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M8 8C8 8 8 6 10 6"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M16 8C16 8 16 6 14 6"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="20" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.3" />
      <path d="M18 14L22 14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

// Security Guard Icon
export function SecurityIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 2L3 7L12 12L21 7L12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M3 7V17L12 22L21 17V7"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M12 12V22"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="12" cy="9" r="1.5" fill="currentColor" />
      <path
        d="M10.5 15L11.5 16L13.5 14"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Student Icon
export function StudentIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle
        cx="12"
        cy="8"
        r="4"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M6 21V19C6 16.79 7.79 15 10 15H14C16.21 15 18 16.79 18 19V21"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <rect
        x="8"
        y="2"
        width="8"
        height="2"
        rx="1"
        fill="currentColor"
        fillOpacity="0.3"
      />
      <path
        d="M9 16L10 17L12 15"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Export all icons
export const CharacterIcons = {
  Executive: ExecutiveIcon,
  Assistant: AssistantIcon,
  Creative: CreativeIcon,
  Parent: ParentIcon,
  Leader: LeaderIcon,
  Custom: CustomIcon,
  Receptionist: ReceptionistIcon,
  Teacher: TeacherIcon,
  CustomerService: CustomerServiceIcon,
  Security: SecurityIcon,
  Student: StudentIcon,
};

// Default export for convenience
export default CharacterIcons;
