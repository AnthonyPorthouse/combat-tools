import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

const RootLayout = () => (
  <div className="flex h-screen flex-col overflow-clip">
    <nav className="flex gap-2 p-2">
      <header className="mr-4 border-r border-slate-400/45 pr-4 font-bold">
        <h1>Combat Tools</h1>
      </header>
      <Link to="/" className="[&.active]:font-bold">
        Home
      </Link>{" "}
      <Link to="/combat" className="[&.active]:font-bold">
        Combat
      </Link>
    </nav>
    <hr />
    <main id="main-content" className="relative flex-grow">
      <Outlet />
    </main>
    <TanStackRouterDevtools />
  </div>
);

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <div className="p-2">Not found!</div>,
  errorComponent: ({ error }) => (
    <div className="p-2">
      <h1 className="text-red-500">Error!</h1>
      <pre>{String(error)}</pre>
    </div>
  ),
});
