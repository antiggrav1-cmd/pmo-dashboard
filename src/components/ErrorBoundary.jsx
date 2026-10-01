import React, { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-3xl bg-rose-50/90 border border-rose-200 text-rose-900 shadow-sm max-w-2xl mx-auto my-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-100 rounded-2xl text-rose-600 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-base font-black text-rose-950">
                {this.props.title || "Ocurrió un problema al cargar esta sección"}
              </h3>
              <p className="text-xs text-rose-800 leading-relaxed font-medium">
                {this.state.error?.message || "Error inesperado en la renderización."}
              </p>
              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-all cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-rose-300 text-rose-800 text-xs font-bold hover:bg-rose-100 transition-all cursor-pointer shadow-xs"
                >
                  <span>Recargar página completa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
