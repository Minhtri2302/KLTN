
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getNewsById } from '../../service/news.service';
import "../../CSS/news.css";
import Toast from "../../components/Toast";
import Loading from "../../components/Loading";

export default function NewsDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: '' });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getNewsById(id);
        if (mounted) setItem(data);
        if (mounted && !data) setToast({ message: 'Không tìm thấy bài viết.', type: 'info' });
      } catch (err) {
        setToast({ message: 'Lỗi khi tải bài viết', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <Loading />;

  return (
    <div className="container" style={{ padding: '20px 0' }}>
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: '' })}
        />
      )}
      <Link to="/news" className="btn btn-sm btn-secondary mb-3">&larr; Back to news</Link>
      {item ? (
        <>
          <h1>{item.title}</h1>
          <p className="text-muted">{item.author ? `By ${item.author}` : ''} {item.publishedAt ? ` - ${new Date(item.publishedAt).toLocaleDateString()}` : ''}</p>
          {item.image && <img className="news-hero-img" src={item.image} alt={item.title} loading="lazy" style={{ marginBottom: 20 }} />}
          <div className="news-detail-content" dangerouslySetInnerHTML={{ __html: item.content || item.description || '' }} />
        </>
      ) : null}
    </div>
  );
}
