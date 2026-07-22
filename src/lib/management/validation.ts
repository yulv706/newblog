import { ManagementApiError } from "@/lib/management/core";

export function hasField(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

export function requiredString(
  body: Record<string, unknown>,
  key: string,
  maximum: number,
  options: { allowEmpty?: boolean } = {}
) {
  const value = body[key];
  if (typeof value !== "string") {
    throw new ManagementApiError(400, "invalid_field", `${key} must be a string.`);
  }
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (!options.allowEmpty && !normalized) {
    throw new ManagementApiError(400, "invalid_field", `${key} is required.`);
  }
  if (normalized.length > maximum) {
    throw new ManagementApiError(400, "invalid_field", `${key} exceeds ${maximum} characters.`);
  }
  return normalized;
}

export function optionalString(
  body: Record<string, unknown>,
  key: string,
  maximum: number,
  options: { nullable: true; allowEmpty?: boolean }
): string | null | undefined;
export function optionalString(
  body: Record<string, unknown>,
  key: string,
  maximum: number,
  options?: { nullable?: false; allowEmpty?: boolean }
): string | undefined;
export function optionalString(
  body: Record<string, unknown>,
  key: string,
  maximum: number,
  options: { nullable?: boolean; allowEmpty?: boolean } = {}
) {
  if (!hasField(body, key)) {
    return undefined;
  }
  if (body[key] === null && options.nullable) {
    return null;
  }
  return requiredString(body, key, maximum, { allowEmpty: options.allowEmpty ?? true });
}

export function optionalBoolean(body: Record<string, unknown>, key: string) {
  if (!hasField(body, key)) {
    return undefined;
  }
  if (typeof body[key] !== "boolean") {
    throw new ManagementApiError(400, "invalid_field", `${key} must be a boolean.`);
  }
  return body[key] as boolean;
}

export function optionalNumber(
  body: Record<string, unknown>,
  key: string,
  options: { minimum: number; maximum: number; integer?: boolean; nullable: true }
): number | null | undefined;
export function optionalNumber(
  body: Record<string, unknown>,
  key: string,
  options: { minimum: number; maximum: number; integer?: boolean; nullable?: false }
): number | undefined;
export function optionalNumber(
  body: Record<string, unknown>,
  key: string,
  options: { minimum: number; maximum: number; integer?: boolean; nullable?: boolean }
) {
  if (!hasField(body, key)) {
    return undefined;
  }
  if (body[key] === null && options.nullable) {
    return null;
  }
  const value = body[key];
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (options.integer && !Number.isInteger(value)) ||
    value < options.minimum ||
    value > options.maximum
  ) {
    throw new ManagementApiError(
      400,
      "invalid_field",
      `${key} must be between ${options.minimum} and ${options.maximum}.`
    );
  }
  return value;
}

export function optionalEnum<const T extends readonly string[]>(
  body: Record<string, unknown>,
  key: string,
  values: T
): T[number] | undefined {
  if (!hasField(body, key)) {
    return undefined;
  }
  const value = body[key];
  if (typeof value !== "string" || !values.includes(value)) {
    throw new ManagementApiError(
      400,
      "invalid_field",
      `${key} must be one of: ${values.join(", ")}.`
    );
  }
  return value as T[number];
}

export function optionalStringArray(
  body: Record<string, unknown>,
  key: string,
  options: { maximumItems: number; maximumLength: number }
) {
  if (!hasField(body, key)) {
    return undefined;
  }
  if (!Array.isArray(body[key])) {
    throw new ManagementApiError(400, "invalid_field", `${key} must be an array of strings.`);
  }
  const values = body[key] as unknown[];
  if (values.length > options.maximumItems || values.some((value) => typeof value !== "string")) {
    throw new ManagementApiError(400, "invalid_field", `${key} contains too many or invalid values.`);
  }
  return Array.from(
    new Set(
      values
        .map((value) => (value as string).trim())
        .filter(Boolean)
        .map((value) => {
          if (value.length > options.maximumLength) {
            throw new ManagementApiError(
              400,
              "invalid_field",
              `${key} values may not exceed ${options.maximumLength} characters.`
            );
          }
          return value;
        })
    )
  );
}

export function optionalIsoDate(
  body: Record<string, unknown>,
  key: string,
  options: { nullable: true }
): string | null | undefined;
export function optionalIsoDate(
  body: Record<string, unknown>,
  key: string,
  options?: { nullable?: false }
): string | undefined;
export function optionalIsoDate(
  body: Record<string, unknown>,
  key: string,
  options: { nullable?: boolean } = {}
) {
  const value = options.nullable
    ? optionalString(body, key, 64, { nullable: true, allowEmpty: true })
    : optionalString(body, key, 64);
  if (value === undefined || value === null || value === "") {
    return value === "" ? null : value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ManagementApiError(400, "invalid_field", `${key} must be a valid ISO date.`);
  }
  return date.toISOString();
}

export function assertExpectedUpdatedAt(
  body: Record<string, unknown>,
  actualUpdatedAt: string
) {
  const expected = optionalString(body, "expectedUpdatedAt", 64);
  if (expected !== undefined && expected !== actualUpdatedAt) {
    throw new ManagementApiError(
      409,
      "stale_resource",
      "The resource changed after it was read. Fetch it again before updating.",
      { expectedUpdatedAt: expected, actualUpdatedAt }
    );
  }
}
