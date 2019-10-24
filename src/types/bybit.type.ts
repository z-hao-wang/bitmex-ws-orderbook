export declare namespace BybitOb {
  type Side = 'Sell' | 'Buy';

  interface OBRow {
    price: string;
    symbol: string;
    id: number;
    side: Side;
    size: number;
  }

  interface OrderBooksNew {
    topic: string;
    type: 'snapshot';
    data: OBRow[];
    cross_seq: number;
    timestamp_e6: number;
  }
  interface OrderBooksDelta {
    topic: string;
    type: 'delta';
    data: {
      delete: OBRow[];
      update: OBRow[];
      insert: OBRow[];
      transactTimeE6: 0;
    };
    cross_seq: number;
    timestamp_e6: number;
  }
  type OrderBooks = OrderBooksDelta | OrderBooksNew;
}
