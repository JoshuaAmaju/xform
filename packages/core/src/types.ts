import {State} from 'xstate';

export type Schema<T = any> = {
  initialValue?: T;
  validate?: (value: T) => string | void;
};

export type ValidationSchema<T> = {[K in keyof T]: Schema<T[K]>};

export type Config<T, K = unknown> = {
  schema: ValidationSchema<T>;
  restoreState?: () => Promise<State<any>>;
  onSave?: (formState: State<any>) => Promise<void>;
  onSubmit(values: {[K in keyof T]: T[K]}): Promise<K>;
};
