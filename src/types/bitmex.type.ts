export declare namespace BitmexOb {
  type BitmexSide = 'Sell' | 'Buy';

  interface OBRow {
    symbol: string;
    id: number;
    side: BitmexSide;
    price: number;
    size: number;
  }

  interface BitmexOrderBookItem {
    symbol: string;
    id: number;
    side: BitmexSide;
    size: number; // Size is in USD
    price: number;
  }

  type BitmexOrderBooks = BitmexOrderBookItem[];
}
