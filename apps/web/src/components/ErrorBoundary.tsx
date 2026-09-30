import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Changes with every move to another address, so Back or a link tries the screen again. */
  resetKey?: string;
}

/**
 * The last line of defence: a fault while drawing a screen shows a plain page with a way on,
 * where it would otherwise leave the whole app blank. The link it offers loads the start afresh,
 * which needs nothing that went wrong.
 */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidUpdate(prev: Props) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey)
      this.setState({ failed: false });
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="shell">
        <header className="site-header">
          <div className="site-header__inner">
            <a href="/" className="brand">
              What’s your Budget?
            </a>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="page">
          <h1>This page could not be shown</h1>
          <p>
            Something went wrong. Go back and try again, or <a href="/">start a new Budget</a>.
          </p>
        </main>
      </div>
    );
  }
}
