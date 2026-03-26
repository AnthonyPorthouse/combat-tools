import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

const RootLayout = () => (
  <div className="flex h-screen flex-col overflow-clip">
    <div className="flex gap-2 p-2">
      <Link to="/" className="[&.active]:font-bold">
        Home
      </Link>{" "}
      <Link to="/combat" className="[&.active]:font-bold">
        Combat
      </Link>
    </div>
    <hr />
    <Outlet />
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
