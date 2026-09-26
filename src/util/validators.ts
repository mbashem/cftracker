import { parseDateInputValue } from "./time";

export type Validator<T> = (value: unknown, defaultValue: T) => T;
export type ValidatorList<T> = readonly Validator<T>[];
type ValidatorValue<T> = Validator<T> | ValidatorList<T>;
export type ValidatorRecord<T> = Partial<{
  [Key in keyof T]: ValidatorValue<T[Key]>;
}>;
export type Validators<T> = T extends object
  ? ValidatorValue<T> | ValidatorRecord<T>
  : ValidatorValue<T>;

export const validators = {
  string(value: unknown, defaultValue: string) {
    return typeof value === "string" ? value : defaultValue;
  },
  optionalString(value: unknown, defaultValue: string | undefined) {
    if (value === undefined || value === "") return undefined;
    return typeof value === "string" ? value : defaultValue;
  },
  date(value: unknown, defaultValue: string | undefined) {
    const parsedValue = validators.optionalString(value, defaultValue);
    if (parsedValue === undefined) return parsedValue;
    return parseDateInputValue(parsedValue) === undefined ? defaultValue : parsedValue;
  },
  number<T extends number | undefined>(value: unknown, defaultValue: T): number | T {
    if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
      return defaultValue;
    }
    const parsedValue = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : defaultValue;
  },
  integer<T extends number | undefined>(value: unknown, defaultValue: T): number | T {
    const parsedValue = validators.number(value, defaultValue);
    return typeof parsedValue === "number" && Number.isSafeInteger(parsedValue) ? parsedValue : defaultValue;
  },
  positiveInteger<T extends number | undefined>(value: unknown, defaultValue: T): number | T {
    const parsedValue = validators.integer(value, defaultValue);
    return typeof parsedValue === "number" && parsedValue > 0 ? parsedValue : defaultValue;
  },
  nonNegativeInteger<T extends number | undefined>(value: unknown, defaultValue: T): number | T {
    const parsedValue = validators.integer(value, defaultValue);
    return typeof parsedValue === "number" && parsedValue >= 0 ? parsedValue : defaultValue;
  },
  boolean(value: unknown, defaultValue: boolean) {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return defaultValue;
  },
  stringArray(value: unknown, defaultValue: string[]) {
    const values = typeof value === "string" ? value.split(",") : value;
    if (!Array.isArray(values) || !values.every((item) => typeof item === "string")) return defaultValue;
    return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
  },
  enumArray<T extends string>(acceptedValues: readonly T[]): Validator<T[]> {
    const acceptedValueSet = new Set(acceptedValues);
    return (value, defaultValue) => {
      const parsedValue = validators.stringArray(value, defaultValue);
      if (!parsedValue.every((item) => acceptedValueSet.has(item as T))) {
        return defaultValue;
      }
      return parsedValue as T[];
    };
  },
  enumValue<T extends string | number>(acceptedValues: readonly T[]): Validator<T> {
    const acceptedValueSet = new Set<unknown>(acceptedValues);
    return (value, defaultValue) => acceptedValueSet.has(value) ? value as T : defaultValue;
  },
} as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && !(value instanceof Set)
    && !(value instanceof Map);
}

function isValidator<T>(value: ValidatorValue<T>): value is Validator<T> {
  return typeof value === "function";
}

function applyValidators<T>(value: unknown, defaultValue: T, validator: ValidatorValue<T>): T {
  if (isValidator(validator)) return validator(value, defaultValue);

  let validatedValue = value;
  for (const currentValidator of validator) {
    validatedValue = currentValidator(validatedValue, defaultValue);
  }
  return validatedValue as T;
}

export function validateValue<T>(value: unknown, defaultValue: T, validator?: Validators<T>): T {
  if (validator === undefined) return value as T;
  if (Array.isArray(validator) || isValidator(validator as ValidatorValue<T>)) {
    return applyValidators(value, defaultValue, validator as ValidatorValue<T>);
  }
  if (!isPlainObject(defaultValue) || !isPlainObject(value)) {
    return defaultValue;
  }

  const validatedValue = { ...value } as Record<keyof T, unknown>;
  const inputValue = value as Record<string, unknown>;
  const validatorRecord = validator as ValidatorRecord<T>;
  for (const property of Object.keys(validatorRecord) as Array<keyof T>) {
    const propertyValidator = validatorRecord[property];
    if (propertyValidator === undefined) continue;

    const propertyValue = applyValidators(
      inputValue[property as string],
      defaultValue[property],
      propertyValidator,
    );
    if (propertyValue !== undefined || Object.prototype.hasOwnProperty.call(inputValue, property)) {
      validatedValue[property] = propertyValue;
    }
  }
  return validatedValue as T;
}
