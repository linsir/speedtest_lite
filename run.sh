cd speedtest_lite
mkdir -p {logs,runtime}
openresty -p `pwd`/ -c conf/nginx.conf -s stop
openresty -p `pwd`/ -c conf/nginx.conf
curl 127.0.0.1/get_ip
curl 127.0.0.1/empty
tail -f logs/error.log
