import {useForm, Types} from '../src';

const form = document.querySelector('form');
const saveForm = document.querySelector('#save');
const formState = document.querySelector('#state');
const submitForm = document.querySelector('#submit');
const clearSaved = document.querySelector('#clear-saved');

const email = document.querySelector('#email') as HTMLInputElement;
const password = document.querySelector('#password') as HTMLInputElement;

type Form = {
  email: string;
  password: string;
};

const {save, submit, handlers, subscribe, set} = useForm<Form>({
  schema: {
    email: {
      required: true,
    },
    password: {
      required: true,
    },
  },
  onSubmit: () => Promise.resolve('Form submitted'),
  onSave: (state) => localStorage.setItem('form', JSON.stringify(state)),
});

document.addEventListener('DOMContentLoaded', () => {
  const res = localStorage.getItem('form');
  set({name: 'values', value: JSON.parse(res)});
});

// @ts-ignore
email.addEventListener('blur', ({target: {value}}) =>
  handlers.email.onChange(value)
);

// @ts-ignore
password.addEventListener('blur', ({target: {value}}) =>
  handlers.password.onBlur(value)
);

saveForm.addEventListener('click', (_) => {
  save(true);
});

clearSaved.addEventListener('click', () => {
  localStorage.removeItem('form');
});

form.addEventListener('submit', (e: any) => {
  e.preventDefault();
  submit();
});

subscribe(
  ({
    saved,
    values,
    hasError,
    isSaving,
    submitted,
    isSubmitting,
    attemptedSaveOrSubmit,
  }) => {
    formState.innerHTML = isSaving
      ? 'saving'
      : isSubmitting
      ? 'submitting'
      : submitted
      ? 'submitted'
      : saved
      ? 'saved'
      : 'idle';

    if (attemptedSaveOrSubmit) {
      alert('Please fill all fields');
    }

    if (values?.email) email.value = values.email;
    if (values?.password) password.value = values.password;

    if (hasError('email')) {
      email.classList.add('error');
    } else {
      email.classList.remove('error');
    }

    if (hasError('password')) {
      password.classList.add('error');
    } else {
      password.classList.remove('error');
    }
  }
);
