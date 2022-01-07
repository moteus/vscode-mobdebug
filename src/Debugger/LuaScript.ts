import * as path from 'path';
import { ChildProcess, spawn, SpawnOptions } from "child_process";
import { Constants } from "../Constants";
import { IDebuggerSessionConfig } from "./ISessionConfig";
import { IDebuggerSessionStdio } from "./ISessionStdio";

interface ProcessEnv {
    [key: string]: string | undefined
}

export class LuaScript {
    private session: IDebuggerSessionStdio;
    private config: IDebuggerSessionConfig;
    private process?: ChildProcess;
    private exitProcessed?: boolean;

    constructor(config: IDebuggerSessionConfig, session: IDebuggerSessionStdio) {
        this.config  = config;
        this.session = session;
   }

    private createEnv(): ProcessEnv | undefined {
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

    public run(callback: () => void){
        let session = this.session;
        let config = this.config;

        let args: Array<string> = [];
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

        let options: SpawnOptions = {
            cwd:   config.workingDirectory,
            stdio: ['ignore', 'pipe', 'pipe'],
            env:   this.createEnv(),
        };

        this.process = spawn(config.launchInterpreter, args, options);

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

        this.process.on('exit', (code, signal) => {
            session.printDebugConsole(`Process exit with code: ${code} signal: ${signal}`);
        });

        this.process.on('close', (code: number, args: any[])=> {
            if (this.exitProcessed) {
                return;
            }
            this.exitProcessed = true;
            session.printDebugConsole(`Process on close code: ${code} args: ${args}`);
            callback();
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