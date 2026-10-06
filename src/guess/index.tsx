import '../css/index.css';
import '../css/pins.css';
import '../css/pincolours.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { GuessGame } from './GuessGame.tsx';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode><GuessGame /></React.StrictMode>
);
