export interface ReceiptEntry {
  id: string;
  vendor: string;
  receipt_date: string;
  total_amount: number;
  items: any;
  image_url: string;
  tags: string[];
  created_at: string;
  user_id: string;
  description?: string;
  category?: string;
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category?: string;
}
