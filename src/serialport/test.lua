local m_base = 17
local music = {1, 2, 3, 1, 1, 2, 3, 1, 3, 4, 5, 5, 3, 4, 5, 5}

for k, v in pairs(music) do
    Beep_play(m_base + v)
    Delay_ms(500)
end

Beep_play(32)
