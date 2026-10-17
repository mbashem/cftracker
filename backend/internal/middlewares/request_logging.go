package middlewares

import (
	"fmt"
	"io"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
)

// RequestLogger excludes query strings and raw handler errors from access logs.
// Gin's params.Path includes RawQuery, so use the request's path explicitly.
func RequestLogger(output io.Writer) gin.HandlerFunc {
	return gin.LoggerWithConfig(gin.LoggerConfig{
		Output: output,
		Formatter: func(params gin.LogFormatterParams) string {
			return fmt.Sprintf("[GIN] %s | %3d | %13v | %15s | %-7s %q\n",
				params.TimeStamp.Format("2006/01/02 - 15:04:05"), params.StatusCode,
				params.Latency, params.ClientIP, params.Method, params.Request.URL.EscapedPath())
		},
	})
}

// Recovery retains Gin's recovery behavior without its raw request/panic dump.
// Panic values and request headers can contain the same secrets as query strings.
func Recovery(output io.Writer) gin.HandlerFunc {
	return gin.CustomRecoveryWithWriter(nil, func(ctx *gin.Context, recovered any) {
		fmt.Fprintf(output, "[Recovery] method=%s path=%q panic_type=%T\n%s",
			ctx.Request.Method, ctx.Request.URL.EscapedPath(), recovered, debug.Stack())
		ctx.AbortWithStatus(http.StatusInternalServerError)
	})
}
