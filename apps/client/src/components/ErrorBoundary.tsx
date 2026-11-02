import { Component, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** When this value changes while showing the error, the boundary resets (e.g. pass the URL). */
  resetKey?: unknown;
}

interface FallbackLabels {
  title: string;
  unexpected: string;
  retry: string;
}

interface BoundaryProps extends Props {
  labels: FallbackLabels;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// React only offers error boundaries as class components, so the boundary
// itself stays a class; the exported wrapper below is a function component
// that supplies the fallback's texts in the current UI language.
class Boundary extends Component<BoundaryProps, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: BoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const { labels } = this.props;
      return this.props.fallback ?? (
        <div className="alert alert-error" style={{ margin: "40px auto", maxWidth: "600px" }}>
          <strong>{labels.title}</strong>
          <p style={{ marginTop: "8px", marginBottom: "12px" }}>
            {this.state.error?.message ?? labels.unexpected}
          </p>
          <button
            className="btn btn-secondary"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            {labels.retry}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ErrorBoundary(props: Props) {
  const { t } = useTranslation();
  const labels: FallbackLabels = {
    title: t("shell.errorBoundary.title"),
    unexpected: t("shell.errorBoundary.unexpected"),
    retry: t("shell.errorBoundary.retry"),
  };
  return <Boundary {...props} labels={labels} />;
}
