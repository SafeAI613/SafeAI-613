import { createContext, useContext } from "react";
import type { AlertType } from "../components/AlertPopup";

export interface AlertOptions {
  type?: AlertType;
}

export interface AlertContextValue {
  showAlert: (message: string, options?: AlertOptions) => void;
}

export const AlertContext = createContext<AlertContextValue | null>(null);

export function useAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert must be used inside AlertProvider");
  return ctx;
}
