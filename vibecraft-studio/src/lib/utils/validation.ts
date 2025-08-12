// Validation utilities

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function validateRequired<T>(
  value: T | null | undefined,
  fieldName: string
): T {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${fieldName} is required`);
  }
  return value;
}

export function validateMinLength(
  value: string,
  minLength: number,
  fieldName: string
): string {
  if (value.length < minLength) {
    throw new Error(
      `${fieldName} must be at least ${minLength} characters long`
    );
  }
  return value;
}

export function validateMaxLength(
  value: string,
  maxLength: number,
  fieldName: string
): string {
  if (value.length > maxLength) {
    throw new Error(
      `${fieldName} must be no more than ${maxLength} characters long`
    );
  }
  return value;
}

export function sanitizeString(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
