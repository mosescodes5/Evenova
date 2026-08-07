import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", background: "#08080f", color: "#f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 32, fontFamily: "monospace"
        }}>
          <div style={{ maxWidth: 800, width: "100%" }}>
            <h2 style={{ color: "#ef4444", marginBottom: 16 }}>
              ❌ App crashed — copy this and send it
            </h2>
            <pre style={{
              background: "#111", border: "1px solid #ef444444",
              borderRadius: 12, padding: 24, fontSize: 13,
              whiteSpace: "pre-wrap", wordBreak: "break-all",
              color: "#fca5a5", overflowY: "auto", maxHeight: 500
            }}>
              {this.state.error?.message}
              {"\n\n"}
              {this.state.error?.stack}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
