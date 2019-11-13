import { BybitOrderBookKeeper } from '../index';
import { WsReconnect } from 'websocket-reconnect';
import { OrderBookSchema } from 'bitmex-request';

(() => {
  const WS_URL_TESTNET = 'wss://testnet.bitmex.com/realtime';
  const WS_URL = 'wss://www.bitmex.com/realtime';

  const bybitOb = new BybitOrderBookKeeper({ testnet: true, enableEvent: true });
  // const ws = new WsReconnect();
  // ws.open(WS_URL_TESTNET);
  // ws.on('open', () => {
  //   ws.send(JSON.stringify({ op: 'subscribe', args: [`orderBookL2_25:XBTUSD`] }));
  // });
  // ws.on('message', (msg: any) => bybitOb.onSocketMessage(msg));
  // bybitOb.onOrderBookUpdated((ob: OrderBookSchema) => {
  //   console.log(`orderbook from event`, ob);
  // });

  setInterval(async () => {
    const ob = await bybitOb.getOrderBook('BTCUSD');
    console.log(`orderbook from getOrderBook`, ob);
  }, 5000);
})();
