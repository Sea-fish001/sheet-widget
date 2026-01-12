import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import TableList from './TableList';
import TableEditor from './TableEditor';
import WidgetCanvas from './WidgetCanvas';
import 'handsontable/dist/handsontable.full.min.css';

function App() {
  const [activeTableId, setActiveTableId] = useState(null);

  return (
    <Router>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <nav style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
          <Link to="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}>
            Таблицы
          </Link>
          <Link to="/flow" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}>
            XYFlow демо
          </Link>
        </nav>
        <Routes>
          <Route path="/" element={
            <div>
              <div style={{ marginBottom: '15px' }}>
                <TableList onTableSelect={setActiveTableId} />
              </div>
              {activeTableId && (
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  marginTop: '5px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <h3>Редактор таблицы</h3>
                    <button
                      onClick={() => setActiveTableId(null)}
                      style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}
                    >
                      Закрыть редактор
                    </button>
                  </div>
                  <TableEditor id={activeTableId} compactMode={false} />
                </div>
              )}
            </div>
          } />
          <Route path="/flow" element={<WidgetCanvas />} />
          <Route path="/table/:id" element={<TableEditor />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
