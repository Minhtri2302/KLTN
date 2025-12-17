import React, { useEffect, useState } from 'react';
import { getMonthlyStatistics } from '../../service/statistics.service';
import Loading from '../../components/Loading';
import '../../CSS/statistics.css';

export default function Statistics() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    loadStatistics();
  }, [year]);

  const loadStatistics = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        setError('Vui lòng đăng nhập');
        return;
      }
      const result = await getMonthlyStatistics(token, year);
      setData(result);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải thống kê');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <div className="alert alert-info">Không có dữ liệu</div>;

  const maxRevenue = Math.max(...data.monthlyData.map(m => m.totalRevenue), 1);
  const maxOrders = Math.max(...data.monthlyData.map(m => m.totalOrders), 1);

  return (
    <div className="statistics-container">
      <div className="statistics-header">
        <h1>Thống kê</h1>
        <select 
          value={year} 
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="form-select year-select"
        >
          {years.map(y => (
            <option key={y} value={y}>Năm {y}</option>
          ))}
        </select>
      </div>

      {/* Tổng quan */}
      <div className="summary-cards">
        <div className="summary-card">
          <h5>Tổng đơn hàng</h5>
          <p className="value">{data.summary.totalOrders}</p>
        </div>
        <div className="summary-card">
          <h5>Đơn hoàn thành</h5>
          <p className="value success">{data.summary.totalCompleted}</p>
        </div>
        <div className="summary-card">
          <h5>Đơn hủy</h5>
          <p className="value danger">{data.summary.totalCancelled}</p>
        </div>
        <div className="summary-card">
          <h5>Tổng doanh thu</h5>
          <p className="value revenue">{data.summary.totalRevenue.toLocaleString('vi-VN')}đ</p>
        </div>
      </div>

      {/* Biểu đồ doanh thu */}
      <div className="chart-section">
        <h4>Doanh thu theo tháng</h4>
        <div className="bar-chart">
          {data.monthlyData.map((month) => (
            <div key={month.month} className="bar-item">
              <div className="bar-wrapper">
                <div 
                  className="bar revenue-bar" 
                  style={{ height: `${(month.totalRevenue / maxRevenue) * 100}%` }}
                  title={`${month.totalRevenue.toLocaleString('vi-VN')}đ`}
                />
              </div>
              <div className="bar-label">T{month.month}</div>
              <div className="bar-value">{(month.totalRevenue / 1000000).toFixed(1)}M</div>
            </div>
          ))}
        </div>
      </div>

      {/* Biểu đồ đơn hàng */}
      <div className="chart-section">
        <h4>Số lượng đơn hàng theo tháng</h4>
        <div className="bar-chart">
          {data.monthlyData.map((month) => (
            <div key={month.month} className="bar-item">
              <div className="bar-wrapper">
                <div 
                  className="bar orders-bar" 
                  style={{ height: `${(month.totalOrders / maxOrders) * 100}%` }}
                  title={`${month.totalOrders} đơn hàng`}
                />
              </div>
              <div className="bar-label">T{month.month}</div>
              <div className="bar-value">{month.totalOrders}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bảng chi tiết */}
      <div className="table-section">
        <h4>Chi tiết theo tháng</h4>
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Tháng</th>
              <th>Tổng đơn</th>
              <th>Hoàn thành</th>
              <th>Đã hủy</th>
              <th>Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            {data.monthlyData.map((month) => (
              <tr key={month.month}>
                <td>Tháng {month.month}</td>
                <td>{month.totalOrders}</td>
                <td className="text-success">{month.completedOrders}</td>
                <td className="text-danger">{month.cancelledOrders}</td>
                <td>{month.totalRevenue.toLocaleString('vi-VN')}đ</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="table-active">
              <th>Tổng cộng</th>
              <th>{data.summary.totalOrders}</th>
              <th className="text-success">{data.summary.totalCompleted}</th>
              <th className="text-danger">{data.summary.totalCancelled}</th>
              <th>{data.summary.totalRevenue.toLocaleString('vi-VN')}đ</th>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Top sản phẩm */}
      {data.topProducts && data.topProducts.length > 0 && (
        <div className="table-section">
          <h4>Top 10 sản phẩm bán chạy năm {year}</h4>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>STT</th>
                <th>Tên sản phẩm</th>
                <th>Số lượng bán</th>
                <th>Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((product, index) => (
                <tr key={product._id}>
                  <td>{index + 1}</td>
                  <td>{product.productName || 'N/A'}</td>
                  <td>{product.totalQuantity}</td>
                  <td>{product.totalRevenue.toLocaleString('vi-VN')}đ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
