import * as Net from 'net';
import * as vscode from 'vscode';
import { platform } from 'process';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { DebugLogger } from '../VSCode/LogManager';
import { DebuggerSession } from './Session';
import { assert } from 'console';

enum ServerType { inline, namePipe, tcp };

class InlineDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(_session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        let session = new DebuggerSession();
        return new vscode.DebugAdapterInlineImplementation(session);
    }

    dispose(){
    }
}

/**
 * Interact with VSCode
 */
export class DebuggerServer {
    private server?: Net.Server;
    private type: ServerType = ServerType.tcp;
    private listeningAddress?:string;

    public process(){
        this.listen();
    }

    private listen(){
        if (this.type === ServerType.tcp) {
            this.listenTCP();
        } else if (this.type === ServerType.namePipe) {
            this.listenNamedPipe();
        } else if (this.type === ServerType.inline) {
            this.listeningAddress = '<INLINE>';
        }
        assert(this.listeningAddress !== undefined);
        this.debugAdapterLog("Listening on " + this.listeningAddress);
    }

    private listenNamedPipe() {
        const pipeName = randomBytes(10).toString('utf8');
        const pipePath = platform === "win32" ? join('\\\\.\\pipe\\', pipeName) : join(tmpdir(), pipeName);
        this.server = Net.createServer(socket => {
            this.processConnection(socket);
        }).listen(pipePath);
        this.listeningAddress = <string>this.server.address();
    }

    private listenTCP() {
        this.server = Net.createServer(socket => {
            this.processConnection(socket);
        }).listen(0);
        let address = <Net.AddressInfo>this.server.address();
        if (address.family === 'IPv6') {
            this.listeningAddress = `[${address.address}]:${address.port}`;
        } else {
            this.listeningAddress = `${address.address}:${address.port}`;
        }
    }

    private processConnection(socket: Net.Socket){
        let session = new DebuggerSession();
        session.setRunAsServer(true);
        session.start(<NodeJS.ReadableStream>socket, socket);
    }

    private debugAdapterLog(message: string){
        DebugLogger.logAdapterInfo("[DebuggerServer] " + message);
    }

    public createDebugAdapterDescriptor(): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        this.debugAdapterLog("Create new DebugAdapter descriptor");
        assert(this.server !== undefined);
        if (this.type === ServerType.tcp) {
            let address = this.server?.address() as Net.AddressInfo;
            return new vscode.DebugAdapterServer(address.port, address.address);
        } else if (this.type === ServerType.namePipe) {
            let address = this.server?.address() as string;
            return new vscode.DebugAdapterNamedPipeServer(address);
        } else if (this.type === ServerType.inline) {
            return new InlineDebugAdapterFactory();
        }
        return undefined;
    }

    public close(){
        if(this.server){
            this.server.close();
            this.server = undefined;
            this.listeningAddress = undefined;
            
        }
    }
}
