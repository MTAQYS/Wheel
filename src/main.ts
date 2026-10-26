import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/geist/latin-400.css';
import '@fontsource/geist/latin-500.css';
import '@fontsource/geist-mono/latin-400.css';
import './style.css';
import { mountApp } from './app';

const root = document.querySelector('#app');
if (root instanceof HTMLElement) mountApp(root);
