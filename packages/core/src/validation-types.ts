import {ValidationType, ValidationTypesEnum} from './types';

const toString = Object.prototype.toString;

const isNumber = (val: any) => {
  const v = parseFloat(val);
  return typeof v === 'number';
};

export const NUMBER: ValidationType<ValidationTypesEnum.NUMBER> = {
  type: 'xform.number',
  exec(name, value) {
    if (!isNumber(value)) {
      throw `${name} should be a number`;
    }
  },
};

export const STRING: ValidationType<ValidationTypesEnum.STRING> = {
  type: 'xform.string',
  exec(name, value) {
    if (isNumber(value) || typeof value !== 'string') {
      throw `${name} should be a string`;
    }
  },
};

export const ARRAY: ValidationType<ValidationTypesEnum.ARRAY> = {
  type: 'xform.array',
  exec(name, value) {
    if (isNumber(value) || toString.call(value) !== '[object Array]') {
      throw `${name} should be a array`;
    }
  },
};

export const OBJECT: ValidationType<ValidationTypesEnum.OBJECT> = {
  type: 'xform.object',
  exec(name, value) {
    if (isNumber(value) || toString.call(value) !== '[object Object]') {
      throw `${name} should be a object`;
    }
  },
};
