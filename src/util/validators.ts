export type Validator<T> = (value: unknown, defaultValue: T) => T;
export type ValidatorRecord<T> = Partial<{
  [Key in keyof T]: Validator<T[Key]>;
}>;
export type Validators<T> = T extends object ? Validator<T> | ValidatorRecord<T> : Validator<T>;

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

    const [year, month, day] = parsedValue.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return /^\d{4}-\d{2}-\d{2}$/.test(parsedValue)
      && date.getFullYear() === year
      && date.getMonth() === month - 1
      && date.getDate() === day
      ? parsedValue
      : defaultValue;
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
} as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && !(value instanceof Set)
    && !(value instanceof Map);
}

function getDefaultValue(value: unknown, defaultValue: unknown): unknown {
  if (Array.isArray(defaultValue)) return validators.stringArray(value, defaultValue);
  if (defaultValue instanceof Set) {
    const values = validators.stringArray(
      value instanceof Set ? [...value] : value,
      [...defaultValue] as string[],
    );
    return new Set(values);
  }
  if (defaultValue instanceof Map) return value instanceof Map ? value : defaultValue;
  if (isPlainObject(defaultValue)) return validateValue(value, defaultValue);

  switch (typeof defaultValue) {
    case "string":
      return validators.string(value, defaultValue);
    case "number":
      return validators.number(value, defaultValue);
    case "boolean":
      return validators.boolean(value, defaultValue);
    case "undefined":
      return validators.optionalString(value, defaultValue);
    default:
      return value !== null && typeof value === "object" ? value : defaultValue;
  }
}

export function validateValue<T>(value: unknown, defaultValue: T, validator?: Validators<T>): T {
  if (typeof validator === "function") return validator(value, defaultValue);
  if (!isPlainObject(defaultValue) || !isPlainObject(value)) {
    return getDefaultValue(value, defaultValue) as T;
  }

  const validatedValue = { ...defaultValue } as Record<keyof T, unknown>;
  const inputValue = value as Record<string, unknown>;
  const validatorRecord = validator as ValidatorRecord<T> | undefined;
  for (const property of Object.keys(defaultValue) as Array<keyof T>) {
    const propertyValidator = validatorRecord?.[property];
    validatedValue[property] = propertyValidator === undefined
      ? getDefaultValue(inputValue[property as string], defaultValue[property])
      : propertyValidator(inputValue[property as string], defaultValue[property]);
  }
  return validatedValue as T;
}
