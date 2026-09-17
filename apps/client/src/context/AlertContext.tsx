import { useCallback, useState, type ReactNode } from "react";
import AlertPopup, { type AlertType } from "../components/AlertPopup";
import { AlertContext, type AlertOptions } from "./alertStore";

interface AlertState {
  message: string;
  type: AlertType;
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<AlertState | null>(null);

  const showAlert = useCallback((message: string, options?: AlertOptions) => {
    setAlert({ message, type: options?.type ?? "info" });
  }, []);

  const closeAlert = useCallback(() => {
    setAlert(null);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alert && (
        <AlertPopup message={alert.message} type={alert.type} onClose={closeAlert} />
      )}
    </AlertContext.Provider>
  );
}
