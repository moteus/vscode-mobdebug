
export interface IDebuggerSessionStdio {
    printDebugConsole(message: string): void;

    printDebugStdout(message: string): void;

    printDebugStderr(message: string): void;
}
