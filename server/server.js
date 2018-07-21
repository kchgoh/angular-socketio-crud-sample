'use strict';

const http = require('http');
const WSServer = require('socket.io');
const WSAuth = require('socketio-auth');

const config = require('./config');

const httpServer = http.createServer( errorOnView );
const io = new WSServer( httpServer );

const auth = new WSAuth( io, {
  authenticate: onAuthenticate,
  postAuthenticate: onAuthenticated,
  disconnect: onDisconnected,
  timeout: 1000000  // TODO for some reason it fails to connect without this. need to investigate further
} );

const sockets = {};

// TODO dummy initial data
const items = [
  { id: 1, value: "One" },
  { id: 2, value: "Two" },
];

httpServer.listen( config.port, function onListenStarted() {
  console.log("Server started");
} );

io.on( 'connection', (socket) => {
  console.log("Connected");

  socket.on( 'disconnecting', (reason) => {
    console.log("Disconnecting: " + reason);
    cleanupClientSocketData( socket );
  } );
  socket.on( 'disconnect', (reason) => {
    console.log("Disconnect: " + reason);
  } );
  socket.on( 'error', (err) => {
    console.log("Error: " + err);
  } );

  socket.on( 'cmd', cmd => onCommand( socket, cmd ) );
} );

function cleanupClientSocketData( socket ) {
  if( sockets[socket.id] ) {
    clearInterval( sockets[socket.id].timerID );
    delete sockets[socket.id];
  }
}

function errorOnView( req, res ) {
  res.writeHead(500);
  res.end("Not viewable");
}

function onAuthenticate( socket, data, cb ) {
  console.log("On auth");
  const loginInfo = JSON.parse(data);
  // TODO proper verify logic from db etc
  const authPassed = loginInfo.userName === config.userName && loginInfo.password === config.password;
  cb( null, authPassed );
}

function onAuthenticated( socket, data ) {
  // from this point, can start sending msg to client
  console.log("Authenticated");

  // for test purpose, send some heartbeat events to client
  const timerID = setInterval( () => socket.emit('event', { type: 'hb', data: Date.now() } ), config.heartbeatMS );

  sockets[socket.id] = { timerID: timerID };
}

function onDisconnected( socket ) {
  console.log("Disconnected");
}

function onCommand( socket, cmd ) {
  console.log( 'cmd:' + cmd.type );

  switch( cmd.type ) {
    // snapshot sending to specific client on request
    case 'snap':
      items.forEach( i =>
        socket.emit( 'event', { type: 'itemadded', data: i } )
      );
      break;
    // data changes are broadcast for all clients
    case 'additem':
      items.push( cmd.data );
      io.emit( 'event', { type: 'itemadded', data: cmd.data } );
      break;
    case 'updateitem':
      const item = items.find( i => i.id === cmd.data.id );
      item.value = cmd.data.value;
      io.emit( 'event', { type: 'itemupdated', data: item } );
      break;
    case 'delitem':
      const idx = items.findIndex( i => i.id === cmd.data.id );
      items.splice( idx, 1 );
      io.emit( 'event', { type: 'itemdeleted', data: cmd.data.id } );
      break;
  }
}


