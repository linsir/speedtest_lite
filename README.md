
![LibreSpeed Logo](https://github.com/librespeed/speedtest/blob/master/.logo/logo3.png?raw=true)

# LibreSpeed



- 前端： [LibreSpeed](https://github.com/librespeed/speedtest)
- 后端： [OpenResty](https://github.com/openresty/openresty)



## 截图

![Screenshot](https://speedtest.fdossena.com/mpot_v6.gif)


## 使用

### OpenResty

```bash
cd speedtest_lite
mkdir -p {logs,runtime}
openresty -p `pwd`/ -c conf/nginx.conf -s stop
openresty -p `pwd`/ -c conf/nginx.conf
# 访问 http://127.0.0.1/ 或者 http://127.0.0.1/v1/
```

### docker

```bash
docker run --name speedtest_lite -p 8000:80  -d linsir/speedtest_lite:latest

# 访问 http://127.0.0.1:8000/ 或者 http://127.0.0.1:8000/v1/
```
