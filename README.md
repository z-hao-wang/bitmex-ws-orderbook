# bitmex websocket orderbook keeper
install
```
npm i bitmex-ws-orderbook
```
Code
```
import { BitmexOrderBookKeeper } from 'bitmex-ws-orderbook';
const bitmexOb = new BitmexOrderBookKeeper({ testnet: true });
bitmexOb.onSocketMessage(msg);
const ob = await bitmexOb.getOrderBook('XBTUSD');
```

You must send websocket message from outside, this is to enable using single websocket connection for multiple purposes

##sample 
see src/sample/bitmexOrderBookSample.ts
