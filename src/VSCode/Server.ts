import { DebugSession, DebugAdapterExecutable, ProviderResult, DebugAdapterDescriptor, workspace } from 'vscode';
import { DebuggerServer } from "../Debugger/Server";

export class DebugAdapterDescriptorFactory implements DebugAdapterDescriptorFactory {
    private server?: DebuggerServer;

    createDebugAdapterDescriptor(session: DebugSession, executable: DebugAdapterExecutable | undefined): ProviderResult<DebugAdapterDescriptor> {
        if (!this.server) {
            let settings = workspace.getConfiguration('luaMobDebug.settings');
            this.server = new DebuggerServer(settings.serverType);
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
