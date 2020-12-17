export type XRecord<T> = {[K in keyof T]: T[K]};

export enum ValidationTypesEnum {
  NUMBER = 'number',
  STRING = 'string',
  ARRAY = 'array',
  OBJECT = 'object',
}

export type ValidationType<K extends ValidationTypesEnum> = {
  type: `xform.${Lowercase<K>}`;
  exec(name: string, value: any): void;
};

export type Schema<T> = {
  initialValue?: T;
  required?: boolean;
  validate?: (value: T) => string | void;
  type?: ValidationType<ValidationTypesEnum>;
};

export type ValidationSchema<T> = {[K in keyof T]: string | Schema<T[K]>};

export type Config<T, K> = {
  once?: boolean;
  autoSave?: boolean;
  schema: ValidationSchema<T>;
  onSubmit(values: XRecord<T>): Promise<K>;
  onSave?: (values: XRecord<T>) => void | Promise<void>;
  validate?: (values: XRecord<T>) => Record<keyof T, string> | void;
};

export type StorageAdapter = {
  removeItem(key: string): void | Promise<void>;
  getItem(key: string): string | Promise<string>;
  setItem(key: string, value: string): void | Promise<void>;
};
