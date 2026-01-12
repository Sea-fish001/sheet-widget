import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import WidgetNode from './WidgetNode';

const API_BASE = 'http://localhost:8000/api/widget-info/';
const TABLES_API = 'http://localhost:8000/api/tables/';

const initialNodes = [
  {
    id: 'table-widget',
    type: 'tableWidget',
    position: { x: 120, y: 120 },
    data: {
      title: 'Табличный виджет',
      description: 'Редактор таблиц и аналитики'
    }
  }
];

const initialEdges = [];

const panelStyle = {
  padding: '16px',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  background: '#ffffff',
  boxShadow: '0 8px 16px rgba(15, 23, 42, 0.04)'
};

const codeStyle = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '12px',
  fontSize: '12px',
  whiteSpace: 'pre-wrap'
};

function WidgetCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [widgetInfo, setWidgetInfo] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastResponse, setLastResponse] = useState(null);
  const [tablesStatus, setTablesStatus] = useState('idle');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [rowsCount, setRowsCount] = useState(10);
  const [colsCount, setColsCount] = useState(8);

  const nodeTypes = useMemo(() => ({ tableWidget: WidgetNode }), []);

  const createTableNode = useCallback((table, index) => ({
    id: `table-${table.id}`,
    type: 'tableWidget',
    position: {
      x: 360 + (index % 2) * 420,
      y: 80 + Math.floor(index / 2) * 320
    },
    style: {
      width: 520,
      height: 420
    },
    data: {
      table
    }
  }), []);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const updateInfo = useCallback(
    (info) => {
      setWidgetInfo(info);
      setNodes((current) =>
        current.map((node) =>
          node.id === 'table-widget'
            ? {
                ...node,
                data: {
                  ...node.data,
                  info,
                  config: info.config
                }
              }
            : node
        )
      );
    },
    [setNodes]
  );

  useEffect(() => {
    window.getInfo = updateInfo;
    return () => {
      delete window.getInfo;
    };
  }, [updateInfo]);

  useEffect(() => {
    let isMounted = true;
    const loadTables = async () => {
      setTablesStatus('loading');
      try {
        const response = await axios.get(TABLES_API);
        if (!isMounted) {
          return;
        }
        const tables = response.data || [];
        const tableNodes = tables.map((table, index) => createTableNode(table, index));
        setNodes((current) => {
          const baseNodes = current.filter((node) => node.id === 'table-widget');
          return [...baseNodes, ...tableNodes];
        });
        setTablesStatus('success');
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setTablesStatus('error');
        }
      }
    };

    loadTables();
    return () => {
      isMounted = false;
    };
  }, [createTableNode, setNodes]);

  const handleSync = async () => {
    if (!widgetInfo) {
      alert('Сначала вызовите getInfo, чтобы отправить данные.');
      return;
    }

    setSyncStatus('loading');
    try {
      const response = await axios.post(API_BASE, widgetInfo);
      setLastResponse(response.data);
      setSyncStatus('success');
    } catch (error) {
      console.error(error);
      setSyncStatus('error');
    }
  };

  const handleCreateTable = async () => {
    if (!newTitle.trim()) {
      alert('Введите название таблицы');
      return;
    }

    const emptyRows = Array.from({ length: rowsCount }, () =>
      Array.from({ length: colsCount }, () => '')
    );

    try {
      const response = await axios.post(TABLES_API, {
        title: newTitle,
        data: { rows: emptyRows }
      });
      setNodes((current) => {
        const index = current.length;
        const newNode = createTableNode(response.data, index);
        return [...current, newNode];
      });
      setNewTitle('');
      setRowsCount(10);
      setColsCount(8);
      setShowCreateDialog(false);
    } catch (error) {
      console.error(error);
      alert('Ошибка создания таблицы');
    }
  };

  const simulateInfo = () => {
    updateInfo({
      widgetId: 101,
      userId: 42,
      role: 'editor',
      config: {
        view: 'sheet',
        theme: 'light',
        allowExport: true
      },
      board: {
        id: 7,
        name: 'Аналитика продаж',
        parentId: 2
      }
    });
  };

  return (
    <ReactFlowProvider>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div style={{ height: '70vh', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeDragHandle=".node-drag-handle"
            fitView
          >
            <MiniMap pannable zoomable />
            <Controls />
            <Background gap={16} color="#e2e8f0" />
          </ReactFlow>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>Создать таблицу</h3>
            <button
              onClick={() => setShowCreateDialog(true)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#22c55e',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              + Новая таблица
            </button>
          </div>
          <div style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>Интеграция getInfo</h3>
            <p style={{ color: '#4b5563', marginTop: 0 }}>
              Платформа вызывает <code>window.getInfo(info)</code> при создании виджета.
            </p>
            <button
              onClick={simulateInfo}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#2563eb',
                color: '#fff',
                cursor: 'pointer',
                marginRight: '8px'
              }}
            >
              Симулировать getInfo
            </button>
            <button
              onClick={handleSync}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5f5',
                background: '#eff6ff',
                color: '#1d4ed8',
                cursor: 'pointer'
              }}
            >
              Отправить на бэк
            </button>
            <div style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280' }}>
              Статус: {syncStatus}
            </div>
          </div>

          <div style={panelStyle}>
            <h4 style={{ marginTop: 0 }}>Таблицы на холсте</h4>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              Статус загрузки: {tablesStatus}
            </div>
            <p style={{ marginBottom: 0, fontSize: '13px', color: '#4b5563' }}>
              Каждая таблица визуализируется как отдельный узел XYFlow.
            </p>
          </div>

          <div style={panelStyle}>
            <h4 style={{ marginTop: 0 }}>Текущая конфигурация</h4>
            <pre style={codeStyle}>
              {widgetInfo ? JSON.stringify(widgetInfo, null, 2) : 'Нет данных. Ждём getInfo.'}
            </pre>
          </div>

          {lastResponse && (
            <div style={panelStyle}>
              <h4 style={{ marginTop: 0 }}>Ответ бэка</h4>
              <pre style={codeStyle}>{JSON.stringify(lastResponse, null, 2)}</pre>
            </div>
          )}

        </div>
      </div>

      {showCreateDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            width: '400px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginTop: 0 }}>Новая таблица</h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Название таблицы
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Например: Продажи за 2025"
                style={{ width: '100%', padding: '10px', fontSize: '16px' }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Строк
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={rowsCount}
                  onChange={e => setRowsCount(parseInt(e.target.value, 10) || 1)}
                  style={{ width: '100%', padding: '10px', fontSize: '16px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Столбцов
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={colsCount}
                  onChange={e => setColsCount(parseInt(e.target.value, 10) || 1)}
                  style={{ width: '100%', padding: '10px', fontSize: '16px' }}
                />
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                onClick={() => setShowCreateDialog(false)}
                style={{ marginRight: '10px', padding: '10px 20px' }}
              >
                Отмена
              </button>
              <button
                onClick={handleCreateTable}
                style={{
                  padding: '10px 24px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold'
                }}
              >
                Создать {rowsCount}×{colsCount}
              </button>
            </div>
          </div>
        </div>
      )}
    </ReactFlowProvider>
  );
}

export default WidgetCanvas;
