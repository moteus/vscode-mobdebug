-- TODO: implement real adapter for the MobDebug module
-- For now uses module form the [lua-debug](https://github.com/devcat-studio/VSCodeLuaDebug) module

local json = require 'dkjson'
local debuggee = require 'vscode-debuggee'

local vscodeMobDebug = {}

function vscodeMobDebug.start(host, port)
  return debuggee.start(json, {controllerHost = host, controllerPort = port})
end

return vscodeMobDebug