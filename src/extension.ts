'use strict';

import * as vscode from 'vscode';
import { DebugLogger } from './VSCode/LogManager';
import { ConfigurationProvider } from './VSCode/Configuration';
import { DebugAdapterDescriptorFactory } from './VSCode/Server';
import { Constants } from './Constants';


export function activate(context: vscode.ExtensionContext) {
    Constants.init(context);
    DebugLogger.init();

    const factory = new DebugAdapterDescriptorFactory();
    context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory(Constants.debugType, factory));
    context.subscriptions.push(factory);

    const provider = new ConfigurationProvider();
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider(Constants.debugType, provider));
    context.subscriptions.push(provider);
}

export function deactivate() {
}
