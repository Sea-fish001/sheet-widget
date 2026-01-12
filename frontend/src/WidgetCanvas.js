import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const allowedNodeProps = new Set([
  'style',
  'className',
  'draggable',
  'selectable',
  'connectable',
  'hidden',
  'width',
  'height',
  'extent',
  'parentNode',
  'expandParent',
  'sourcePosition',
  'targetPosition',
  'dragHandle',
  'zIndex',
  'focusable'
]);

const buildWidgetNode = (widgetId, index, extraProps = {}, tableDefaults = {}) => ({
  id: `widget-${widgetId}`,
  type: 'tableWidget',
  position: {
    x: 120 + (index % 2) * 420,
    y: 120 + Math.floor(index / 2) * 320
  },
  data: {
    title: 'Табличный виджет',
    widgetId,
    autoCreateTable: Boolean(tableDefaults?.autoCreateTable),
    initialTableTitle: tableDefaults?.title || 'Новая таблица',
    initialRows: tableDefaults?.rows || 10,
    initialCols: tableDefaults?.cols || 8,
    nodeProps: extraProps
  },
  ...extraProps
});

const pickNodeProps = (nodeProps = {}) =>
  Object.entries(nodeProps).reduce((acc, [key, value]) => {
    if (allowedNodeProps.has(key)) {
      acc[key] = value;
    }
    return acc;
  }, {});

function WidgetCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [lastInfo, setLastInfo] = useState(null);
  const [targetWidgetId, setTargetWidgetId] = useState(1);
  const nextWidgetId = useRef(1);

  const nodeTypes = useMemo(() => ({ tableWidget: WidgetNode }), []);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const handleCreateWidget = useCallback(() => {
    setNodes((current) => {
      const widgetId = nextWidgetId.current++;
      setTargetWidgetId(widgetId);
      return [
        ...current,
        buildWidgetNode(widgetId, current.length, {}, {
          autoCreateTable: true
        })
      ];
    });
  }, [setNodes]);

  const updateInfo = useCallback(
    (info) => {
      const cleanedNodeProps = pickNodeProps(info?.config?.nodeProps || info?.nodeProps || {});
      setLastInfo(info);
      setNodes((current) => {
        const matchIndex = current.findIndex(
          (node) => node.data?.widgetId === info.widgetId || node.id === `widget-${info.widgetId}`
        );

        if (matchIndex === -1) {
          const newNode = buildWidgetNode(info.widgetId, current.length, cleanedNodeProps);
          return [
            ...current,
            {
              ...newNode,
              data: {
                ...newNode.data,
                info,
                config: info.config,
                nodeProps: cleanedNodeProps
              }
            }
          ];
        }

        return current.map((node) =>
          node.data?.widgetId === info.widgetId || node.id === `widget-${info.widgetId}`
            ? {
                ...node,
                ...cleanedNodeProps,
                data: {
                  ...node.data,
                  info,
                  config: info.config,
                  nodeProps: cleanedNodeProps
                }
              }
            : node
        );
      });
    },
    [setNodes]
  );

  useEffect(() => {
    window.getInfo = updateInfo;
    return () => {
      delete window.getInfo;
    };
  }, [updateInfo]);

  const simulateInfo = () => {
    updateInfo({
      widgetId: Number(targetWidgetId) || 1,
      userId: 42,
      role: 'editor',
      config: {
        view: 'sheet',
        theme: 'light',
        allowExport: true,
        nodeProps: {
          style: {
            width: 520,
            height: 420
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
            <h3 style={{ marginTop: 0 }}>Тестовый canvas</h3>
            <button
              onClick={handleCreateWidget}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#22c55e',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              + Создать виджет
            </button>
          </div>

          <div style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>Интеграция getInfo</h3>
            <p style={{ color: '#4b5563', marginTop: 0 }}>
              Платформа вызывает <code>window.getInfo(info)</code> при создании виджета.
            </p>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#4b5563' }}>
              Widget ID
            </label>
            <input
              type="number"
              min="1"
              value={targetWidgetId}
              onChange={(event) => setTargetWidgetId(event.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            />
            <button
              onClick={simulateInfo}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#2563eb',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Симулировать getInfo
            </button>
          </div>

          <div style={panelStyle}>
            <h4 style={{ marginTop: 0 }}>Последняя конфигурация</h4>
            <pre style={codeStyle}>
              {lastInfo ? JSON.stringify(lastInfo, null, 2) : 'Нет данных. Ждём getInfo.'}
            </pre>
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}

export default WidgetCanvas;
