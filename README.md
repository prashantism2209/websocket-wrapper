## Replacement wrapper of socketcluster library with native websockets

## Usage

```ecmascript 6
import WS from './websocket';

const ws = WS({
url: 'ws://localhost:5000/websocket/',
retryInterval: count => {
if (count >= 10) {
return 'stop';
}
return 1000; // retry after 1 sec ( 1000 millisecond)
}
});

ws.on('open', () => {
ws.on('JOIN_ROOMS', data => {
console.log('data from server => ', data);
});
ws.emit('JOIN_ROOMS', 'JOIN_ROOMS_FROM_WS');
});
```
