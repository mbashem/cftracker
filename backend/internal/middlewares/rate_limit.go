package middlewares

import (
	"net/http"
	"path"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/ratelimit"
)

// LimitUser runs after Authenticate and shares allowances across protected routes.
func LimitUser(service *ratelimit.Service) gin.HandlerFunc {
	return func(context *gin.Context) {
		identity := strconv.FormatInt(context.GetInt64(UserIdKey), 10)
		if allowed, retry := service.Allow(ratelimit.General, identity); !allowed {
			ratelimit.Reject(context, retry)
			return
		}
		switch context.Request.Method {
		case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
			if allowed, retry := service.Allow(ratelimit.Write, identity); !allowed {
				ratelimit.Reject(context, retry)
			}
		}
	}
}

// LimitAuthentication gives callback routes their own IP budget. Other routes in
// the authentication group share the login budget, including compatibility aliases.
func LimitAuthentication(service *ratelimit.Service) gin.HandlerFunc {
	return func(context *gin.Context) {
		policy := ratelimit.Login
		if path.Base(context.FullPath()) == "callback" {
			policy = ratelimit.Callback
		}
		if allowed, retry := service.Allow(policy, context.ClientIP()); !allowed {
			ratelimit.Reject(context, retry)
		}
	}
}
