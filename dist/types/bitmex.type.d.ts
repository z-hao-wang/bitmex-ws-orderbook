export declare namespace BitmexOb {
    type Side = 'Sell' | 'Buy';
    interface OBRow {
        symbol: string;
        id: number;
        side: Side;
        price: number;
        size: number;
    }
    interface OrderBookItem {
        symbol: string;
        id: number;
        side: Side;
        size: number;
        price: number;
    }
    type OrderBooks = OrderBookItem[];
}
