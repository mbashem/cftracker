package auth

import (
	"net/url"
	"slices"

	"github.com/gin-gonic/gin"
)

// WithFrontendOrigins uses the CORS allowlist for frontend OAuth callbacks.
func WithFrontendOrigins(origins []string) HandlerOption {
	return func(handler *AuthHandler) {
		handler.allowedFrontendOrigins = slices.Clone(origins)
	}
}

func (handler *AuthHandler) frontendRedirectURL(context *gin.Context) (string, bool) {
	origin := context.GetHeader("Origin")
	if origin == "" {
		referer, err := url.Parse(context.Request.Referer())
		if err != nil || referer.User != nil {
			return "", false
		}
		origin = referer.Scheme + "://" + referer.Host
	}
	if !slices.Contains(handler.allowedFrontendOrigins, origin) {
		return "", false
	}
	return origin + "/callback/auth-gh", true
}
