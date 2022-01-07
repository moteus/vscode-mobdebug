import * as vscode from 'vscode';
import { DebuggerServer } from "../Debugger/Server";

export class DebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
    private server?: DebuggerServer;

    createDebugAdapterDescriptor(session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        if (!this.server) {
            this.server = new DebuggerServer();
            this.server.process();
        }
        return this.server.createDebugAdapterDescriptor();
    }

    dispose() {
        if (this.server) {
            this.server.close();
            this.server = undefined;
        }
    }
}
