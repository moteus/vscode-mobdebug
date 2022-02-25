import * as path from 'path';
import { ChildProcess, spawn, SpawnOptions } from "child_process";
import { Constants } from "../Constants";
import { IDebuggerSessionConfig } from "./ISessionConfig";
import { IDebuggerSessionStdio } from "./ISessionStdio";

interface ProcessEnv {
    [key: string]: string | undefined
}

export type LuaScriptRunCallback = (code?: number) => void;

export interface IDebuggeeProcess {
    run(callback: LuaScriptRunCallback): void;
    dispose(terminate?:boolean):void;
}

export function launchScript(config: IDebuggerSessionConfig, session: IDebuggerSessionStdio): IDebuggeeProcess {
    let process : DebuggeeProcess = config.launchInterpreter ? new LuaScript(config, session) : new DebuggeeProcess(config, session);
    return process;
}

class DebuggeeProcess implements IDebuggeeProcess{
    protected session: IDebuggerSessionStdio;
    protected config: IDebuggerSessionConfig;
    protected process?: ChildProcess;
    protected exitProcessed?: boolean;

    constructor(config: IDebuggerSessionConfig, session: IDebuggerSessionStdio) {
        this.config  = config;
        this.session = session;
   }

   protected createEnv(): ProcessEnv | undefined {
        if (this.config.launchEnveronment === null) {
            return process.env;
        }

        if (this.config.launchEnveronment === undefined) {
            return process.env;
        }

        let env:ProcessEnv = {};
        if (process.env) {
            Object.keys(process.env).forEach((name) => {
                env[name] = process.env[name];
            });
        }

        let launchEnveronment: ProcessEnv = <ProcessEnv>this.config.launchEnveronment;;
        Object.keys(launchEnveronment).forEach((name) => {
            let value = launchEnveronment[name];
            // TODO: expand value
            env[name] = value;
        });

        return env;
    }

    protected createArgs(): Array<string> {
        let args: Array<string> = [];
        let config = this.config;

        if (config.launchArguments) {
            args.push(...config.launchArguments);
        }

        return args;
    }

    protected createOptions(): SpawnOptions {
        let config = this.config;

        let options: SpawnOptions = {
            cwd:   config.workingDirectory,
            stdio: ['ignore', 'pipe', 'pipe'],
            env:   this.createEnv(),
        };

        return options;
    }

    protected getApplication() : string {
        return this.config.launchExecutable || '';
    }

    protected crearteProcess(): ChildProcess {
        let args = this.createArgs();
        let options = this.createOptions();
        let executable = this.getApplication();
        return spawn(executable, args, options);
    }

    public run(callback: LuaScriptRunCallback){
        let session = this.session;
        let config = this.config;

        this.process = this.crearteProcess();

        if(!this.process) {
            setImmediate(callback);
            return;
        }

        this.exitProcessed = false;

        this.process.stdout?.on('data', data => {
            session.printDebugStdout(data.toString(config.consoleEncoding));
        });

        this.process.stderr?.on('data', data => {
            session.printDebugStderr(data.toString(config.consoleEncoding));
         });

         this.process.on('spawn', () => {
            session.printDebugConsole('Process started');
        });

        this.process.on('error', (err) => {
            if (this.exitProcessed) {
                return;
            }
            this.exitProcessed = true;
            session.printDebugConsole(`Process exit with error: ${err}`);
            callback();
        });

        this.process.on('exit', (code: number, signal: number) => {
            session.printDebugConsole(`Process exit with code: ${code} signal: ${signal}`);
        });

        this.process.on('close', (code: number, args: any[])=> {
            if (this.exitProcessed) {
                return;
            }
            this.exitProcessed = true;
            session.printDebugConsole(`Process on close code: ${code} args: ${args}`);
            callback(code);
        });
    }

    public dispose(terminate?:boolean) {
        if (this.process) {
            this.process.removeAllListeners();
            if (terminate) {
                this.process.kill();
            } else {
                this.process.unref();
            }
            this.process = undefined;
        }
    }
}

class LuaScript extends DebuggeeProcess {
    protected getApplication() : string {
        return this.config.launchInterpreter || '';
    }

    protected createArgs(): Array<string> {
        let args: Array<string> = [];
        let config = this.config;

        if (!config.noDebug) {
            let luaPath = path.join(Constants.extensionPath, 'lua').replace(/\\/g, '\\\\');
            let luaDirSep           = "package.config:match('^(.-)\\n')";           // `/`
            let luaTemplateSep      = "package.config:match('^.-\\n(.-)\\n')";      // `;`
            let luaSubstitutionMark = "package.config:match('^.-\\n.-\\n(.-)\\n')"; // `?`
            let setLuaPath = `package.path='${luaPath}'..${luaDirSep}..${luaSubstitutionMark}..'.lua'..${luaTemplateSep}..package.path`;
            let requireDebug = `require'vscode-mobdebug'.start('127.0.0.1',${config.debuggeePort})`;
            args.push('-l', `package`);
            args.push('-e', `${setLuaPath};${requireDebug}`);
        }

        if (config.launchArguments) {
            args.push(...config.launchArguments);
        }

        return args;
    }
}
