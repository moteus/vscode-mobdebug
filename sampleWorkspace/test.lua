local sleep_s = require'socket'.sleep
local function sleep_ms(ms)
    sleep_s(ms / 1000)
end

local mobdebug = require "mobdebug"
mobdebug.logging(true)
mobdebug.start('127.0.0.1', 8818)

for i = 1, 60 do
    print('hello ' .. tostring(i))
    io.flush()
    sleep_ms(500)
end
