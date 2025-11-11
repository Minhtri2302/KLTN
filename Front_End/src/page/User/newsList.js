
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNewsList } from '../../service/news.service';
import "../../CSS/news.css";
import Toast from "../../components/Toast";
import Loading from "../../components/Loading";

export default function NewsList() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: '' });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const list = await getNewsList();
        if (mounted) setNews(list || []);
        if (mounted && (!list || list.length === 0)) {
          setToast({ message: 'Không có tin tức nào.', type: 'info' });
        }
      } catch (err) {
        setToast({ message: 'Lỗi khi tải tin tức', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="container" style={{ padding: '20px 0' }}>
      <h2>News</h2>
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: '' })}
        />
      )}
      <div className="row">
        {news && news.length > 0 ? news.map((item) => (
          <div key={item._id || item.id} className="col-md-6" style={{ marginBottom: 16 }}>
            <div className="card">
              {item.image && <img src={item.image} alt={item.title} className="card-img-top" style={{ maxHeight: 200, objectFit: 'cover' }} />}
              <div className="card-body">
                <h5 className="card-title">{item.title}</h5>
                <p className="card-text">{(item.content || '').slice(0, 150)}{(item.content || '').length > 150 ? '...' : ''}</p>
                <p className="card-text"><small className="text-muted">{item.author ? `By ${item.author}` : ''} {item.publishedAt ? ` - ${new Date(item.publishedAt).toLocaleDateString()}` : ''}</small></p>
                <p className="card-text"><small className="text-muted">👁️ {typeof item.views === 'number' ? item.views : 0} lượt xem</small></p>
                <Link to={`/news/${item._id || item.id}`} className="btn btn-primary">Read more</Link>
              </div>
            </div>
          </div>
        )) : null}
      </div>
    </div>
  );
}
