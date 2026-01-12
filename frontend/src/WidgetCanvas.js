import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    id: 'table-widget-1',
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

const createEmptyRows = (rowsCount, colsCount) =>
  Array.from({ length: rowsCount }, () => Array.from({ length: colsCount }, () => ''));

const applyNodeProps = (node, nodeProps) => {
  if (!nodeProps || typeof nodeProps !== 'object') {
    return node;
  }

  const {
    style,
    className,
    draggable,
    selectable,
    connectable,
    focusable,
    zIndex
  } = nodeProps;

  return {
    ...node,
    style: style ? { ...(node.style || {}), ...style } : node.style,
    className: className ?? node.className,
    draggable: draggable ?? node.draggable,
    selectable: selectable ?? node.selectable,
    connectable: connectable ?? node.connectable,
    focusable: focusable ?? node.focusable,
    zIndex: zIndex ?? node.zIndex
  };
};

function WidgetCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [widgetInfo, setWidgetInfo] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastResponse, setLastResponse] = useState(null);
  const nodeCounterRef = useRef(2);

  const nodeTypes = useMemo(() => ({ tableWidget: WidgetNode }), []);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const updateInfo = useCallback((info) => {
    setWidgetInfo(info);
    setNodes((current) =>
      current.map((node) => {
        if (node.type !== 'tableWidget') {
          return node;
        }
        const updatedNode = {
          ...node,
          data: {
            ...node.data,
            info,
            config: info.config
          }
        };
        return applyNodeProps(updatedNode, info?.config?.nodeProps);
      })
    );
  }, [setNodes]);

  useEffect(() => {
    window.getInfo = updateInfo;
    return () => {
      delete window.getInfo;
    };
  }, [updateInfo]);

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

  const handleCreateTableForWidget = useCallback(async (nodeId, title, rowsCount, colsCount) => {
    const emptyRows = createEmptyRows(rowsCount, colsCount);
    const response = await axios.post(TABLES_API, {
      title,
      data: { rows: emptyRows }
    });

    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId
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

    return response.data;
  }, [setNodes]);

  useEffect(() => {
    setNodes((current) =>
      current.map((node) =>
        node.type === 'tableWidget'
          ? {
              ...node,
              data: {
                ...node.data,
                onCreateTable: handleCreateTableForWidget
              }
            }
          : node
      )
    );
  }, [handleCreateTableForWidget, setNodes]);

  const createWidgetNode = useCallback((index) => {
    const baseNode = {
      id: `table-widget-${index}`,
      type: 'tableWidget',
      position: {
        x: 120 + (index % 2) * 420,
        y: 120 + Math.floor(index / 2) * 320
      },
      style: {
        width: 520,
        height: 420
      },
      data: {
        title: 'Табличный виджет',
        description: 'Редактор таблиц и аналитики',
        info: widgetInfo,
        config: widgetInfo?.config,
        onCreateTable: handleCreateTableForWidget
      }
    };
    return applyNodeProps(baseNode, widgetInfo?.config?.nodeProps);
  }, [handleCreateTableForWidget, widgetInfo]);

  const handleAddWidget = useCallback(() => {
    setNodes((current) => {
      const nextIndex = nodeCounterRef.current;
      nodeCounterRef.current += 1;
      const newNode = createWidgetNode(nextIndex);
      return [...current, newNode];
    });
  }, [createWidgetNode, setNodes]);

  const simulateInfo = () => {
    updateInfo({
      widgetId: 101,
      userId: 42,
      role: 'editor',
      config: {
        view: 'sheet',
        theme: 'light',
        allowExport: true,
        nodeProps: {
          style: {
            borderColor: '#2563eb'
          }
        }
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
            <h3 style={{ marginTop: 0 }}>Создать виджет</h3>
            <button
              onClick={handleAddWidget}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#22c55e',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              + Новый виджет
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
    </ReactFlowProvider>
  );
}

export default WidgetCanvas;
