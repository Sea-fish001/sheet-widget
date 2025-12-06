import React, { useEffect, useState, useRef } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

registerAllModules();

const API_BASE = 'http://localhost:8000/api/tables/';

function TableEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const hotRef = useRef(null);

  const [title, setTitle] = useState('');
  const [hotData, setHotData] = useState([['']]);

  useEffect(() => {
    axios.get(`${API_BASE}${id}/`).then(res => {
      setTitle(res.data.title || 'Без названия');

      let rows = [];
      if (Array.isArray(res.data.data)) {
        rows = res.data.data;
      } else if (res.data.data && Array.isArray(res.data.data.rows)) {
        rows = res.data.data.rows;
      }

      setHotData(rows.length > 0 ? rows.map(row => row.map(cell => cell ?? '')) : [['']]);
    });
  }, [id]);

  const saveTable = () => {
    if (!hotRef.current) return;
    const hot = hotRef.current.hotInstance;
    const currentData = hot.getData();

    axios.patch(`${API_BASE}${id}/`, {
      title,
      data: { rows: currentData }
    }).then(() => {
      alert('Таблица сохранена!');
    }).catch(() => alert('Ошибка сохранения'));
  };

  // Добавление строки
  const addRow = () => {
    const hot = hotRef.current.hotInstance;
    const colCount = hot.countCols();
    const newRow = Array(colCount).fill('');
    hot.alter('insert_row_below', hot.countRows());
    // Данные обновятся автоматически благодаря two-way binding
  };

  // Добавление столбца
  const addColumn = () => {
    const hot = hotRef.current.hotInstance;
    hot.alter('insert_col_end');
  };

  // Удаление последней строки (по желанию)
  const removeRow = () => {
    const hot = hotRef.current.hotInstance;
    if (hot.countRows() <= 1) return;
    hot.alter('remove_row', hot.countRows() - 1);
  };

  // Удаление последнего столбца
  const removeColumn = () => {
    const hot = hotRef.current.hotInstance;
    if (hot.countCols() <= 1) return;
    hot.alter('remove_col', hot.countCols() - 1);
  };

  return (
    <div>
      {/* Панель управления */}
      <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => navigate(-1)}>Назад</button>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ fontSize: '20px', padding: '8px', width: '350px' }}
          placeholder="Название таблицы"
        />

        <button onClick={saveTable} style={{ padding: '10px 20px', fontWeight: 'bold', background: '#007bff', color: 'white' }}>
          Сохранить
        </button>
      </div>

      {/* Кнопки добавления строк и столбцов */}
      <div style={{ marginBottom: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '8px', display: 'inline-block' }}>
        <strong>Управление таблицей:</strong>{' '}
        <button onClick={addRow} style={{ margin: '0 5px', padding: '6px 12px' }}>Добавить строку</button>
        <button onClick={addColumn} style={{ margin: '0 5px', padding: '6px 12px' }}>Добавить столбец</button>
        <button onClick={removeRow} style={{ margin: '0 5px', padding: '6px 12px' }}>Удалить строку</button>
        <button onClick={removeColumn} style={{ margin: '0 5px', padding: '6px 12px' }}>Удалить столбец</button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <button onClick={() => window.open(`${API_BASE}${id}/export_csv/`)}>Экспорт CSV</button>
        <button onClick={() => window.open(`${API_BASE}${id}/export_json/`)} style={{ marginLeft: '10px' }}>
          Экспорт JSON
        </button>
      </div>

      {/* Сама таблица */}
      <HotTable
        ref={hotRef}
        data={hotData}
        rowHeaders={true}
        colHeaders={true}
        height="70vh"
        width="100%"
        licenseKey="non-commercial-and-evaluation"

        // ВСЁ, ЧТО ТЫ ПРОСИЛ:
        contextMenu={true}                    // Правая кнопка — форматирование, копипаст и т.д.
        manualRowResize={true}                // Можно тянуть за нижнюю границу строки → менять высоту
        manualColumnResize={true}             // Тяни за границу заголовка столбца → менять ширину
        manualRowMove={true}                  // Перетаскивать строки
        manualColumnMove={true}               // Перетаскивать столбцы
        stretchH="all"                        // Автоматически растягивать столбцы
        autoColumnSize={true}                 // Умный размер по содержимому
        fixedRowsTop={0}
        fixedColumnsStart={1}                 // Закрепить первый столбец (по желанию)

        // Автосохранение при изменении размеров (необязательно, но круто)
        afterColumnResize={() => saveTable()}
        afterRowResize={() => saveTable()}
      />
    </div>
  );
}

export default TableEditor;