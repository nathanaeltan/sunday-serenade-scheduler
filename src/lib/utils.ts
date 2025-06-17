import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility to hash a string using SHA-256 with a salt
export async function sha256(message: string, salt: string = ''): Promise<string> {
  const saltedMessage = message + salt; // Prepend or append salt to the message
  const msgBuffer = new TextEncoder().encode(saltedMessage); // Encode as UTF-8
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer); // Hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // Convert buffer to byte array
  const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // Convert bytes to hex string
  return hexHash;
}
