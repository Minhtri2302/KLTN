export interface News {
  _id?: string;
  title: string;
  content: string;
  image?: string;
  author?: string;
  publishedAt?: Date;
  tags?: string[];
  status?: 'active' | 'inactive';
  views?: number; 
  viewedBy?: string[]; // danh sách userId hoặc IP đã xem
}

export interface CreateNewsBody {
  title: string;
  content: string;
  image?: string;
  author?: string;
  publishedAt?: Date;
  tags?: string[];
  status?: 'active' | 'inactive';
}

export interface UpdateNewsBody {
  title?: string;
  content?: string;
  image?: string;
  author?: string;
  publishedAt?: Date;
  tags?: string[];
  status?: 'active' | 'inactive';
}

export interface NewsByIdParams {
  id: string;
}

export interface NewsViewQuery {
  userId?: string;
}

export interface GetNewsQuery {
  search?: string;
}
