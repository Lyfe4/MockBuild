import { isRouteErrorResponse, useRouteError } from 'react-router';

/**
 * The data router's `errorElement`.
 *
 * Catches both thrown `Response`s from loaders and actions (404s, 401s) and
 * unexpected exceptions from rendering. Without one, react-router falls back to
 * its own default screen, which is developer-facing and leaks stack traces.
 *
 * It deliberately shows the reader nothing but a status and a way back. Error
 * detail goes to the console, where a developer can find it and a visitor
 * cannot.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();

  const title = isRouteErrorResponse(error)
    ? `${String(error.status)} — ${error.statusText}`
    : 'Something went wrong';

  if (import.meta.env.DEV) {
    console.error('Route error:', error);
  }

  return (
    <section>
      <h1>{title}</h1>
      <p>
        That page could not be retrieved from the archive. <a href="/">Return to the entrance.</a>
      </p>
    </section>
  );
}
