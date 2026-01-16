import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sortDays(days: string[]): string[] {
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return [...days].sort((a, b) => {
    // Handle both full names and abbreviations
    const indexA = dayOrder.findIndex(d => d.toLowerCase().startsWith(a.toLowerCase()));
    const indexB = dayOrder.findIndex(d => d.toLowerCase().startsWith(b.toLowerCase()));
    return indexA - indexB;
  });
}
