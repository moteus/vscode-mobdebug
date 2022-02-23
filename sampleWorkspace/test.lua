local timer = require'lzmq.timer'

g = 20

local a = 10

function main()
    local t = {}
    for i = 1,30000 do
        timer.sleep(100)
        local v = math.random()
        if i < 3 then
            table.insert(t,v)
        end
    end

    local m = t[1]

    for _, v in ipairs(t) do
        if m < v then
            m = v
        end
    end

    print("Max value: " .. m)
end

main()

print(a)
