import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_BASE = 'http://localhost:8000/api/tables/';

function TableList() {
  const [tables, setTables] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Форма создания
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

    // Создаём двумерный массив нужного размера
    const emptyRows = Array.from({ length: rowsCount }, () =>
      Array.from({ length: colsCount }, () => '')
    );

    axios.post(API_BASE, {
      title: newTitle,
      data: { rows: emptyRows }
    }).then(res => {
      setTables([res.data, ...tables]);
      // Сбрасываем форму
      setNewTitle('');
      setRowsCount(10);
      setColsCount(8);
      setShowCreateDialog(false);
    }).catch(err => {
      console.error(err);
      alert('Ошибка создания таблицы');
    });
  };

  return (
    <div>
      <h2>Мои таблицы</h2>

      {/* Кнопка открытия диалога */}
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

      {/* Модальное окно (простое, без лишних библиотек) */}
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

      {/* Список таблиц */}
      <div style={{ marginTop: '30px' }}>
        {tables.length === 0 ? (
          <p style={{ color: '#666', fontSize: '18px' }}>
            Таблиц пока нет. Нажмите кнопку выше, чтобы создать первую!
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {tables.map(table => {
              const rowCount = Array.isArray(table.data?.rows) ? table.data.rows.length : 0;
              const colCount = rowCount > 0 ? table.data.rows[0].length : 0;

              return (
                <li key={table.id} style={{
                  margin: '12px 0',
                  padding: '15px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  <Link
                    to={`/table/${table.id}`}
                    style={{ textDecoration: 'none', color: '#007bff', fontSize: '20px', fontWeight: '500' }}
                  >
                    {table.title || 'Без названия'}
                  </Link>
                  <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                    {rowCount} строк × {colCount} столбцов •
                    обновлено: {new Date(table.updated_at).toLocaleString()}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default TableList;