import { generateUUID } from "@/common/uuid";

export const MAX_FILENAME_FINAL_CHARS_LENGTH = 512;

/**
 * Formats `fileName` into a safe-to-store name, i.e., with only letters, numbers and
 * characters that are unlike to cause any problem within storage drivers.
 */
export function sanitizeFilename(fileName: string) {
  return fileName
    .normalize("NFD") // separates diacritics (à -> a+`)
    .replace(/[\u0300-\u036f]/g, "") // remove accents (e.g. `, ~, etc)
    .replace(/[^a-zA-Z0-9.\-_]/g, "_") // remove other kind of characters
    .toLowerCase();
}

export function generateUniqueFileName(baseFileName: string) {
  const salt = generateUUID();
  const normalizedName = sanitizeFilename(baseFileName);
  const fullName = `${salt}-${normalizedName}`;
  const trimmedName = fullName.slice(0, MAX_FILENAME_FINAL_CHARS_LENGTH - 1);
  return trimmedName;
}
