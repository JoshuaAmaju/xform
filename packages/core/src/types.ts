import {State} from 'xstate';

export type XRecord<T> = {[K in keyof T]: T[K]};

export type Schema<T> = {
  initialValue?: T;
  required?: boolean;
  validate?: (value: T) => string | void;
};

export type ValidationSchema<T> = {[K in keyof T]: Schema<T[K]>};

export type Config<T, K> = {
  once?: boolean;
  schema: ValidationSchema<T>;
  restoreState?: () => Promise<State<any>>;
  onSubmit(values: XRecord<T>): Promise<K>;
  onSave?: (formState: State<any>) => Promise<void>;
  validate?: (values: XRecord<T>) => Record<keyof T, string> | void;
};
