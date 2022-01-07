import { ExtensionContext } from "vscode";
import * as path from 'path';

export class Constants {
    static readonly logChannelPrefix = 'MobDebug';
    static readonly defaultPort      = 8172;

    static get debugSessionLogFile():string { return path.join(Constants.extensionPath, Constants.packageName + '.log'); };
    static get extensionPath():string { return Constants._extensionPath; };
    static get packageName():string { return Constants._packageJson.name; };
    static get packageDisplayName():string { return Constants._packageJson.displayName; };
    static get packageVersion():string { return Constants._packageJson.version; };
    static get debugType():string { return Constants._debugType; };

    private static _extensionPath:string;
    private static _debugType;
    private static _packageJson?:any;

    static init(context: ExtensionContext) {
        Constants._extensionPath = context.extensionPath;
        Constants._packageJson = require(context.extensionPath + "/package.json");
        this._debugType = Constants._packageJson.contributes.debuggers[0].type;
    }
}