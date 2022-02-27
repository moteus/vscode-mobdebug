import { DebuggeeTerminalMode } from '../Debuggee/Process';

export interface IDebuggerSessionConfig {
    // Common configuration
    sourceEncoding:BufferEncoding;
    consoleEncoding:BufferEncoding;
    sourceBasePath:string;
    workingDirectory:string;
    debuggeeHost:string;
    debuggeePort:number;
    launchInterpreter?:string;
    launchExecutable?:string;
    launchArguments?:Array<string>;

    // Attach configuration
    terminalMode?: DebuggeeTerminalMode;

    // Launch configuration
    noDebug?:boolean;
    launchEnveronment?: { [key: string]: string | null | undefined };
}
