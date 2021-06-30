import { BybitOrderBookKeeper } from '../BybitOrderBookKeeper';
import { WsReconnect } from 'websocket-reconnect';
import { OrderBookSchema } from 'bitmex-request/dist/sharedTypes';
(() => {
  const WS_URL_TESTNET = 'wss://stream-testnet.bybit.com/realtime';
  const WS_URL = 'wss://stream.bybit.com/realtime';

  const bybitOb = new BybitOrderBookKeeper({ testnet: true, enableEvent: true });
  const ws = new WsReconnect();
  ws.open(WS_URL_TESTNET);
  ws.on('open', () => {
    ws!.send(JSON.stringify({ op: 'subscribe', args: [`orderBookL2_25.BTCUSD`] }));
  });
  ws.on('message', (msg: any) => bybitOb.onSocketMessage(msg));
  bybitOb.onOrderBookUpdated((ob: OrderBookSchema) => {
    console.log(`orderbook from event`, ob);
  });

  // setInterval(async () => {
  //   const ob = await bybitOb.getOrderBook('BTCUSD');
  //   console.log(`orderbook from getOrderBook`, ob);
  // }, 5000);
})();
