import React from 'react';
import ReactDOM from 'react-dom/client';
import { APP_NAME } from '@code-duel/shared';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div>
      <h1>{APP_NAME} Client</h1>
      <p>Welcome to the coding duel platform.</p>
    </div>
  </React.StrictMode>,
);
