import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Observable } from 'rxjs';
import * as io from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class CoreService {

  private url = 'http://localhost:8085';
  private socket;

  private remoteEvents = new Subject<any>();
  private loggedIn = false;

  constructor() { }

  isLoggedIn() {
    return this.loggedIn;
  }

  getRemoteEvents(): Observable<any> {
    return this.remoteEvents.asObservable();
  }

  sendCommand( cmd ) {
    this.socket.emit('cmd', cmd);
  }

  login( loginInfo ) {
    this.loggedIn = false;
    const observable = new Observable( loginObserver => {

      this.socket = io( this.url, {
        reconnection: false
      } );

      this.socket.on( 'connect', () => {
        console.log("connected");

        this.socket.emit( 'authentication', JSON.stringify( loginInfo ) );
        this.socket.on( 'authenticated', () => {
          console.log( "Authenticated" );
          loginObserver.complete();
          this.loggedIn = true;
          this.socket.on( 'event', event => {
            this.remoteEvents.next( event );
          } );
        } );
        this.socket.on( 'unauthorized', err => {
          console.log( "Unauthorised: " + err );
          this.notifyLoginError( loginObserver, "Incorrect user name or password" );
          // socket.io-auth would keep conn open to allow client to retry auth
          // but to keep things simple, if we fail auth then just tear down everything
          this.socket.disconnect();
        } );
      } );
      this.socket.on( 'disconnect', reason => {
        console.log( "Disconnect: " + reason );
        // unless it's our intentional disconnect, need to notify
        if( reason !== 'io client disconnect' ) {
          this.notifyLoginError( loginObserver, "Server disconnect" );
        }
      } );
      this.socket.on( 'connect_error', err => {
        console.log( "Connect error: " + err );
        this.notifyLoginError( loginObserver, err );
      } );
      this.socket.on( 'connect_timeout', () => {
        console.log( "Connect timeout" );
        this.notifyLoginError( loginObserver, "Connect timeout" );
      } );
      this.socket.on( 'error', err => {
        console.log( "Socket error: " + err );
        this.remoteEvents.next( { type: 'error', data: err } );
        this.notifyLoginError( loginObserver, err );
      } );
    } );

    return observable;
  }

  notifyLoginError( loginObserver, msg ) {
    if( !loginObserver.closed ) {
      loginObserver.error( msg );
      loginObserver.closed = true;
    }
    this.remoteEvents.next( { type: 'error', data: msg } );
    this.loggedIn = false;
  }
}
