import { assert } from "console";
import { DebuggeeServer } from "./Server";
import { DebuggeeSession } from "./Session";

export class DebuggeeSessionFactory {
    private server?: DebuggeeServer;

    private acquireDebuggeeServer(host: string, port: number): DebuggeeServer {
        this.server = DebuggeeServerFactory.create(host, port);
        return this.server;
    }

    private disposeDebuggeeServer() {
        if (this.server) {
            DebuggeeServerFactory.dispose(this.server);
            this.server = undefined;
        }
    }

    waitSession(host: string, port: number, callbackFunction: (session: DebuggeeSession) => void){
        this.acquireDebuggeeServer(host, port).once('session', (session) => {
            this.disposeDebuggeeServer();
            callbackFunction(session);
        });
    }

    dispose(){
        this.disposeDebuggeeServer();
    }
}

class DebuggeeServerFactory {
    private static mapById: Map<string, DebuggeeServerInstnce> = new Map<string, DebuggeeServerInstnce>();
    private static mapByServer: Map<DebuggeeServer, DebuggeeServerInstnce> = new Map<DebuggeeServer, DebuggeeServerInstnce>();

    public static create(address: string, port: number) : DebuggeeServer{
        let id = `${address}:${port}`;
        let instance = DebuggeeServerFactory.mapById.get(id);
        if (!instance) {
            instance = new DebuggeeServerInstnce(id, address, port);
            assert(instance.server !== undefined);
            DebuggeeServerFactory.mapById.set(instance.id, instance);
            DebuggeeServerFactory.mapByServer.set(<DebuggeeServer>instance.server, instance);
        }
        instance.acquire();

        assert(instance.server !== undefined);

        return <DebuggeeServer>instance.server;
    }

    public static dispose(server:DebuggeeServer) {
        let instance = DebuggeeServerFactory.mapByServer.get(server);
        if (instance) {
            let id = instance.id;
            if (instance.release()) {
                DebuggeeServerFactory.mapById.delete(id);
                DebuggeeServerFactory.mapByServer.delete(server);
            }
        }
    }
}

class DebuggeeServerInstnce {
    private counter: number = 0;

    public id: string;
    public server?: DebuggeeServer;

    constructor(id: string, host: string, port: number){
        this.server = new DebuggeeServer(host, port);
        this.server.process();
        this.id = id;
    }

    public acquire(){
        this.counter++;
    }

    public release():boolean{
        this.counter--;
        if (this.counter === 0) {
            assert(this.server !== undefined);
            this.server?.stop();
            this.server = undefined;
            return true;
        }
        return false;
    }
}

