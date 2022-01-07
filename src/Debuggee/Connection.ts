import * as Net from 'net';
import { DebuggeeSession } from './Session';

export class DebuggeeConnection {
    private encoding: BufferEncoding = 'utf8';
    private socket: Net.Socket;
    private _session?: DebuggeeSession;
    private buffer =  Buffer.alloc(0);

    constructor(socket: Net.Socket){
        this.socket = socket;
    }

    public get session(): DebuggeeSession | undefined {
        return this._session;
    }

    public set session(value: DebuggeeSession | undefined) {
        this._session = value;
    }

    public process(){
        let socket = this.socket;

        socket.on('end', () => {
            // TODO: logging connection end
            // DebugLogger.AdapterInfo('Debuggee connection end');
        });

        socket.on('close', () => {
            // TODO: logging connection close
            // DebugLogger.AdapterInfo('Debuggee socket close');
            // vscode.window.showInformationMessage('[LuaPanda] ');
            // TODO: send terminate event to VSCode
            // this.sendEvent(new TerminatedEvent(this.autoReconnect));
        });

        socket.on('data', (data) => {
            // DebugLogger.AdapterInfo('[Get Msg]:' + data);
            this.processData(data);
        });
    }

    private processData(data: Buffer) {
        this.bufferAppend(data);
        while (true) {
            let message = this.bufferReadMessage();
            if (message === undefined) {
                break;
            }
            this._session?.processMessage(message);
        }
    }

    public send(message: string) {
        const body   = Buffer.from(message, this.encoding);
        const header = Buffer.from("#" + body.length + "\n", this.encoding);
        const data   = Buffer.concat([header, body]);
        this.socket.write(data);
    }

    public stop(){
        this.socket.end();
    }

    private bufferAppend(data: Buffer) {
        this.buffer = Buffer.concat([this.buffer, data]);
    }

    private bufferPropagate(offset: number) {
        this.buffer = this.buffer.slice(offset);
    }

    private bufferCanHaveMessage(): boolean {
        return this.buffer.length > 3;
    }

    private bufferIndexOf(c: string) : number {
        return this.buffer.indexOf(c, 0, this.encoding);
    }

    private bufferLength() : number {
        return this.buffer.length;
    }

    private bufferToString(start: number, end: number) : string {
        return this.buffer.toString(this.encoding, start, end);
    }

    private bufferReadMessage(): string | undefined {
        while(this.bufferCanHaveMessage()) {
            const headerEnd = this.bufferIndexOf('\n');
            if (headerEnd < 0) {
                if (this.bufferLength() > 32) {
                    // TODO: invalid protocol
                }
                break;
            }

            if (headerEnd === 0) {
                // TODO: invalid protocol
                this.bufferPropagate(1);
                continue;
            }

            const headerStart = this.bufferIndexOf('#');
            if (headerStart >= headerEnd) {
                // TODO: invalid protocol
                this.bufferPropagate(headerStart);
                continue;
            }

            // TODO: check encoding errors
            const line = this.bufferToString(headerStart + 1, headerEnd);
            const packetSize = parseInt(line);
            if (isNaN(packetSize)){
                // TODO: invalid protocol
                this.bufferPropagate(headerEnd + 1);
                continue;
            }

            const messageEnd = headerEnd + packetSize + 1;
            if (this.bufferLength() < messageEnd) {
                break;
            }

            const message = this.bufferToString(headerEnd + 1, messageEnd);
            this.bufferPropagate(messageEnd);

            return message;
        }
        return undefined;
    }
}
