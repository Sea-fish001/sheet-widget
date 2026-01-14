import React from 'react';
import WidgetNode, { WidgetNodeFallback } from './WidgetNode';

class WidgetNodeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
      return;
    }
    console.warn('WidgetNode crashed and was caught by ErrorBoundary.', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ padding: '12px', border: '1px solid #fca5a5', borderRadius: '8px' }}>
          <strong>Ошибка виджета.</strong>
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#991b1b' }}>
            Проверьте, что WidgetNode рендерится внутри ReactFlowProvider.
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const WidgetNodeSafe = ({ fallback, onError, ...props }) => (
  <WidgetNodeErrorBoundary
    fallback={fallback ?? <WidgetNodeFallback {...props} />}
    onError={onError}
  >
    <WidgetNode {...props} />
  </WidgetNodeErrorBoundary>
);

const WidgetNodeUnsafe = WidgetNode;

export { WidgetNodeErrorBoundary, WidgetNodeSafe, WidgetNodeUnsafe };
