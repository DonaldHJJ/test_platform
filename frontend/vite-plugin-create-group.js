import fs from 'fs';
import path from 'path';

export default function createGroupPlugin() {
  return {
    name: 'create-group-plugin',
    configureServer(server) {
      const uploadFilesDir = path.join(process.cwd(), 'uploadFiles');
      
      if (!fs.existsSync(uploadFilesDir)) {
        fs.mkdirSync(uploadFilesDir, { recursive: true });
      }

      server.middlewares.use('/api/get-project-root', (req, res, next) => {
        if (req.method !== 'GET') {
          next();
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, rootPath: process.cwd() }));
      });

      server.middlewares.use('/api/upload-file', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        let body = [];
        let contentType = req.headers['content-type'] || '';
        
        if (!contentType.includes('multipart/form-data')) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: '需要 multipart/form-data 格式' }));
          return;
        }

        req.on('data', chunk => {
          body.push(chunk);
        });

        req.on('end', () => {
          try {
            const buffer = Buffer.concat(body);
            const bodyString = buffer.toString('latin1');
            
            const boundary = contentType.split('boundary=')[1];
            const parts = bodyString.split(`--${boundary}`);
            
            for (const part of parts) {
              if (!part.trim() || part === '--') continue;
              
              const headerEnd = part.indexOf('\r\n\r\n');
              if (headerEnd === -1) continue;
              
              const headerPart = part.substring(0, headerEnd);
              const contentPart = part.substring(headerEnd + 4);
              
              if (headerPart.includes('filename')) {
                const filenameMatch = headerPart.match(/filename="([^"]+)"/);
                if (filenameMatch) {
                  const originalFilename = filenameMatch[1];
                  const timestamp = Date.now();
                  const ext = path.extname(originalFilename);
                  const baseName = path.basename(originalFilename, ext);
                  const newFilename = `${baseName}_${timestamp}${ext}`;
                  const filePath = path.join(uploadFilesDir, newFilename);
                  
                  const content = Buffer.from(contentPart, 'latin1');
                  fs.writeFileSync(filePath, content);
                  
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ 
                    success: true, 
                    filename: originalFilename,
                    storedFilename: newFilename,
                    originalFilename: originalFilename,
                    filePath: `/uploadFiles/${newFilename}`,
                    absolutePath: filePath
                  }));
                  return;
                }
              }
            }
            
            res.statusCode = 400;
            res.end(JSON.stringify({ error: '未找到文件' }));
          } catch (error) {
            console.error('上传文件失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: '上传文件失败' }));
          }
        });
      });

      server.middlewares.use('/uploadFiles', (req, res, next) => {
        const filePath = path.join(uploadFilesDir, req.url.slice(1));
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath);
          let contentType = 'application/octet-stream';
          if (ext === '.js') contentType = 'application/javascript';
          if (ext === '.css') contentType = 'text/css';
          if (ext === '.json') contentType = 'application/json';
          if (ext === '.png') contentType = 'image/png';
          if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
          if (ext === '.gif') contentType = 'image/gif';
          if (ext === '.svg') contentType = 'image/svg+xml';
          if (ext === '.txt') contentType = 'text/plain';
          
          res.setHeader('Content-Type', contentType);
          fs.createReadStream(filePath).pipe(res);
        } else {
          next();
        }
      });

      server.middlewares.use('/api/create-group', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { groupName } = JSON.parse(body);
            
            if (!groupName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少分组名称' }));
              return;
            }

            const customDir = path.join(process.cwd(), 'src', 'system-config', 'custom');
            const filePath = path.join(customDir, `${groupName}.json`);

            if (fs.existsSync(filePath)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: `文件 ${groupName}.json 已存在` }));
              return;
            }

            const fileContent = {
              name: groupName,
              commands: []
            };

            fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, filePath }));
          } catch (error) {
            console.error('创建文件失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: '创建文件失败' }));
          }
        });
      });

      server.middlewares.use('/api/delete-group', (req, res, next) => {
        if (req.method !== 'DELETE') {
          next();
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { groupName } = JSON.parse(body);
            
            if (!groupName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少分组名称' }));
              return;
            }

            const customDir = path.join(process.cwd(), 'src', 'system-config', 'custom');
            const filePath = path.join(customDir, `${groupName}.json`);

            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `文件 ${groupName}.json 不存在` }));
              return;
            }

            fs.unlinkSync(filePath);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, filePath }));
          } catch (error) {
            console.error('删除文件失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: '删除文件失败' }));
          }
        });
      });

      server.middlewares.use('/api/create-flow-folder', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { folderName } = JSON.parse(body);
            
            if (!folderName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少文件夹名称' }));
              return;
            }

            const flowDir = path.join(process.cwd(), 'src', 'flow');
            const folderPath = path.join(flowDir, folderName);

            if (fs.existsSync(folderPath)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: `文件夹 ${folderName} 已存在` }));
              return;
            }

            fs.mkdirSync(folderPath);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, folderPath }));
          } catch (error) {
            console.error('创建文件夹失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: '创建文件夹失败' }));
          }
        });
      });

      server.middlewares.use('/api/get-flow-folders', (req, res, next) => {
        if (req.method !== 'GET') {
          next();
          return;
        }

        try {
          const flowDir = path.join(process.cwd(), 'src', 'flow');
          
          if (!fs.existsSync(flowDir)) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, folders: [] }));
            return;
          }

          const files = fs.readdirSync(flowDir);
          const folders = files.filter(file => {
            const filePath = path.join(flowDir, file);
            return fs.statSync(filePath).isDirectory();
          }).map(folderName => {
            const folderPath = path.join(flowDir, folderName);
            const folderFiles = fs.readdirSync(folderPath);
            const jsonFiles = folderFiles
              .filter(file => file.endsWith('.json'))
              .map(file => file.replace('.json', ''));
            return {
              name: folderName,
              files: jsonFiles
            };
          });

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, folders }));
        } catch (error) {
          console.error('获取文件夹列表失败:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: '获取文件夹列表失败' }));
        }
      });

      server.middlewares.use('/api/delete-flow-folder', (req, res, next) => {
        if (req.method !== 'DELETE') {
          next();
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { folderName } = JSON.parse(body);
            
            if (!folderName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少文件夹名称' }));
              return;
            }

            const flowDir = path.join(process.cwd(), 'src', 'flow');
            const folderPath = path.join(flowDir, folderName);

            if (!fs.existsSync(folderPath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `文件夹 ${folderName} 不存在` }));
              return;
            }

            function deleteFolderRecursive(dirPath) {
              if (fs.existsSync(dirPath)) {
                fs.readdirSync(dirPath).forEach((file) => {
                  const curPath = path.join(dirPath, file);
                  if (fs.statSync(curPath).isDirectory()) {
                    deleteFolderRecursive(curPath);
                  } else {
                    fs.unlinkSync(curPath);
                  }
                });
                fs.rmdirSync(dirPath);
              }
            }

            deleteFolderRecursive(folderPath);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, folderPath }));
          } catch (error) {
            console.error('删除文件夹失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: '删除文件夹失败' }));
          }
        });
      });

      server.middlewares.use('/api/create-flow-file', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { folderName, flowName, description } = JSON.parse(body);
            
            if (!folderName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少文件夹名称' }));
              return;
            }

            if (!flowName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少流程名称' }));
              return;
            }

            const flowDir = path.join(process.cwd(), 'src', 'flow', folderName);
            const filePath = path.join(flowDir, `${flowName}.json`);

            if (!fs.existsSync(flowDir)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `文件夹 ${folderName} 不存在` }));
              return;
            }

            if (fs.existsSync(filePath)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: `流程 ${flowName}.json 已存在` }));
              return;
            }

            const fileContent = {
              name: flowName,
              description: description || '',
              nodes: [],
              edges: []
            };

            fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, filePath }));
          } catch (error) {
            console.error('创建流程文件失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: '创建流程文件失败' }));
          }
        });
      });

      server.middlewares.use('/api/delete-flow-file', (req, res, next) => {
        if (req.method !== 'DELETE') {
          next();
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { folderName, fileName } = JSON.parse(body);
            
            if (!folderName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少文件夹名称' }));
              return;
            }

            if (!fileName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少文件名称' }));
              return;
            }

            const flowDir = path.join(process.cwd(), 'src', 'flow', folderName);
            const filePath = path.join(flowDir, `${fileName}.json`);

            if (!fs.existsSync(flowDir)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `文件夹 ${folderName} 不存在` }));
              return;
            }

            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `文件 ${fileName}.json 不存在` }));
              return;
            }

            fs.unlinkSync(filePath);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, filePath }));
          } catch (error) {
            console.error('删除流程文件失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: '删除流程文件失败' }));
          }
        });
      });

      server.middlewares.use('/api/rename-flow-file', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { folderName, oldFileName, newFileName } = JSON.parse(body);
            
            if (!folderName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少文件夹名称' }));
              return;
            }

            if (!oldFileName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少旧文件名称' }));
              return;
            }

            if (!newFileName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少新文件名称' }));
              return;
            }

            const flowDir = path.join(process.cwd(), 'src', 'flow', folderName);
            const oldFilePath = path.join(flowDir, `${oldFileName}.json`);
            const newFilePath = path.join(flowDir, `${newFileName}.json`);

            if (!fs.existsSync(flowDir)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `文件夹 ${folderName} 不存在` }));
              return;
            }

            if (!fs.existsSync(oldFilePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `文件 ${oldFileName}.json 不存在` }));
              return;
            }

            if (fs.existsSync(newFilePath)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: `文件 ${newFileName}.json 已存在` }));
              return;
            }

            fs.renameSync(oldFilePath, newFilePath);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, newFilePath, oldFilePath }));
          } catch (error) {
            console.error('重命名流程文件失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: '重命名流程文件失败' }));
          }
        });
      });

      server.middlewares.use('/api/get-flow-file', (req, res, next) => {
        if (req.method !== 'GET') {
          next();
          return;
        }

        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const folderName = url.searchParams.get('folderName');
          const flowName = url.searchParams.get('flowName');
          
          if (!folderName) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: '缺少文件夹名称' }));
            return;
          }

          if (!flowName) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: '缺少流程名称' }));
            return;
          }

          const flowDir = path.join(process.cwd(), 'src', 'flow', folderName);
          const filePath = path.join(flowDir, `${flowName}.json`);

          if (!fs.existsSync(flowDir)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: `文件夹 ${folderName} 不存在` }));
            return;
          }

          if (!fs.existsSync(filePath)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: `流程 ${flowName}.json 不存在` }));
            return;
          }

          const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, data: fileContent }));
        } catch (error) {
          console.error('获取流程文件失败:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: '获取流程文件失败' }));
        }
      });

      server.middlewares.use('/api/update-flow-file', (req, res, next) => {
        if (req.method !== 'PUT') {
          next();
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { folderName, flowName, data } = JSON.parse(body);
            
            if (!folderName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少文件夹名称' }));
              return;
            }

            if (!flowName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少流程名称' }));
              return;
            }

            if (!data) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少流程数据' }));
              return;
            }

            const flowDir = path.join(process.cwd(), 'src', 'flow', folderName);
            const filePath = path.join(flowDir, `${flowName}.json`);

            if (!fs.existsSync(flowDir)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `文件夹 ${folderName} 不存在` }));
              return;
            }

            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `流程 ${flowName}.json 不存在` }));
              return;
            }

            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, filePath }));
          } catch (error) {
            console.error('更新流程文件失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: '更新流程文件失败' }));
          }
        });
      });

      server.middlewares.use('/api/create-server-command', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { groupName, command } = JSON.parse(body);
            
            if (!groupName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少分组名称' }));
              return;
            }

            if (!command) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少指令数据' }));
              return;
            }

            const customDir = path.join(process.cwd(), 'src', 'system-config', 'custom');
            const filePath = path.join(customDir, `${groupName}.json`);

            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `分组 ${groupName} 不存在` }));
              return;
            }

            const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            const newCommand = {
              ...command,
              type: 'server'
            };
            
            if (newCommand.uploadFile && newCommand.storedFilename) {
              newCommand.filePath = path.join(uploadFilesDir, newCommand.storedFilename);
            }
            
            fileContent.commands.push(newCommand);

            fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, filePath, command: newCommand }));
          } catch (error) {
            console.error('创建服务器指令失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: '创建服务器指令失败' }));
          }
        });
      });

      server.middlewares.use('/api/update-command', (req, res, next) => {
        if (req.method !== 'PUT') {
          next();
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { groupName, commandIndex, command } = JSON.parse(body);
            
            if (!groupName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少分组名称' }));
              return;
            }

            if (commandIndex === undefined || commandIndex === null) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少指令索引' }));
              return;
            }

            if (!command) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少指令数据' }));
              return;
            }

            const customDir = path.join(process.cwd(), 'src', 'system-config', 'custom');
            const filePath = path.join(customDir, `${groupName}.json`);

            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `分组 ${groupName} 不存在` }));
              return;
            }

            const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            if (!fileContent.commands[commandIndex]) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `指令索引 ${commandIndex} 不存在` }));
              return;
            }

            const oldCommand = fileContent.commands[commandIndex];
            fileContent.commands[commandIndex] = {
              ...oldCommand,
              ...command
            };
            
            if (fileContent.commands[commandIndex].uploadFile && fileContent.commands[commandIndex].storedFilename) {
              fileContent.commands[commandIndex].filePath = path.join(uploadFilesDir, fileContent.commands[commandIndex].storedFilename);
            }

            fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, filePath, command: fileContent.commands[commandIndex] }));
          } catch (error) {
            console.error('更新指令失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: '更新指令失败' }));
          }
        });
      });

      server.middlewares.use('/api/delete-command', (req, res, next) => {
        if (req.method !== 'DELETE') {
          next();
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { groupName, commandIndex } = JSON.parse(body);
            
            if (!groupName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少分组名称' }));
              return;
            }

            if (commandIndex === undefined || commandIndex === null) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少指令索引' }));
              return;
            }

            const customDir = path.join(process.cwd(), 'src', 'system-config', 'custom');
            const filePath = path.join(customDir, `${groupName}.json`);

            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `分组 ${groupName} 不存在` }));
              return;
            }

            const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            if (!fileContent.commands[commandIndex]) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `指令索引 ${commandIndex} 不存在` }));
              return;
            }

            const deletedCommand = fileContent.commands[commandIndex];
            
            if (deletedCommand.uploadFile && deletedCommand.storedFilename) {
              const fileToDelete = path.join(uploadFilesDir, deletedCommand.storedFilename);
              if (fs.existsSync(fileToDelete)) {
                fs.unlinkSync(fileToDelete);
              }
            }
            
            if (deletedCommand.type === 'database' && deletedCommand.storedFilename) {
              const fileToDelete = path.join(uploadFilesDir, deletedCommand.storedFilename);
              if (fs.existsSync(fileToDelete)) {
                fs.unlinkSync(fileToDelete);
              }
            }
            
            if (deletedCommand.type === 'other' && deletedCommand.subType === 'compareFile' && deletedCommand.storedFilename) {
              const fileToDelete = path.join(uploadFilesDir, deletedCommand.storedFilename);
              if (fs.existsSync(fileToDelete)) {
                fs.unlinkSync(fileToDelete);
              }
            }

            fileContent.commands.splice(commandIndex, 1);

            fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, filePath }));
          } catch (error) {
            console.error('删除指令失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: '删除指令失败' }));
          }
        });
      });

      server.middlewares.use('/api/create-api-command', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { groupName, command } = JSON.parse(body);
            
            if (!groupName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少分组名称' }));
              return;
            }

            if (!command) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少指令数据' }));
              return;
            }

            const customDir = path.join(process.cwd(), 'src', 'system-config', 'custom');
            const filePath = path.join(customDir, `${groupName}.json`);

            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `分组 ${groupName} 不存在` }));
              return;
            }

            const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            const newCommand = {
              ...command
            };
            
            fileContent.commands.push(newCommand);

            fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, filePath, command: newCommand }));
          } catch (error) {
            console.error('创建API指令失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: '创建API指令失败' }));
          }
        });
      });

      server.middlewares.use('/api/create-web-command', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { groupName, command } = JSON.parse(body);
            
            if (!groupName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少分组名称' }));
              return;
            }

            if (!command) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少指令数据' }));
              return;
            }

            const customDir = path.join(process.cwd(), 'src', 'system-config', 'custom');
            const filePath = path.join(customDir, `${groupName}.json`);

            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `分组 ${groupName} 不存在` }));
              return;
            }

            const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            const newCommand = {
              ...command
            };
            
            fileContent.commands.push(newCommand);

            fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, filePath, command: newCommand }));
          } catch (error) {
            console.error('创建WEB指令失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: '创建WEB指令失败' }));
          }
        });
      });

      server.middlewares.use('/api/create-other-command', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { groupName, command } = JSON.parse(body);
            
            if (!groupName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少分组名称' }));
              return;
            }

            if (!command) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少指令数据' }));
              return;
            }

            const customDir = path.join(process.cwd(), 'src', 'system-config', 'custom');
            const filePath = path.join(customDir, `${groupName}.json`);

            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `分组 ${groupName} 不存在` }));
              return;
            }

            const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            const newCommand = {
              ...command,
              type: 'other'
            };
            
            fileContent.commands.push(newCommand);

            fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, filePath, command: newCommand }));
          } catch (error) {
            console.error('创建其它指令失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: '创建其它指令失败' }));
          }
        });
      });

      server.middlewares.use('/api/create-database-command', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { groupName, command } = JSON.parse(body);
            
            if (!groupName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少分组名称' }));
              return;
            }

            if (!command) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '缺少指令数据' }));
              return;
            }

            const customDir = path.join(process.cwd(), 'src', 'system-config', 'custom');
            const filePath = path.join(customDir, `${groupName}.json`);

            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `分组 ${groupName} 不存在` }));
              return;
            }

            const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            const newCommand = {
              ...command,
              type: 'database'
            };
            
            fileContent.commands.push(newCommand);

            fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, filePath, command: newCommand }));
          } catch (error) {
            console.error('创建数据库指令失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: '创建数据库指令失败' }));
          }
        });
      });
    }
  };
}
