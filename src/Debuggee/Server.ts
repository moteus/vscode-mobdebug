import * as Net from 'net';
import { EventEmitter } from 'events';
import { DebuggeeSession } from './Session';
import { DebugLogger } from '../VSCode/LogManager';

/**
 * Interact with Lua application
 */
export class DebuggeeServer extends EventEmitter{
    private listenIP = '127.0.0.1';
    private listenPort = 8000;
    private server?: Net.Server;

    constructor(address: string, port: number){
        super();
        this.listenIP = address;
        this.listenPort = port;
    }

    public process(){
        let inst = this;

        let server = Net.createServer(socket => {
            this.processConnection(socket);
        });

        server.listen(this.listenPort, this.listenIP, 0, function () {
            let address = <Net.AddressInfo>server.address();
            let listeningAddress: string;
            if (address.family === 'IPv6') {
                listeningAddress = `[${address.address}]:${address.port}`;
            } else {
                listeningAddress = `${address.address}:${address.port}`;
            }
            inst.debugAdapterLog("Listening on " + listeningAddress);
        });

        this.server = server;
    }

    private processConnection(socket: Net.Socket){
        let session = new DebuggeeSession(socket);
        if (!this.emit('session', session)) {
            session.stop();
        }
    }

    public stop(){
        if(this.server){
            this.server.close();
            this.server = undefined;
        }
    }

    private debugAdapterLog(message: string){
        DebugLogger.logAdapterInfo("[DebuggeeServer] " + message);
    }
}
