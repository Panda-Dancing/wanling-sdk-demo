#!/bin/sh
set -eu

TARGET_ENV_JS="/usr/share/nginx/html/env.js"

escape_js() {
    printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cat > "$TARGET_ENV_JS" <<EOF
window.__APP_CONFIG__ = {
  VITE_API_BASE_URL: "$(escape_js "${VITE_API_BASE_URL:-}")"
};
EOF
