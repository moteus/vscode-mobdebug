package = "vscode-mobdebug"
version = "scm-0"

source = {
  url = "https://github.com/moteus/vscode-mobdebug/archive/main.zip",
  dir = "vscode-mobdebug-main",
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
