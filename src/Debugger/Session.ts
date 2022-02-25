import { Subject } from 'await-notify';
import { LoggingDebugSession, TerminatedEvent, OutputEvent, InitializedEvent, ExitedEvent } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { DebugLogger } from '../VSCode/LogManager';
import { DebuggeeSession } from '../Debuggee/Session';
import { DebuggeeSessionFactory } from '../Debuggee/SessionFactory';
import { Constants } from '../Constants';
import { IDebuggerSessionConfig } from './ISessionConfig';
import { IDebuggerSessionStdio } from "./ISessionStdio";
import { launchScript, IDebuggeeProcess } from '../Debuggee/Process';
import { assert } from 'console';

export class DebuggerSession extends LoggingDebugSession implements IDebuggerSessionConfig, IDebuggerSessionStdio {
    private debuggeeServer?: DebuggeeSessionFactory;
    private debuggee?: DebuggeeSession;

    private configurationDone = new Subject();
    private debugProcess?: IDebuggeeProcess;

    // Common configuration
    public sourceEncoding:BufferEncoding = 'utf-8';
    public consoleEncoding:BufferEncoding = 'utf-8';
    public sourceBasePath:string = '';
    public workingDirectory:string = '';
    public debuggeeHost:string = '';
    public debuggeePort:number = Constants.defaultPort;
    public stopOnEntry:boolean = true;

    // Launch configuration
    public noDebug?:boolean;
    public launchExecutable:string = '';
    public launchInterpreter:string = '';
    public launchArguments?:Array<string>;
    public launchEnveronment?: { [key: string]: string | null | undefined };

    public constructor() {
        super(Constants.debugSessionLogFile, true);
        this.debuggeeServer = new DebuggeeSessionFactory();
    };

    protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
        this.logRequest(response);

        response.body = response.body || {};
        response.body.supportsConfigurationDoneRequest = true;

        response.body.supportsEvaluateForHovers = true;
        response.body.supportsStepBack = false;
        response.body.supportsSetVariable = true;
        response.body.supportsFunctionBreakpoints = false;
        response.body.supportsConditionalBreakpoints = true;
        response.body.supportsHitConditionalBreakpoints = true;
        response.body.supportsLogPoints = true;
        response.body.supportSuspendDebuggee = true;
        response.body.supportTerminateDebuggee = true;

