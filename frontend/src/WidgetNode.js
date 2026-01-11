import React from 'react';
import { Handle, NodeResizer, Position } from '@xyflow/react';
import TableEditor from './TableEditor';

const containerStyle = {
  padding: '12px',
  width: '100%',
  height: '100%',
  borderRadius: '12px',
  border: '1px solid #d9e2ec',
  background: '#ffffff',
  boxShadow: '0 8px 16px rgba(15, 23, 42, 0.08)',
  fontFamily: 'Arial, sans-serif',
  display: 'flex',
  flexDirection: 'column'
};

const titleStyle = {
  fontSize: '16px',
  fontWeight: 'bold',
  marginBottom: '8px',
  color: '#1f2933'
};

const editorContainerStyle = {
  flex: 1,
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  overflow: 'hidden',
  background: '#ffffff'
};

function WidgetNode({ data }) {
  const info = data?.info;
  const table = data?.table;

  return (
    <div style={containerStyle}>
      <NodeResizer
        minWidth={360}
        minHeight={300}
        isVisible
        lineStyle={{ borderColor: '#94a3b8' }}
        handleStyle={{ background: '#2563eb', borderRadius: '4px' }}
      />
      <div style={titleStyle}>{table ? 'Таблица' : data?.title || 'Новый виджет'}</div>
      {table ? (
        <>
          <div style={editorContainerStyle}>
            <TableEditor id={table.id} compactMode showCompactControls />
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
