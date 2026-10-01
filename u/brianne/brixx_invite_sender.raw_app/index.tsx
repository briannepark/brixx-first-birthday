import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const fonts = document.createElement('link');
fonts.rel = 'stylesheet';
fonts.href = 'https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600&family=Modak&display=swap';
document.head.appendChild(fonts);

createRoot(document.getElementById('root')!).render(<App />);
