export interface Category {
  _id: string;
  name: string;
  image?: string; // optional image URL for category thumbnails
}

export interface CreateCategoryBody {
  name: string;
  image?: string;
}

export interface UpdateCategoryBody {
  name?: string;
  image?: string;
}

export interface CategoryByIdParams {
  id: string;
}
