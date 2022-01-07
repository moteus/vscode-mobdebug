import * as vscode from 'vscode';
import { Constants } from '../Constants';

export class DebugLogger {
    private static adapterInfo: vscode.OutputChannel;
    private static debuggerInfo: vscode.OutputChannel;

    public static init() {
        DebugLogger.adapterInfo = vscode.window.createOutputChannel(Constants.logChannelPrefix + " Adapter");
        DebugLogger.debuggerInfo = vscode.window.createOutputChannel(Constants.logChannelPrefix + " Debugger");
    }

    public static logDebuggerInfo(str: string) {
        if (str !== '' && str !== null && str !== undefined) {
            DebugLogger.debuggerInfo.appendLine(str);
        }
    }

    public static logAdapterInfo(str: string) {
        if (str !== '' && str !== null && str !== undefined) {
            DebugLogger.adapterInfo.appendLine(str);
        }
    }

    public static showTips(str:string ,  level?:number){
        if(level === 2 ) {
            vscode.window.showErrorMessage(str);
        } else if(level === 1 ){
            vscode.window.showWarningMessage(str);
        } else {
            vscode.window.showInformationMessage(str);
        }
    }
}
