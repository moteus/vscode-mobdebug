local timer = require'lzmq.timer'

local mobdebug = require "mobdebug"
mobdebug.logging(true)
mobdebug.start('127.0.0.1', 8818)

for i = 1, 50 do
    print('hello '..tostring(i))
    io.flush()
    timer.sleep(100)
end
