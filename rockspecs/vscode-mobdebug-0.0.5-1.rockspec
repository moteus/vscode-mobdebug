package = "vscode-mobdebug"
version = "0.0.5-1"

source = {
  url = "https://github.com/moteus/vscode-mobdebug/archive/v0.0.5.zip",
  dir = "vscode-mobdebug-0.0.5",
}

description = {
  summary    = "MobDebug Debug Adapter for Visual Studio Code",
  homepage   = "https://github.com/moteus/vscode-mobdebug",
  license    = "MIT/X11",
  maintainer = "Alexey Melnichuk",
  detailed   = [[
  ]],
}

dependencies = {
  "lua >= 5.1, < 5.5",
  "dkjson",
  "luasocket",
}

build = {
  type = "builtin",

  modules = {
    [ "mobdebug" ] = "lua/mobdebug.lua",
  }
}
