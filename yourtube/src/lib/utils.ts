import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getMediaUrl(filepath: string | undefined): string {
  if (!filepath) return "";
  if (filepath.startsWith("http://") || filepath.startsWith("https://")) {
    return filepath;
  }
  const baseUrl = (process.env.BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  const cleanPath = filepath.replace(/^\//, "").replace(/\\/g, "/");
  return `${baseUrl}/${cleanPath}`;
}

