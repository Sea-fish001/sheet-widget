import React, { useCallback, useEffect, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { getInfo as persistInfo } from './getInfo';

const defaultInfo = {
  widget_id: null,
  user_id: null,
  role: '',
  config: {},
  board: {},
};

function SheetWidgetNode({ data }) {
  const [widgetInfo, setWidgetInfo] = useState(data?.info || defaultInfo);

  useEffect(() => {
    if (data?.info) {
      setWidgetInfo(data.info);
    }
  }, [data]);

  const getInfo = useCallback(async (payload) => {
    const normalized = await persistInfo(payload);
    setWidgetInfo(normalized);

    if (data?.onInfoStored) {
      data.onInfoStored(normalized);
    }

    return normalized;
  }, [data]);

  useEffect(() => {
    if (data?.onReady) {
      data.onReady({ getInfo });
    }
  }, [data, getInfo]);

  return (
    <div style={{
      padding: 12,
      borderRadius: 10,
      border: '1px solid #d0d5dd',
      background: '#ffffff',
      minWidth: 220,
      fontFamily: 'Inter, sans-serif',
      boxShadow: '0 6px 20px rgba(15, 23, 42, 0.08)'
    }}>
      <Handle type="target" position={Position.Left} />
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Sheet Widget</div>
      <div style={{ fontSize: 12, color: '#667085' }}>
        Board: {widgetInfo.board?.name || '—'}
      </div>
      <div style={{ fontSize: 12, color: '#667085' }}>
        Role: {widgetInfo.role || '—'}
      </div>
      <div style={{ fontSize: 12, color: '#667085' }}>
        Widget ID: {widgetInfo.widget_id ?? '—'}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default SheetWidgetNode;
