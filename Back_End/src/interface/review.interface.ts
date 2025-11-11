export interface CreateReviewBody {
  productId: string;
  userId?: string;
  rating: number;
  comment?: string;
  status?: 'active' | 'inactive';
}

export interface ReviewByProductParams {
  id: string;
}

export interface Review {
  _id?: string;
  productId: string;
  userId?: string;
  rating: number;
  comment?: string;
  status?: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateReviewBody {
  rating?: number;
  comment?: string;
  status?: 'active' | 'inactive';
}

export interface ReviewSummary {
  roundedStar: number;
  count: number;
  avgRating: number;
}

export interface ReviewWithUser {
  _id?: string;
  productId: string;
  userId: {
    _id: string;
    name: string;
  };
  rating: number;
  comment?: string;
  status?: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}
