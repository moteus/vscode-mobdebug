export interface IDebuggerSessionConfig {
    // Common configuration
    sourceEncoding:BufferEncoding;
    consoleEncoding:BufferEncoding;
    sourceBasePath:string;
    workingDirectory:string;
    debuggeeHost:string;
    debuggeePort:number;

    // Launch configuration
    noDebug?:boolean;
    launchInterpreter:string;
    launchArguments?:Array<string>;
    launchEnveronment?: { [key: string]: string | null | undefined };
}
