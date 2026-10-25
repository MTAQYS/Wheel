import '@fontsource/source-sans-3/latin-400.css';
import '@fontsource/source-sans-3/latin-600.css';
import '@fontsource/source-serif-4/latin-600.css';
import './style.css';
import { mountApp } from './app';

const root = document.querySelector('#app');
if (root instanceof HTMLElement) mountApp(root);
