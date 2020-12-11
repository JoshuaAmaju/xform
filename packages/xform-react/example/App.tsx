import React from 'react';

import useForm from '../src/useForm'

function App() {
  const { submit, errors, data, handlers, values, hasError, isSubmitting } = useForm({
    schema: {
      name: {
        required: true
      },
      password: {
        required: true
      }
    },
    onSubmit: () => Promise.resolve()
  })

  console.log(data, errors, values, isSubmitting);

  return (
    <div>
      <form onSubmit={e => {
        e.preventDefault();
        submit();
      }}>
        <input type="text" onBlur={({ target: { value } }) => handlers.name.onBlur(value)} />
        <input type="password" onBlur={({ target: { value } }) => handlers.password.onBlur(value)} />
        <button>submit</button>
      </form>
    </div>
  );
}

export default App;
