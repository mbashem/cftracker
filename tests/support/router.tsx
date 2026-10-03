import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from "react-router";
import type { PropsWithChildren } from "react";

export function LocationProbe() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname}{search}</output>;
}

export function createRouterWrapper(initialEntry = "/problems?useFilterStorage=false") {
  return function RouterWrapper({ children }: PropsWithChildren) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

export interface NavigationState {
  navigate: NavigateFunction;
  pathname: string;
  search: string;
}

export function NavigationProbe({ onChange }: { onChange: (state: NavigationState) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  onChange({ navigate, pathname: location.pathname, search: location.search });
  return <LocationProbe />;
}
