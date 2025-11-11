export interface getProduct {
  page: number;
  pageSize: number;
  _id: string;          
  name: string;
  search?: string;      
  price: number;           
  categoryId?: string;   
  description: string;     
  image: string;        
  specifications?: string;
  stock?: number;
}

export interface ProductCategoryParams {
  page: number;
  pageSize: number;
  categoryId: string;
  search?: string; 
}

export interface ProductByIdParams {
  id: string;
  search?: string; 
  page: number;
  pageSize: number;
}
