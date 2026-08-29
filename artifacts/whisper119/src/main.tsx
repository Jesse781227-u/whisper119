import { createRoot } from 'react-dom/client';

import App from './App';
import { setBaseUrl } from '@workspace/api-client-react';

import './index.css';

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL ?? "https://whisper119back.onrender.com")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

setBaseUrl(configuredApiBase || null);

createRoot(document.getElementById('root')!).render(<App />);
