import React from 'react';
import { Handle, Position } from '@xyflow/react';
import TableEditor from './TableEditor';

const containerStyle = {
  padding: '14px',
  minWidth: '220px',
  borderRadius: '12px',
  border: '1px solid #d9e2ec',
  background: '#ffffff',
  boxShadow: '0 8px 16px rgba(15, 23, 42, 0.08)',
  fontFamily: 'Arial, sans-serif'
};

const titleStyle = {
  fontSize: '16px',
  fontWeight: 'bold',
  marginBottom: '8px',
  color: '#1f2933'
};

const metaStyle = {
  fontSize: '13px',
  color: '#52606d',
  lineHeight: 1.4
};

const editorContainerStyle = {
  marginTop: '12px',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  overflow: 'hidden'
};

function WidgetNode({ data }) {
  const info = data?.info;
  const boardName = info?.board?.name || 'Не указана';
  const table = data?.table;
  const rowCount = Array.isArray(table?.data?.rows) ? table.data.rows.length : 0;
  const colCount = rowCount > 0 ? table.data.rows[0].length : 0;

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>{data?.title || table?.title || 'Новый виджет'}</div>
      {table ? (
        <>
          <div style={metaStyle}>
            <div><strong>Таблица:</strong> {table.title || 'Без названия'}</div>
            <div><strong>Размер:</strong> {rowCount}×{colCount}</div>
            <div><strong>ID:</strong> {table.id}</div>
          </div>
          <div style={editorContainerStyle}>
            <TableEditor id={table.id} compactMode />
          </div>
        </>
      ) : info ? (
        <div style={metaStyle}>
          <div><strong>ID:</strong> {info.widgetId}</div>
          <div><strong>Роль:</strong> {info.role}</div>
          <div><strong>Доска:</strong> {boardName}</div>
        </div>
      ) : (
        <div style={metaStyle}>Ожидание вызова getInfo...</div>
      )}
      <Handle type="target" position={Position.Left} style={{ background: '#7b8794' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#7b8794' }} />
    </div>
  );
}

export default WidgetNode;
