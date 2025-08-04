const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取当前日期时间
const now = new Date();
const dateStr = now.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
const backupDir = `releases/${dateStr}`;

console.log(`创建备份目录: ${backupDir}`);

// 创建目录
fs.mkdirSync(backupDir, { recursive: true });

// 要复制的文件列表
const filesToCopy = [
    'package.json',
    'package-lock.json',
    'next.config.mjs',
    'jsconfig.json',
    'tailwind.config.ts',
    'tsconfig.json',
    'postcss.config.mjs',
    '.eslintrc.json',
    'middleware.js',
    'README.md',
    'ProjectNote.md'
];

// 要复制的目录列表
const dirsToSync = [
    'app',
    'lib', 
    'models',
    'pages',
    'styles'
];

console.log('开始备份关键文件...');

// 复制文件
filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
        try {
            execSync(`cp "${file}" "${backupDir}/"`);
            console.log(`✓ 已复制: ${file}`);
        } catch (error) {
            console.log(`✗ 复制失败: ${file}`);
        }
    }
});

// 复制目录
dirsToSync.forEach(dir => {
    if (fs.existsSync(dir)) {
        try {
            execSync(`cp -r "${dir}" "${backupDir}/"`);
            console.log(`✓ 已复制目录: ${dir}`);
        } catch (error) {
            console.log(`✗ 复制目录失败: ${dir}`);
        }
    }
});

// 处理public目录
console.log('处理public目录...');
if (fs.existsSync('public')) {
    fs.mkdirSync(`${backupDir}/public`, { recursive: true });
    
    // 复制小文件
    try {
        execSync(`find public -maxdepth 1 -type f \\( -name "*.svg" -o -name "*.ico" -o -name "*.png" -o -name "*.jpg" \\) -exec cp {} "${backupDir}/public/" \\;`);
    } catch (error) {
        // 忽略错误，可能没有这些文件
    }
    
    // 创建uploads目录但不复制大文件
    if (fs.existsSync('public/uploads')) {
        fs.mkdirSync(`${backupDir}/public/uploads`, { recursive: true });
        console.log('✓ 已创建uploads目录结构');
    }
}

// 创建备份信息文件
const backupInfo = `备份创建时间: ${now.toLocaleString()}
备份目录: ${backupDir}
项目名称: blackricegobackend2

备份内容:
- 所有配置文件 (package.json, next.config.mjs, 等)
- 源代码目录 (app, lib, models, pages, styles)
- 文档文件 (README.md, ProjectNote.md)
- public目录 (排除大文件)

排除内容:
- node_modules
- .next
- .git
- uploads中的大文件
`;

fs.writeFileSync(`${backupDir}/backup_info.txt`, backupInfo);

// 计算备份大小
try {
    const sizeOutput = execSync(`du -sh "${backupDir}"`).toString();
    const size = sizeOutput.split('\t')[0];
    
    console.log('');
    console.log('✅ 备份完成!');
    console.log(`📁 备份位置: ${backupDir}`);
    console.log(`📊 备份大小: ${size}`);
    console.log(`📝 备份信息已保存到: ${backupDir}/backup_info.txt`);
} catch (error) {
    console.log('✅ 备份完成!');
    console.log(`📁 备份位置: ${backupDir}`);
}