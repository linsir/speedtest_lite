--
-- @Description: Speed test backend - OpenResty/Lua
-- @Author: Linsir
-- @Github: https://github.com/linsir
-- @Date: 2021-08-09 23:09:09
-- @LastEditors: Linsir
-- @LastEditTime: 2026-03-31 00:00:00
--

local ngx = ngx
local tonumber = tonumber
local math = math
local string = string
local table = table
local require = require
local ngx_re = require("ngx.re")
local cjson = require "cjson"

local _M = {version = 0.4}

-- CORS headers helper - allow browser to access from any origin
local function set_cors()
    ngx.header["Access-Control-Allow-Origin"] = "*"
    ngx.header["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    ngx.header["Access-Control-Allow-Headers"] = "Content-Type"
    ngx.header["Access-Control-Expose-Headers"] = "Server-Timing"
end

-- No-cache headers helper
local function set_no_cache()
    ngx.header["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    ngx.header["Pragma"] = "no-cache"
end

-- Pre-generate a 1MB block of random binary data at module load time.
-- This avoids the expensive urandom→base64→decode round-trip on every request.
math.randomseed(os.time())
local _RANDOM_BLOCK = (function()
    local t = {}
    for i = 1, 1048576 do
        t[i] = string.char(math.random(0, 255))
    end
    return table.concat(t)
end)()

function split_uri(uri)
    return ngx_re.split(uri, "/")
end

-- Return client IP as JSON: {"ip":"x.x.x.x","ipType":"4"}
function get_remote_ip()
    local ip = ngx.var.http_x_forwarded_for or ngx.var.remote_addr or ""
    -- Use first IP if there are multiple (proxy chain)
    ip = ip:match("^[^,]+") or ip
    ip = ip:match("^%s*(.-)%s*$") -- trim whitespace
    local ip_type = ip:find(":") and "6" or "4"
    set_cors()
    ngx.header["Content-Type"] = "application/json; charset=utf-8"
    set_no_cache()
    ngx.say(cjson.encode({
        ip = ip,
        ipType = ip_type,
        processedString = ip,
        rawIspInfo = ""
    }))
end

-- Empty response for ping measurement and upload target.
-- Server-Timing header lets the browser subtract server processing time.
function response_empty()
    ngx.status = 200
    set_cors()
    set_no_cache()
    ngx.header["Server-Timing"] = "proc;dur=0"
    -- Drain any upload body so the connection stays clean
    ngx.req.read_body()
    ngx.say("")
end

-- Stream random binary data for download speed measurement.
-- ckSize = number of 1MB chunks to send (default 4, clamped 1-1024).
function response_garbage()
    set_cors()
    set_no_cache()
    ngx.header["Content-Encoding"] = "identity"
    ngx.header["Content-Type"] = "application/octet-stream"
    ngx.header["Content-Disposition"] = 'attachment; filename="random.dat"'

    local ckSize = tonumber((ngx.req.get_uri_args() or {}).ckSize) or 4
    -- Clamp to a reasonable range to prevent abuse
    if ckSize < 1 then ckSize = 1 end
    if ckSize > 1024 then ckSize = 1024 end

    for i = 1, ckSize do
        ngx.print(_RANDOM_BLOCK)
    end
    ngx.flush(true)
end

-- WebSocket echo server for accurate ping measurement.
-- The client sends any message and receives it back immediately;
-- round-trip time measured client-side via performance.now().
function response_ws()
    local websocket = require "resty.websocket.server"
    local wb, err = websocket:new({
        timeout = 30000,         -- 30s idle timeout
        max_payload_len = 65535,
    })
    if not wb then
        ngx.log(ngx.ERR, "failed to create WebSocket server: ", err)
        ngx.exit(ngx.HTTP_UPGRADE_REQUIRED)
        return
    end

    while true do
        local data, typ, err = wb:recv_frame()
        if err then
            -- Client disconnected or error — exit silently
            wb:send_close()
            return
        end
        if typ == "close" then
            wb:send_close()
            return
        elseif typ == "ping" then
            local _, err = wb:send_pong(data)
            if err then return end
        elseif typ == "text" or typ == "binary" then
            -- Echo back immediately for timing
            local _, err = wb:send_text(data)
            if err then return end
        end
        -- "continuation" frames are ignored
    end
end

function _M.run()
    local uri_segs = split_uri(ngx.var.uri)

    local seg_res = uri_segs[3]

    -- Handle CORS preflight
    if ngx.req.get_method() == "OPTIONS" then
        set_cors()
        ngx.status = 204
        ngx.exit(204)
        return
    end

    if seg_res == "get_ip" then
        get_remote_ip()
    elseif seg_res == "empty" then
        response_empty()
    elseif seg_res == "garbage" then
        response_garbage()
    elseif seg_res == "ws" then
        response_ws()
    else
        ngx.status = 404
        ngx.say("not found")
    end
end

return _M