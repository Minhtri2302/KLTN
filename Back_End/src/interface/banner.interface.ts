export interface Banner {
  _id?: string;        
  name?: string;
  image?: string;    
  active?: boolean;
  position?: number;
  createdAt?: Date;     
  updatedAt?: Date;     
}

export interface CreateBannerBody {
  name: string;
  image: string;
  active?: boolean;
  position?: number;
}

export interface UpdateBannerBody {
  name?: string;
  image?: string;
  active?: boolean;
  position?: number;
}

export interface BannerByIdParams {
  id: string;
}

export interface BannerQueryParams {
  page?: number;
  pageSize?: number;
}
