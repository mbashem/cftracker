# HTTP request logging

The API uses `gin.New()` with explicit access logging and panic recovery middleware. Access logs include timestamp, response status, latency, client IP, method, and escaped URL path. Query strings are omitted on every route, including both `/api/auth/github/callback` and `/auth/github/callback`. The middleware leaves the request unchanged so OAuth handlers still receive `code` and `state`.

Raw Gin handler errors are excluded because an error can contain a URL or credentials. Panic recovery returns HTTP 500 and logs the method, escaped path, panic type, and stack trace. It omits the panic value and Gin's default request/header dump in both debug and release modes. Avoid adding application logs containing authorization codes, OAuth state, cookies, authorization headers, tokens, or complete request URLs.

## Hosting proxy logs

Application filtering does not change logs produced by a reverse proxy, ingress, CDN, or request tracing service. Configure each layer before exposing OAuth publicly. Log the method and path without query parameters; also exclude request bodies, authentication headers, cookies, and query-bearing referrers.

For NGINX, define this format inside `http {}` and select it in the API's `server {}` block:

```nginx
# Inside http {}
log_format cftracker '$remote_addr [$time_local] '
                     '"$request_method $uri $server_protocol" '
                     '$status $body_bytes_sent $request_time';

# Inside the API server {}
access_log /var/log/nginx/access.log cftracker;
```

NGINX's `$uri` is the current normalized path. `$request_uri` includes the original query string, and `$request` contains the original request line; do not use them in this access format. Also omit `$args`, `$query_string`, and `$http_referer`. See the [NGINX variable reference](https://nginx.org/en/docs/http/ngx_http_core_module.html#variables) and [access-log configuration](https://nginx.org/en/docs/http/ngx_http_log_module.html#log_format).

No hosting proxy is provisioned by this repository. The example must be applied and validated in the deployment's actual proxy configuration; hosted gateways need equivalent filtering, including any independent error logs or request tracing that capture URLs.

## Verification

Run `go test ./tests/unit/middlewares/...` from `backend/`. Tests cover both callback aliases, rejected callbacks, duplicate and encoded query keys, unchanged handler parameters, handler errors, and panic recovery in debug and release modes.

After configuring hosting, send a callback request with dummy values such as `/api/auth/github/callback?code=logging-check-code&state=logging-check-state`. Without a matching state cookie, HTTP 400 is expected. Inspect application, proxy, gateway, and tracing logs: the path and status may appear, but neither dummy value should appear. Use dummy values instead of real OAuth credentials. This deployment check is separate from the repository's unit tests.