        this.sendResponse(response);
    }

    protected async attachRequest(response: DebugProtocol.AttachResponse, args: DebugProtocol.AttachRequestArguments) {
        this.logRequest(response);
        await this.configurationDone.wait(1000);
        if(!this.configureAttach(response, <AttachRequestArguments>args)){
            return;
        }
        this.watingDebuggeeSession(response);
    }

    protected async launchRequest(response: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments) {
        this.logRequest(response);
        await this.configurationDone.wait(1000);

        if(!this.configureLaunch(response, <LaunchRequestArguments>args)){
            return;
        }

        if (!this.noDebug) {
            this.watingDebuggeeSession(response);
        }

        this.debugProcess = launchScript(this, this);
        this.debugProcess.run((code?:number) => {
            if (this.debuggee) {
                this.debuggee.stop();
                this.debuggee = undefined;
            }
            if(code !== undefined){
                this.sendEvent(new ExitedEvent(code));
            }
            this.sendEvent(new TerminatedEvent());
        });

        if (this.noDebug) {
            this.sendResponse(response);
            this.sendEvent(new TerminatedEvent());
        }
    }

    private configureAttach(response: DebugProtocol.Response, args: AttachRequestArguments):boolean{
        return this.configureCommon(response, args);
    }

    private configureLaunch(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments):boolean{
        if (args.executable) {
            this.launchExecutable = args.executable;
            this.launchInterpreter = '';
        } else {
            this.launchInterpreter = args.interpreter || 'lua';
            this.launchExecutable = '';
        }

        this.launchArguments   = args.arguments || [];
        this.launchEnveronment = args.env;

        // TODO: validate launch configuration
        return this.configureCommon(response, args);
    }

    private configureCommon(response: DebugProtocol.Response, args: RequestArguments): boolean{
        this.debuggeeHost     = args.listenPublicly ? '0.0.0.0' : '127.0.0.1';
        this.debuggeePort     = args.listenPort || 56789;
        this.sourceEncoding   = parseEncoding(args.sourceEncoding) || 'utf8';
        this.consoleEncoding  = parseEncoding(args.consoleEncoding) || <BufferEncoding>args.sourceEncoding;
        this.workingDirectory = args.workingDirectory || '';
        this.sourceBasePath   = args.sourceBasePath   || this.workingDirectory;
        if (args.stopOnEntry === undefined) {
            this.stopOnEntry = true;
        } else {
            this.stopOnEntry = args.stopOnEntry;
        }
        // TODO: validate common configuration
        return true;
    }

    private watingDebuggeeSession(response: DebugProtocol.Response){
        assert(this.debuggeeServer !== undefined);
        this.debuggeeServer?.waitSession(this.debuggeeHost, this.debuggeePort, (debuggee: DebuggeeSession) => {
            this.processDebuggeeSession(debuggee);
            this.sendResponse(response);
            this.sendEvent(new InitializedEvent());
        });
    }

    private processDebuggeeSession(debuggee: DebuggeeSession) {
        this.debuggee = debuggee;

        debuggee.on('event', (event: DebugProtocol.Event) => {
            this.sendEvent(event);
        });

        debuggee.on('response', (response: DebugProtocol.Response) => {
            this.sendResponse(response);
        });

        debuggee.on('close', (message) => {
            this.sendEvent(new TerminatedEvent());
        });

        debuggee.processSession(this);
    }

    private proxy(response: DebugProtocol.Response, args?: any): void {
        this.logRequest(response);
        if (this.debuggee) {
            this.debuggee.proxy(response, args);
        }
    }

    protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
        this.proxy(response, args);
    }

    protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
        this.proxy(response, args);
    }

    protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments): void {
        this.proxy(response, args);
    }

    protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments): void {
        this.proxy(response, args);
    }

    protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {
        this.proxy(response, args);
    }

    protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
        this.proxy(response, args);
    }

    protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): void {
        this.proxy(response, args);
    }

    protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
        this.proxy(response);
    }

    protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
        this.proxy(response, args);
    }

    protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
        this.configurationDone.notify();
        this.proxy(response, args);
    }

    protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
        this.proxy(response, args);
    }

    protected pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments): void {
        this.proxy(response, args);
    }

    protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request): void {
        this.logRequest(response);

        if(!args.restart) {
            if (this.debuggeeServer) {
                this.debuggeeServer.dispose();
                this.debuggeeServer = undefined;
            }
        }

        if (args.terminateDebuggee) {
            if (this.debugProcess) {
                this.debugProcess.dispose(true);
                this.debugProcess = undefined;
            }

            if (this.debuggee) {
                this.debuggee.stop();
                this.debuggee = undefined;
            }

            this.sendResponse(response);
        } else if (this.debuggee) {
            let timer = setTimeout(() => {
                if (this.debugProcess) {
                    this.debugProcess.dispose(false);
                    this.debugProcess = undefined;
                }
                if (this.debuggee) {
                    this.debuggee.stop();
                    this.debuggee = undefined;
                }
                this.sendResponse(response);
            }, 15000);

            this.debuggee.disconnect(response, args, (response, self) => {
                clearTimeout(timer);
                if (self.debugProcess) {
                    self.debugProcess.dispose(false);
                    self.debugProcess = undefined;
                }
                if (self.debuggee) {
                    self.debuggee.stop();
                    self.debuggee = undefined;
                }
                this.sendResponse(response);
            }, this);
        } else if (this.debugProcess) {
            this.debugProcess.dispose(false);
            this.debugProcess = undefined;
        }
    }
 
    public sendResponse(response: DebugProtocol.Response): void{
        this.logResponse(response);
        super.sendResponse(response);
    }

    public sendEvent(event: DebugProtocol.Event): void{
        this.logEvent(event);
        super.sendEvent(event);
    }

    public printDebugConsole(message: string){
        let event = new OutputEvent(message + '\n', 'console');
        this.sendEvent(event);
    }

    public printDebugStdout(message: string){
        let event = new OutputEvent(message, 'stdout');
        this.sendEvent(event);
    }

    public printDebugStderr(message: string){
        let event = new OutputEvent(message, 'stderr');
        this.sendEvent(event);
    }

    private debugAdapterLog(message: string){
        let status = this.debuggee ? '+' : '-';
        DebugLogger.logAdapterInfo("[DebuggerSession][" + status + "] " + message);
    }

    private logRequest(response: DebugProtocol.Response){
        let msg = `Request: ${response.command}[${response.request_seq}]`;
        this.debugAdapterLog(msg);
    }

    private logResponse(response: DebugProtocol.Response){
        let status = response.success ? 'success' : 'fail';
        let msg = `Response: ${response.command}[${response.request_seq}] - ${status}`;
        this.debugAdapterLog(msg);
    }

    private logEvent(event: DebugProtocol.Event){
        let msg = `Event: ${event.event}[${event.seq}]`;
        this.debugAdapterLog(msg);
    }
}

interface RequestArguments {
    workingDirectory: string;
    sourceBasePath?: string;
    listenPublicly?: boolean;
    listenPort?: number;
    sourceEncoding?: string;
    consoleEncoding?: string;
    stopOnEntry?: boolean;
}

interface LaunchRequestArguments extends RequestArguments {
    noDebug?: boolean;
    executable?: string;
    interpreter?: string;
    arguments?: Array<string>;
    env?: { [key: string]: string | null | undefined },
}

interface AttachRequestArguments extends RequestArguments {
}

const ENCODINGS = new Set(["ascii", "utf8", "utf-8", "utf16le", "ucs2", "ucs-2", "base64", "base64url", "latin1"]);

function parseEncoding(encoding:string | undefined):BufferEncoding | undefined{
    if (encoding === undefined) {
        return undefined;
    }

    encoding = encoding.toLowerCase();
    if (ENCODINGS.has(encoding)) {
        return <BufferEncoding>encoding;
    }

    return undefined;
}
