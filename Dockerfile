# frontend-sdk-demo 前端示例（Vue + Vite）
# 多阶段构建：先构建静态资源，再用 nginx 托管
# 建议在仓库根目录作为构建上下文（CI 中：docker build -f frontend-sdk-demo/Dockerfile .）

# -----------------------------------------------------------------------------
# 阶段一：构建
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /workspace

# 仅复制依赖清单和锁定文件，利用 Docker 缓存
COPY frontend-sdk-demo/package.json frontend-sdk-demo/package-lock.json ./frontend-sdk-demo/

WORKDIR /workspace/frontend-sdk-demo

RUN npm ci

# 在镜像内为生产构建设置环境变量
# - VITE_USE_LOCAL_SDK: 使用 npm 包
ENV VITE_API_BASE_URL=/api \
    VITE_USE_LOCAL_SDK=false

# 复制源码
COPY frontend-sdk-demo/ ./

# 复制本地 SDK 源码，供 Vite alias '../SDK-video/src/index.js' 使用
# COPY SDK-video/ ../SDK-video/

# 构建产物
RUN npm run build

# -----------------------------------------------------------------------------
# 阶段二：运行
# -----------------------------------------------------------------------------
FROM nginx:alpine

# 清理默认静态资源
RUN rm -rf /usr/share/nginx/html/*

# 拷贝构建产物到 nginx 默认站点目录
COPY --from=builder /workspace/frontend-sdk-demo/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

