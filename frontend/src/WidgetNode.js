import React, { useEffect, useRef, useState } from 'react';
import { Handle, Position, useViewport } from '@xyflow/react';
import TableEditor from './TableEditor';

const containerStyle = {
  padding: '12px',
  width: '100%',
  height: '100%',
  minWidth: '360px',
  minHeight: '300px',
  borderRadius: '12px',
  border: '1px solid #d9e2ec',
  background: '#ffffff',
  boxShadow: '0 8px 16px rgba(15, 23, 42, 0.08)',
  fontFamily: 'Arial, sans-serif',
  display: 'flex',
  flexDirection: 'column',
  resize: 'both',
  overflow: 'auto'
};

const titleStyle = {
  fontSize: '16px',
  fontWeight: 'bold',
  marginBottom: '8px',
  color: '#1f2933',
  cursor: 'grab'
};

const editorContainerStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  overflow: 'hidden',
  background: '#ffffff',
  minHeight: '220px'
};

function WidgetNode({ data }) {
  const info = data?.info;
  const table = data?.table;
  const editorRef = useRef(null);
  const [editorSize, setEditorSize] = useState({ width: 0, height: 0 });
  const [tableTitle, setTableTitle] = useState(table?.title || 'Без названия');
  const { zoom } = useViewport();

  useEffect(() => {
    setTableTitle(table?.title || 'Без названия');
  }, [table?.title]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const { width, height } = entry.contentRect;
      setEditorSize((prev) => {
        if (prev.width === width && prev.height === height) {
          return prev;
        }
        return { width, height };
      });
    });

    observer.observe(editorRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={containerStyle}>
      <div style={titleStyle} className="node-drag-handle">
        {table ? tableTitle : data?.title || 'Новый виджет'}
      </div>
      {table ? (
        <>
          <div style={editorContainerStyle} ref={editorRef} className="nodrag">
            <TableEditor
              id={table.id}
              compactMode
              showCompactControls
              compactHeight={editorSize.height}
              compactWidth={editorSize.width}
              viewportZoom={zoom}
              onTitleChange={setTableTitle}
            />
          </div>
        </>
      ) : info ? (
        <div style={{ fontSize: '13px', color: '#52606d', lineHeight: 1.4 }}>
          <div><strong>ID:</strong> {info.widgetId}</div>
          <div><strong>Роль:</strong> {info.role}</div>
          <div><strong>Доска:</strong> {info?.board?.name || 'Не указана'}</div>
        </div>
      ) : (
        <div style={{ fontSize: '13px', color: '#52606d', lineHeight: 1.4 }}>
          Ожидание вызова getInfo...
        </div>
      )}
      <Handle type="target" position={Position.Left} style={{ background: '#7b8794' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#7b8794' }} />
    </div>
  );
}

export default WidgetNode;
