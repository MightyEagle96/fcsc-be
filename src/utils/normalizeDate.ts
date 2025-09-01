// utils/dateUtils.ts
export function normalizeDate(value: any): Date | null {
  if (!value) return null;

  // If it's already a Date
  if (value instanceof Date && !isNaN(value.getTime())) {
    console.log(value);
    return value;
  }

  // If it's Excel numeric date (serial number)
  if (typeof value === "number") {
    // Excel dates start from Jan 1, 1900
    const excelEpoch = new Date(1899, 11, 30);
    const normalized = new Date(excelEpoch.getTime() + value * 86400000);
    return isNaN(normalized.getTime()) ? null : normalized;
  }

  // If it's a string (ISO, YYYY-MM-DD, DD/MM/YYYY, etc.)
  if (typeof value === "string") {
    const normalized = new Date(value);
    return isNaN(normalized.getTime()) ? null : normalized;
  }

  return null;
}
