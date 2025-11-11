import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { listProducts } from '../../service/product.service';
import { listOrders } from '../../service/order.service';
import Loading from '../../components/Loading';

function tsFromObjId(id) {
  // ObjectId hex -> timestamp in ms
  try {
    if (!id || id.length < 8) return 0;
    return parseInt(id.substring(0, 8), 16) * 1000;
  } catch (e) { return 0; }
}

export default function AdminOverview({ token }) {
  const ctx = useOutletContext() || {};
  // fallback token when prop isn't provided
  const effectiveToken = token || sessionStorage.getItem('token');
  const ctxOrders = ctx.overviewOrders || [];
  const ctxProducts = ctx.overviewProducts || [];

  const [overviewOrders, setOverviewOrders] = useState(ctxOrders);
  const [overviewProducts, setOverviewProducts] = useState(ctxProducts);
  const [stats] = useState(ctx.stats || {});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If token provided, fetch fresh data and compute latest items
  if (!effectiveToken) return; // rely on outlet context when no token

    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [productsList, ordersList] = await Promise.all([
          listProducts(effectiveToken),
          listOrders(effectiveToken)
        ]);

        if (!mounted) return;

        // sort orders by createdAt if present, else by ObjectId timestamp
        const sortedOrders = (ordersList || []).slice().sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : tsFromObjId(a._id || '0');
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : tsFromObjId(b._id || '0');
          return tb - ta;
        });

        // sort products by createdAt or ObjectId timestamp
        const sortedProducts = (productsList || []).slice().sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : tsFromObjId(a._id || '0');
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : tsFromObjId(b._id || '0');
          return tb - ta;
        });

        setOverviewOrders(sortedOrders.slice(0, 5));
        setOverviewProducts(sortedProducts.slice(0, 5));
      } catch (err) {
        console.error('Error loading overview lists', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [token]);

  return (
    <div>
      {loading ? (
        <Loading />
      ) : (
        <>
          {/* Stats Cards */}
          <div className="stats-cards">
            <div className="stat-card products">
              <h3>SẢN PHẨM</h3>
              <p className="stat-value">{stats.totalProducts || 0}</p>
            </div>
            <div className="stat-card orders">
              <h3>ĐƠN HÀNG</h3>
              <p className="stat-value">{stats.totalOrders || 0}</p>
            </div>
            <div className="stat-card users">
              <h3>NGƯỜI DÙNG</h3>
              <p className="stat-value">{stats.totalUsers || 0}</p>
            </div>
            <div className="stat-card revenue">
              <h3>DOANH THU</h3>
              <p className="stat-value">{(stats.totalRevenue || 0).toLocaleString('vi-VN')}đ</p>
            </div>
          </div>

          <h3 style={{ marginTop: '2rem' }}>Chào mừng đến với trang quản trị</h3>
          <p>Sử dụng menu bên trái để quản lý sản phẩm, đơn hàng, người dùng và banners.</p>
      <div className="overview-panels mt-4">
        <div className="overview-panel">
          <h5>Đơn hàng gần đây</h5>
          <div className="panel-body">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Mã ĐH</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {overviewOrders.map(order => (
                  <tr key={order._id}>
                    <td className="mono">{order._id}</td>
                    <td>{(order.totalAmount || order.total || 0).toLocaleString('vi-VN')}đ</td>
                    <td><span className={`order-status ${order.status}`}>{order.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overview-panel">
          <h5>Sản phẩm mới</h5>
          <div className="panel-body">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Tên sản phẩm</th>
                  <th>Giá</th>
                </tr>
              </thead>
              <tbody>
                {overviewProducts.map(product => (
                  <tr key={product._id}>
                    <td>{product.name}</td>
                    <td>{(product.price || 0).toLocaleString('vi-VN')}đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
