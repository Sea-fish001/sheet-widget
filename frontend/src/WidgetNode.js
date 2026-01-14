import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Handle, Position } from '@xyflow/react';
import TableEditor from './TableEditor';

const TABLES_API = 'http://158.160.73.104:8000/api/tables/';
const WIDGET_CONFIG_API = 'http://158.160.73.104:8000/api/widget/';

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
  overflow: 'hidden'
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

const formRowStyle = {
  display: 'flex',
  gap: '12px',
  marginBottom: '10px',
  fontSize: '13px',
  color: '#52606d'
};

function WidgetNode({ id, data }) {
  const info = data?.info;
  const table = data?.table;
  const [localTable, setLocalTable] = useState(null);
  const widgetId = data?.widgetId ?? info?.widgetId;
  const effectiveTable = localTable ?? table;
  const [tableTitle, setTableTitle] = useState(effectiveTable?.title || 'Без названия');
  const [newTitle, setNewTitle] = useState('Новая таблица');
  const [rowsCount, setRowsCount] = useState(10);
  const [colsCount, setColsCount] = useState(8);
  const [isCreating, setIsCreating] = useState(false);
  const externalSetNodes = typeof data?.setNodes === 'function' ? data.setNodes : null;
  const lastSyncedConfig = useRef(null);

  useEffect(() => {
    if (!widgetId || !effectiveTable?.id) {
      return;
    }

    const nextConfig = { tableId: effectiveTable.id };
    const serialized = JSON.stringify(nextConfig);

    if (lastSyncedConfig.current === serialized) {
      return;
    }

    lastSyncedConfig.current = serialized;

    axios
      .put(`${WIDGET_CONFIG_API}${widgetId}`, nextConfig)
      .catch((error) => {
        console.error('Ошибка синхронизации конфига виджета:', error);
      });
  }, [effectiveTable?.id, widgetId]);

  useEffect(() => {
    setTableTitle(effectiveTable?.title || 'Без названия');
  }, [effectiveTable?.title]);

  const handleCreateTable = async (titleOverride, rowsOverride, colsOverride) => {
    const titleValue = typeof titleOverride === 'string' ? titleOverride : newTitle;
    const rowsValue = rowsOverride ?? rowsCount;
    const colsValue = colsOverride ?? colsCount;

    if (!titleValue.trim()) {
      alert('Введите название таблицы');
      return;
    }

    setIsCreating(true);
    const emptyRows = Array.from({ length: rowsValue }, () =>
      Array.from({ length: colsValue }, () => '')
    );

    try {
      const response = await axios.post(TABLES_API, {
        title: titleValue,
        data: { rows: emptyRows }
      });

      if (externalSetNodes) {
        externalSetNodes((current) =>
          current.map((node) =>
            node.id === id
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    table: response.data
                  }
                }
              : node
          )
        );
      } else {
        setLocalTable(response.data);
      }
      setTableTitle(response.data?.title || titleValue);
    } catch (error) {
      console.error(error);
      alert('Ошибка создания таблицы');
    } finally {
      setIsCreating(false);
    }
  };


  return (
    <div style={containerStyle}>
      <div style={titleStyle} className="node-drag-handle">
        {effectiveTable ? tableTitle : data?.title || 'Новый виджет'}
      </div>
      {effectiveTable ? (
        <>
          <div style={editorContainerStyle} className="nodrag">
            <TableEditor
              id={effectiveTable.id}
              compactMode
              showCompactControls
              onTitleChange={setTableTitle}
            />
          </div>
        </>
      ) : (
        <div style={{ fontSize: '13px', color: '#52606d', lineHeight: 1.4 }}>
          {info ? (
            <>
              <div><strong>ID:</strong> {info.widgetId}</div>
              <div><strong>Роль:</strong> {info.role}</div>
              <div><strong>Доска:</strong> {info?.board?.name || 'Не указана'}</div>
            </>
          ) : (
            <div>Ожидание вызова getInfo...</div>
          )}
          <div style={{ marginTop: '12px' }}>
            <div style={formRowStyle}>
              <label style={{ flex: 2 }}>
                Название
                <input
                  type="text"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                />
              </label>
            </div>
            <div style={formRowStyle}>
              <label style={{ flex: 1 }}>
                Строк
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={rowsCount}
                  onChange={(event) => setRowsCount(parseInt(event.target.value, 10) || 1)}
                  style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                />
              </label>
              <label style={{ flex: 1 }}>
                Столбцов
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={colsCount}
                  onChange={(event) => setColsCount(parseInt(event.target.value, 10) || 1)}
                  style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                />
              </label>
            </div>
            <button
              onClick={() => handleCreateTable()}
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
              {isCreating ? 'Создаём...' : 'Создать таблицу'}
            </button>
          </div>
        </div>
      )}
      <Handle type="target" position={Position.Left} style={{ background: '#7b8794' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#7b8794' }} />
    </div>
  );
}

export default WidgetNode;
