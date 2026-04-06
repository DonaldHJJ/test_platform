const fs = require('fs');
const path = require('path');

const groupName = process.argv[2];

if (!groupName) {
  console.error('错误：缺少分组名称参数');
  console.log('使用方法：node create-group.js <分组名称>');
  process.exit(1);
}

const customDir = path.join(__dirname, 'src', 'system-config', 'custom');
const filePath = path.join(customDir, `${groupName}.json`);

if (fs.existsSync(filePath)) {
  console.error(`错误：文件 ${groupName}.json 已存在`);
  process.exit(1);
}

const fileContent = {
  name: groupName,
  commands: []
};

fs.writeFile(filePath, JSON.stringify(fileContent, null, 2), 'utf8', (err) => {
  if (err) {
    console.error('创建文件失败:', err);
    process.exit(1);
  }
  console.log(`成功创建文件: ${filePath}`);
});
