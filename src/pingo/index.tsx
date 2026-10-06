import '../css/index.css';
import '../css/pins.css';
import '../css/pincolours.css';
import './styles.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { PingoApp } from './PingoApp.tsx';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode><PingoApp /></React.StrictMode>
);
