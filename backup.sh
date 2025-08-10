#!/bin/bash

# 备份脚本 - 创建项目快照
# 使用方法: ./backup.sh

# 获取当前日期和时间
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="releases/$DATE"

# 创建备份目录
echo "创建备份目录: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 定义要备份的文件和目录
echo "开始备份关键文件..."

# 复制配置文件
cp package.json "$BACKUP_DIR/"
cp package-lock.json "$BACKUP_DIR/"
cp next.config.mjs "$BACKUP_DIR/"
cp jsconfig.json "$BACKUP_DIR/"
cp tailwind.config.ts "$BACKUP_DIR/"
cp tsconfig.json "$BACKUP_DIR/"
cp postcss.config.mjs "$BACKUP_DIR/"
cp .eslintrc.json "$BACKUP_DIR/"
cp middleware.js "$BACKUP_DIR/"

# 复制文档文件
cp README.md "$BACKUP_DIR/"
cp ProjectNote.md "$BACKUP_DIR/"

# 复制源代码目录（保持目录结构）
echo "复制源代码目录..."
cp -r app "$BACKUP_DIR/"
cp -r lib "$BACKUP_DIR/"
cp -r models "$BACKUP_DIR/"
cp -r pages "$BACKUP_DIR/"
cp -r styles "$BACKUP_DIR/"

# 复制public目录（但排除uploads中的大文件）
echo "复制public目录..."
mkdir -p "$BACKUP_DIR/public"
cp public/*.svg "$BACKUP_DIR/public/" 2>/dev/null || true
cp public/*.ico "$BACKUP_DIR/public/" 2>/dev/null || true

# 只复制uploads目录结构，不复制大文件
if [ -d "public/uploads" ]; then
    mkdir -p "$BACKUP_DIR/public/uploads"
    # 只复制小于1MB的文件
    find public/uploads -type f -size -1M -exec cp {} "$BACKUP_DIR/public/uploads/" \; 2>/dev/null || true
fi

# 创建备份信息文件
echo "创建备份信息..."
cat > "$BACKUP_DIR/backup_info.txt" << EOF
备份创建时间: $(date)
备份目录: $BACKUP_DIR
项目名称: blackricegobackend2
Git分支: $(git branch --show-current 2>/dev/null || echo "未知")
Git提交: $(git rev-parse HEAD 2>/dev/null || echo "未知")

备份内容:
- 所有配置文件 (package.json, next.config.mjs, 等)
- 源代码目录 (app, lib, models, pages, styles)
- 文档文件 (README.md, ProjectNote.md)
- public目录 (排除大文件)

排除内容:
- node_modules
- .next
- .git
- 大于1MB的uploads文件
EOF

# 计算备份大小
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

echo ""
echo "✅ 备份完成!"
echo "📁 备份位置: $BACKUP_DIR"
echo "📊 备份大小: $BACKUP_SIZE"
echo "📝 备份信息已保存到: $BACKUP_DIR/backup_info.txt"
echo ""
echo "要查看备份内容，运行: ls -la $BACKUP_DIR"