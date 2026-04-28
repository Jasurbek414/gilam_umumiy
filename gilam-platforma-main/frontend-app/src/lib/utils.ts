import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility function to correctly merge tailwind classes */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
