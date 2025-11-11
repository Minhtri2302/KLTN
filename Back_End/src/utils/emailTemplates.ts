export function formatCurrencyVND(n: number) {
  try { return (Number(n) || 0).toLocaleString('vi-VN') + '₫'; } catch (e) { return String(n); }
}

export function buildOrderEmail(order: any) {
  const orderId = String(order._id);
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN');
  const status = order.status || 'Đang chờ xử lý';
  const shipping = order.shipping || {};
  const shippingName = shipping.fullName || shipping.name || '';
  const shippingEmail = shipping.email || order.email || '';
  const shippingPhone = shipping.phone || '';
  let shippingAddress = '';
  if (typeof shipping.address === 'string') {
    shippingAddress = shipping.address;
  } else if (shipping.address && typeof shipping.address === 'object') {
    // handle Stripe-style address object
    const a = shipping.address;
    const parts = [];
    if (a.line1) parts.push(a.line1);
    if (a.line2) parts.push(a.line2);
    if (a.city) parts.push(a.city);
    if (a.state) parts.push(a.state);
    if (a.postal_code) parts.push(a.postal_code);
    if (a.country) parts.push(a.country);
    shippingAddress = parts.filter(Boolean).join(', ');
  } else {
    shippingAddress = (shipping.address && shipping.address.full) || '';
  }

  let itemsHtml = '';
  let itemsText = '';
  let subtotal = 0;

  (order.items || []).forEach((it: any) => {
    const qty = it.quantity || it.qty || 1;
    const price = Number(it.price || 0);
    const line = price * qty;
    subtotal += line;

    const safeName = String(it.name || '').replace(/</g, '&lt;');
    const imageUrl = it.image || it.imageUrl || it.thumb || '';

    const productHtml = `
      <div style="display:flex; align-items:center; gap:10px;">
        ${imageUrl ? `<img src="${imageUrl}" alt="${safeName}" style="width:56px; height:56px; border-radius:6px; object-fit:cover;"/>` : ''}
        <span>${safeName}</span>
      </div>`;

    itemsHtml += `
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="vertical-align:middle;">${productHtml}</td>
        <td align="center" style="vertical-align:middle;">${qty}</td>
        <td align="right" style="vertical-align:middle;">${formatCurrencyVND(line)}</td>
      </tr>`;

    itemsText += `- ${it.name || ''} x${qty}: ${formatCurrencyVND(line)}${imageUrl ? `\n  Image: ${imageUrl}` : ''}\n`;
  });

  const shippingFee = Number(order.shippingFee || 0);
  const total = subtotal + shippingFee;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      body { font-family: Arial, Helvetica, sans-serif; color: #333; margin:0; padding:0; }
      .email-wrap { max-width:700px; margin:0 auto; padding:20px; }
      .header { text-align:center; margin-bottom:18px; }
      .title { margin:0; color:#2D2A6A; font-size:22px; }
      .subtitle { color:#666; font-size:14px; }
      .order-table { width:100%; border-collapse:collapse; margin-bottom:12px; }
      .order-table th { text-align:left; font-weight:600; padding:8px 6px; }
      .order-table td { padding:8px 6px; }
      .order-summary { display:block; text-align:right; margin-bottom:16px; }
      .summary-value { font-size:14px; }
      .total { font-weight:700; font-size:18px; color:#2D2A6A; margin-top:6px; }
      .shipping { background:#fafafa; padding:12px; border-radius:6px; margin-bottom:18px; }
      .muted { color:#666; font-size:13px; }
      a { color:#2D2A6A; }
      @media only screen and (max-width:480px) {
        .email-wrap { padding:12px; }
        .title { font-size:18px; }
      }
    </style>
  </head>
  <body>
  <div class="email-wrap">
    <div class="header">
      <h2 class="title">Xác nhận đơn hàng</h2>
      <div class="subtitle">Cảm ơn bạn đã đặt hàng tại Shop của chúng tôi</div>
    </div>

    <!-- Meta Table -->
    <table class="meta" width="100%" cellpadding="6" cellspacing="0" style="background:#f6f8fa; border-radius:6px; margin-bottom:16px; font-size:14px;">
      <tr>
        <td style="width:30%; font-weight:600;">Mã đơn hàng:</td>
        <td style="color:#2D2A6A;">${orderId}</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Ngày:</td>
        <td>${orderDate}</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Trạng thái:</td>
        <td>${status}</td>
      </tr>
    </table>

    <h4 style="margin-bottom:8px;">Thông tin đơn hàng</h4>
    <table class="order-table" cellpadding="6" cellspacing="0">
      <thead>
        <tr style="background:#fafafa; border-bottom:1px solid #eee;">
          <th style="width:60%;">Sản phẩm</th>
          <th align="center" style="width:20%;">Số lượng</th>
          <th align="right" style="width:20%;">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="order-summary">
      <div class="summary-value">Tạm tính: ${formatCurrencyVND(subtotal)}</div>
      <div class="summary-value">Phí vận chuyển: ${formatCurrencyVND(shippingFee)}</div>
      <div class="total">Tổng: ${formatCurrencyVND(total)}</div>
    </div>

    <h4 style="margin-bottom:8px;">Thông tin giao hàng</h4>
    <div class="shipping">
      <div><strong>Người nhận:</strong> ${shippingName}</div>
      <div><strong>Email:</strong> ${shippingEmail}</div>
      <div><strong>Điện thoại:</strong> ${shippingPhone}</div>
      <div><strong>Địa chỉ:</strong> ${shippingAddress}</div>
    </div>

    <p style="font-size:14px; color:#555;">Bạn có thể xem chi tiết trạng thái đơn hàng tại <a href="${frontendUrl}/profile">trang quản lý đơn hàng</a> (cần đăng nhập).</p>
    <hr style="border:none; border-top:1px solid #eee; margin:18px 0" />
    <div class="muted">
      <div>Nếu bạn có thắc mắc, vui lòng liên hệ: <strong>support@yourshop.example</strong> hoặc trả lời email này.</div>
      <div style="margin-top:10px;">Cảm ơn bạn,</div>
      <div style="font-weight:700; margin-top:6px;">Shop của bạn</div>
    </div>
  </div>
  </body>
  </html>
  `;

  const text = `Xác nhận đơn hàng ${orderId}\n\nXin chào ${shippingName},
  \n\nĐơn hàng ${orderId} đã được ghi nhận.
  \n\nSản phẩm:\n${itemsText}
  \nTạm tính: ${formatCurrencyVND(subtotal)}
  \nPhí vận chuyển: ${formatCurrencyVND(shippingFee)}
  \nTổng: ${formatCurrencyVND(total)}
  \n\nThông tin giao hàng:
  \nNgười nhận: ${shippingName}
  \nEmail: ${shippingEmail}
  \nSĐT: ${shippingPhone}
  \nĐịa chỉ: ${shippingAddress}
  \n\nXem đơn hàng: ${frontendUrl}/profile
  \n\nNếu cần hỗ trợ, liên hệ support@yourshop.example
  \n\nCảm ơn,
  \nBikeShop`;

  return { html, text };
}
