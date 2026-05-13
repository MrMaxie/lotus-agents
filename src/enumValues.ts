export function enumValues<const TEnum extends Record<string, string>>(
  enumObject: TEnum,
): [TEnum[keyof TEnum], ...Array<TEnum[keyof TEnum]>] {
  const values = Object.values(enumObject) as Array<TEnum[keyof TEnum]>;

  if (values.length === 0) {
    throw new Error('Cannot create a Zod enum from an empty TypeScript enum.');
  }

  return values as [TEnum[keyof TEnum], ...Array<TEnum[keyof TEnum]>];
}
