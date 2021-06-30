import { BitmexOrderBookKeeper } from '../index';
import { WsReconnect } from 'websocket-reconnect';
import { OrderBookSchema } from 'bitmex-request/dist/sharedTypes';

(() => {
  const WS_URL_TESTNET = 'wss://testnet.bitmex.com/realtime';
  const WS_URL = 'wss://www.bitmex.com/realtime';

  const bitmexOb = new BitmexOrderBookKeeper({ testnet: true, enableEvent: true });
  const ws = new WsReconnect();
  ws.open(WS_URL_TESTNET);
  ws.on('open', () => {
    ws.send(JSON.stringify({ op: 'subscribe', args: [`orderBookL2_25:XBTUSD`] }));
  });
  ws.on('message', (msg: any) => bitmexOb.onSocketMessage(msg));
  bitmexOb.onOrderBookUpdated((ob: OrderBookSchema) => {
    console.log(`orderbook from event`, ob);
  });

  setInterval(async () => {
    const ob = await bitmexOb.getOrderBook('XBTUSD');
    console.log(`orderbook from getOrderBook`, ob);
  }, 5000);
})();
