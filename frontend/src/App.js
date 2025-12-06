import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TableList from './TableList';
import TableEditor from './TableEditor';
import 'handsontable/dist/handsontable.full.min.css';

function App() {
  return (
    <Router>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <Routes>
          <Route path="/" element={<TableList />} />
          <Route path="/table/:id" element={<TableEditor />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;