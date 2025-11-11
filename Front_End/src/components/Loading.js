import React from 'react';
import '../CSS/loading.css';

export default function Loading({ message = 'Đang tải dữ liệu' }) {
  return (
    <div className="loading-overlay">
      <div className="loading-spinner"></div>
      <p className="loading-text">
        {message}
        <span className="loading-dots"></span>
      </p>
    </div>
  );
}
