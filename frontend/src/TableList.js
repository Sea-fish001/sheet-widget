import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/tables/';

function TableList({ onTableSelect }) {
  const [tables, setTables] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [rowsCount, setRowsCount] = useState(10);
  const [colsCount, setColsCount] = useState(8);

  useEffect(() => {
    axios.get(API_BASE).then(res => setTables(res.data));
  }, []);

  const createTableWithSize = () => {
    if (!newTitle.trim()) {
      alert('Введите название таблицы');
      return;
    }

    const emptyRows = Array.from({ length: rowsCount }, () =>
      Array.from({ length: colsCount }, () => '')
    );

    axios.post(API_BASE, {
      title: newTitle,
      data: { rows: emptyRows }
    }).then(res => {
      setTables([res.data, ...tables]);
      setNewTitle('');
      setRowsCount(10);
      setColsCount(8);
      setShowCreateDialog(false);
      // Автоматически открываем новую таблицу для редактирования
      onTableSelect(res.data.id);
    }).catch(err => {
      console.error(err);
      alert('Ошибка создания таблицы');
    });
  };

  const handleTableClick = (tableId) => {
    if (onTableSelect) {
      onTableSelect(tableId);
    }
  };

//<h2>Мои таблицы</h2>
  return (
    <div>


      <button
        onClick={() => setShowCreateDialog(true)}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          background: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        + Создать новую таблицу
      </button>

      {showCreateDialog && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
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
                  onChange={e => setRowsCount(parseInt(e.target.value) || 1)}
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
                  onChange={e => setColsCount(parseInt(e.target.value) || 1)}
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
                onClick={createTableWithSize}
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

      <div style={{ marginTop: '30px' }}>
        {tables.length === 0 ? (
          <p style={{ color: '#666', fontSize: '18px' }}>
            Таблиц пока нет. Нажмите кнопку выше, чтобы создать первую!
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '15px'
          }}>
            {tables.map(table => {
              const rowCount = Array.isArray(table.data?.rows) ? table.data.rows.length : 0;
              const colCount = rowCount > 0 ? table.data.rows[0].length : 0;

              return (
                <div
                  key={table.id}
                  onClick={() => handleTableClick(table.id)}
                  style={{
                    padding: '15px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'}
                >
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '500',
                    color: '#007bff',
                    marginBottom: '8px'
                  }}>
                    {table.title || 'Без названия'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {rowCount} строк × {colCount} столбцов
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    Обновлено: {new Date(table.updated_at).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default TableList;