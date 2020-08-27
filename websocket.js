// replacement wrapper for socketcluster library with native websockets

/* Example

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

* */

const configuration = () => {
  return {
    url: "",
    retry: true,
    retryInterval: count => {
      if (count >= 5) {
        return "stop"; // return anything apart from number value to stop retries connection
      }
      return 1000; // retry after milliseconds ( 1 sec )
    }
  };
};

const merge = (first, second) => {
  Object.keys(second).forEach(key => {
    if (
      (second[key] !== undefined || second[key] !== null) &&
      Object.prototype.hasOwnProperty.call(first, key) &&
      first[key].constructor === second[key].constructor
    ) {
      if (second[key].constructor === Object) {
        first[key] = merge(first[key], second[key]);
      } else {
        first[key] = second[key];
      }
    } else {
      // eslint-disable-next-line no-console
      console.log("valid websocket configuration => ", configuration());
      throw new Error("invalid websocket configuration");
    }
  });
  return first;
};

const broadcastEvent = (listeners, data) => {
  if (listeners) {
    listeners.forEach(listener => {
      listener(data);
    });
  }
};

const createWebSocket = option => {
  const ws = new WebSocket(option.url);
  ws.addEventListener("open", () => {
    ws.send(
      JSON.stringify({ event: "#handshake", data: { authToken: null }, cid: 1 })
    );
    broadcastEvent(this._events.open);
  });
  ws.addEventListener("message", event => {
    try {
      if (event.data === "#1") {
        // heartbeat data
        ws.send("#2");
        return;
      }
      const message = JSON.parse(event.data);
      if (message.event) {
        // event based data from socketcluster
        broadcastEvent(this._events[message.event], message.data);
        return;
      }

      if (message.rid) {
        // websocket meta data from socketcluster
        this.id = message.data.id;
        return;
      }
    } catch (e) {}
    broadcastEvent(this._events.message, event.data);
  });
  ws.addEventListener("error", () => {
    if (option.retry) {
      const timeInterval = option.retryInterval(this._currentRetryCount);
      this._currentRetryCount += 1;
      if (timeInterval && timeInterval.constructor === Number) {
        setTimeout(() => {
          this._ws = createWebSocket(option);
        }, timeInterval);
      } else {
        this._currentRetryCount = 0; // reset retry count as retryInterval stop retry
        broadcastEvent(this._events.error);
      }
    } else {
      broadcastEvent(this._events.error);
    }
  });
  ws.addEventListener("close", () => {
    broadcastEvent(this._events.close);
  });
  return ws;
};

const SocketCluster = option => {
  this._events = {};
  this.id = "";
  this._currentRetryCount = 0;
  this._ws = createWebSocket(option);
};

SocketCluster.prototype.on = (event, cb) => {
  if (!Object.prototype.hasOwnProperty.call(this._events, event)) {
    this._events[event] = [];
  }
  this._events[event].push(cb);
};

SocketCluster.prototype.emit = (event, data) => {
  this._ws.send(JSON.stringify({ event, data }));
};

SocketCluster.prototype.close = code => {
  this._ws.close(code || 1000);
};

export default option => {
  if (!window.WebSocket) {
    throw new Error("Browser doesn't support websocket protocol");
  }
  return new SocketCluster(merge(configuration(), option));
};
