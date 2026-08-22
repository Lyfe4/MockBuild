import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// react-router v8 moved the DOM RouterProvider out of the root entry point.
// The one here wraps the core provider and hands it `ReactDOM.flushSync`, which
// is what makes view transitions and scroll restoration work; importing
// `RouterProvider` from 'react-router' still type-checks but silently loses
// both.
import { RouterProvider } from 'react-router/dom';

import { AppProviders, router } from '@/app';

import '@/styles/index.css';

const container = document.getElementById('root');

if (container === null) {
  throw new Error('Root container #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
