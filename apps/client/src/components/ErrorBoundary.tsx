import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** When this value changes while showing the error, the boundary resets (e.g. pass the URL). */
  resetKey?: unknown;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="alert alert-error" style={{ margin: "40px auto", maxWidth: "600px" }}>
          <strong>משהו השתבש</strong>
          <p style={{ marginTop: "8px", marginBottom: "12px" }}>
            {this.state.error?.message ?? "שגיאה לא צפויה"}
          </p>
          <button
            className="btn btn-secondary"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            נסה שוב
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
