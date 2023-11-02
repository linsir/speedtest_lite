--
-- @Description: 
-- @Author: Linsir
-- @Github: https://github.com/linsir
-- @Date: 2021-08-09 23:09:09
-- @LastEditors: Linsir
-- @LastEditTime: 2023-10-24 16:27:26
--

local ngx = ngx
local get_method = ngx.req.get_method
local tonumber = tonumber
local str_lower = string.lower
local require = require
local ngx_re = require("ngx.re")
local cjson = require "cjson"

local _M = {version = 0.3}

function split_uri(uri)
    return ngx_re.split(uri, "/")
end


function random_seed(size)
    local in_file = io.open("/dev/urandom", "r")
    if in_file ~= nil then
        local d = in_file:read(size)
        return d
    end
end

function get_remote_ip()
    local ip = ngx.var.remote_addr
    if not ip then
        ngx.say("no ip found")
    end
    ngx.say(ip)
end

function response_empty()
    ngx.status = 200
    ngx.header["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    ngx.header["Pragma"] = "no-cache"
    ngx.say("")
    -- body
end

function response_garbage()
    -- Disable Compression
    ngx.header["Content-Encoding"] = "identity"
    -- Headers
    ngx.header["Content-Type"] = "application/octet-stream"
    ngx.header["Content-Disposition"] = 'attachment; filename="random.dat"'
    -- Never cache me
    ngx.header["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    ngx.header["Cache-Control"] = "post-check=0, pre-check=0, false"
    ngx.header["Pragma"] = "no-cache"

    -- Generate data
    local data = ngx.encode_base64(random_seed(1048576))
    local chunkSize = tonumber(ngx.req.get_uri_args().ckSize)

    -- Deliver chunks of 1048576 bytes
    for i=1, chunkSize do
        ngx.print(ngx.decode_base64(data))
        ngx.flush(true)
    end

end

function _M.run()
    local uri_segs = split_uri(ngx.var.uri)
    ngx.log(ngx.INFO, "uri: ", cjson.encode(uri_segs))

    -- /api/admin/users
    local seg_res = uri_segs[3]
    ngx.req.read_body()
    local uri_args = ngx.req.get_uri_args() or {}
    if seg_res == "get_ip" then
        get_remote_ip()
    end
    if seg_res == "empty" then
        response_empty()
    end
    if seg_res == "garbage" then
        response_garbage()
    end

    -- local method = str_lower(get_method())
    -- local req_body = ngx.req.get_body_data()



end

return _M