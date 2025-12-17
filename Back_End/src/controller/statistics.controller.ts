import { FastifyRequest, FastifyReply } from 'fastify';
import { OrderModel } from '../models/order.model.ts';
import { ProductModel } from '../models/products.models.ts';
import { UserModel } from '../models/user.model.ts';

// Lấy thống kê tổng quan
export const getOverallStatistics = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const [totalProducts, totalOrders, totalUsers, revenueData] = await Promise.all([
      ProductModel.countDocuments(),
      OrderModel.countDocuments(),
      UserModel.countDocuments(),
      OrderModel.aggregate([
        {
          $match: {
            status: { $in: ['Đã giao', 'Đang xử lý', 'Đã gửi hàng'] }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' }
          }
        }
      ])
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    return reply.send({
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue
    });
  } catch (err) {
    console.error('getOverallStatistics error', err);
    return reply.status(500).send({ message: 'Server error' });
  }
};

// Lấy thống kê theo tháng
export const getMonthlyStatistics = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const { year } = req.query as any;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Thống kê đơn hàng theo tháng
    const orderStats = await OrderModel.aggregate([
      {
        $addFields: {
          orderDate: {
            $cond: {
              if: { $ifNull: ['$createdAt', false] },
              then: '$createdAt',
              else: {
                $toDate: {
                  $multiply: [
                    { $toLong: { $substrBytes: ['$_id', 0, 8] } },
                    1000
                  ]
                }
              }
            }
          }
        }
      },
      {
        $match: {
          orderDate: {
            $gte: new Date(`${targetYear}-01-01`),
            $lt: new Date(`${targetYear + 1}-01-01`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$orderDate' },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'Đã giao'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'Đã hủy'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Tạo mảng 12 tháng với dữ liệu mặc định
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const stat = orderStats.find(s => s._id === month);
      return {
        month,
        monthName: new Date(targetYear, i, 1).toLocaleDateString('vi-VN', { month: 'long' }),
        totalOrders: stat?.totalOrders || 0,
        totalRevenue: stat?.totalRevenue || 0,
        completedOrders: stat?.completedOrders || 0,
        cancelledOrders: stat?.cancelledOrders || 0
      };
    });

    // Thống kê sản phẩm bán chạy trong năm
    const topProducts = await OrderModel.aggregate([
      {
        $addFields: {
          orderDate: {
            $cond: {
              if: { $ifNull: ['$createdAt', false] },
              then: '$createdAt',
              else: {
                $toDate: {
                  $multiply: [
                    { $toLong: { $substrBytes: ['$_id', 0, 8] } },
                    1000
                  ]
                }
              }
            }
          }
        }
      },
      {
        $match: {
          orderDate: {
            $gte: new Date(`${targetYear}-01-01`),
            $lt: new Date(`${targetYear + 1}-01-01`)
          },
          status: { $ne: 'Đã hủy' }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    return reply.send({
      year: targetYear,
      monthlyData,
      topProducts,
      summary: {
        totalOrders: monthlyData.reduce((sum, m) => sum + m.totalOrders, 0),
        totalRevenue: monthlyData.reduce((sum, m) => sum + m.totalRevenue, 0),
        totalCompleted: monthlyData.reduce((sum, m) => sum + m.completedOrders, 0),
        totalCancelled: monthlyData.reduce((sum, m) => sum + m.cancelledOrders, 0)
      }
    });
  } catch (err) {
    console.error('getMonthlyStatistics error', err);
    return reply.status(500).send({ message: 'Server error' });
  }
};

export default { getOverallStatistics, getMonthlyStatistics };
