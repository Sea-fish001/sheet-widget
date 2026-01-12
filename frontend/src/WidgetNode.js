import React, { useEffect, useMemo, useRef, useState } from 'react';
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

function WidgetNode(nodeProps) {
  const { data, selected } = nodeProps;
  const info = data?.info;
  const table = data?.table;
  const editorRef = useRef(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const [editorSize, setEditorSize] = useState({ width: 0, height: 0 });
  const [tableTitle, setTableTitle] = useState(table?.title || 'Без названия');
  const [newTitle, setNewTitle] = useState('Новая таблица');
  const [rowsCount, setRowsCount] = useState(10);
  const [colsCount, setColsCount] = useState(8);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const { zoom } = useViewport();

  useEffect(() => {
    setTableTitle(table?.title || 'Без названия');
  }, [table?.title]);

  useEffect(() => {
    if (table) {
      setCreateError('');
      setIsCreating(false);
    }
  }, [table]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    let frameId;
    const element = editorRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const nextWidth = Math.round(entry.contentRect.width);
      const nextHeight = Math.round(entry.contentRect.height);
      const prevSize = sizeRef.current;

      if (prevSize.width === nextWidth && prevSize.height === nextHeight) {
        return;
      }

      if (frameId) {
        cancelAnimationFrame(frameId);
      }

      frameId = requestAnimationFrame(() => {
        sizeRef.current = { width: nextWidth, height: nextHeight };
        setEditorSize((prev) => {
          if (prev.width === nextWidth && prev.height === nextHeight) {
            return prev;
          }
          return { width: nextWidth, height: nextHeight };
        });
      });
    });

    observer.observe(element);
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      observer.disconnect();
    };
  }, []);

  const resolvedContainerStyle = useMemo(() => {
    if (!selected) {
      return containerStyle;
    }
    return {
      ...containerStyle,
      borderColor: '#2563eb',
      boxShadow: '0 10px 18px rgba(37, 99, 235, 0.2)'
    };
  }, [selected]);

  const handleCreateTable = async () => {
    if (!data?.onCreateTable) {
      setCreateError('Создание таблицы недоступно');
      return;
    }
    if (!newTitle.trim()) {
      setCreateError('Введите название таблицы');
      return;
    }
    setIsCreating(true);
    setCreateError('');
    try {
      await data.onCreateTable(nodeProps.id, newTitle.trim(), rowsCount, colsCount);
    } catch (error) {
      console.error(error);
      setCreateError('Ошибка создания таблицы');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div style={resolvedContainerStyle}>
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
      {!table && (
        <div style={{ marginTop: '12px', fontSize: '13px', color: '#52606d' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Создать таблицу</div>
          <div style={{ display: 'grid', gap: '8px' }}>
            <input
              type="text"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="Название таблицы"
              className="nodrag"
              style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                min="1"
                max="1000"
                value={rowsCount}
                onChange={(event) => setRowsCount(Number(event.target.value) || 1)}
                className="nodrag"
                style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
              <input
                type="number"
                min="1"
                max="100"
                value={colsCount}
                onChange={(event) => setColsCount(Number(event.target.value) || 1)}
                className="nodrag"
                style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>
            <button
              onClick={handleCreateTable}
              className="nodrag"
              disabled={isCreating}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                background: isCreating ? '#94a3b8' : '#2563eb',
                color: '#fff',
                cursor: isCreating ? 'not-allowed' : 'pointer'
              }}
            >
              {isCreating ? 'Создаем...' : `Создать ${rowsCount}×${colsCount}`}
            </button>
            {createError && (
              <div style={{ color: '#dc2626' }}>{createError}</div>
            )}
          </div>
        </div>
      )}
      <Handle type="target" position={Position.Left} style={{ background: '#7b8794' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#7b8794' }} />
    </div>
  );
}

export default WidgetNode;
