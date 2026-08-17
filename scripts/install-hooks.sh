#!/bin/sh
# 安装 Git hooks
# 用法：npm run hooks:install

HOOK_DIR=".git/hooks"
SCRIPT_DIR="scripts"

# 确保 hooks 目录存在
mkdir -p "$HOOK_DIR"

# 复制 pre-push hook
cat > "$HOOK_DIR/pre-push" << 'EOF'
#!/bin/sh
# Git pre-push hook - 调用 Node.js 脚本自动更新版本
node scripts/pre-push.mjs
EOF

chmod +x "$HOOK_DIR/pre-push"

echo "✅ Git hooks 安装完成"
echo "   - pre-push: push 时自动更新版本号"
