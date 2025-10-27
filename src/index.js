import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import Global Styles
import 'bootstrap/dist/css/bootstrap.min.css';
import 'leaflet/dist/leaflet.css';
import './index.css';

// Import Main App Component and Service Worker
import App from './App';
import * as serviceWorker from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Router>
    <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
    <App />
  </Router>
);

// Aktifkan PWA dengan mendaftarkan service worker
serviceWorker.register();

reportWebVitals();