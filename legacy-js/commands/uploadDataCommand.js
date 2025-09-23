const anthropicClient = require('../lib/anthropicClient');
const monitor = require('../lib/monitor');
const fs = require('fs');
const path = require('path');
const { PermissionsBitField } = require('discord.js');

module.exports = {
  async execute(message) {
    // Check if user is admin (you can customize this)
    const isAdmin = message.member?.permissions.has(PermissionsBitField.Flags.Administrator) || 
                   message.author.id === '146495555760160769' ||
                   message.member?.roles.cache.some(role => role.name === 'Designer');
    
    if (!isAdmin) {
      return message.reply('❌ This command is only available to administrators.');
    }

    const args = message.content.split(' ');
    const subCommand = args[1];

    try {
      switch (subCommand) {
        case 'upload':
          await this.handleUpload(message, args[2]);
          break;
        case 'toggle':
          await this.handleToggle(message, args[2]);
          break;
        case 'status':
          await this.handleStatus(message);
          break;
        case 'clear':
          await this.handleClear(message);
          break;
        case 'list':
          await this.handleList(message);
          break;
        case 'delete':
          await this.handleDelete(message, args[2]);
          break;
        case 'deleteall':
          await this.handleDeleteAll(message);
          break;
        default:
          await message.reply(`**Data Upload Commands:**

\`!uploaddata upload [filename]\` - Upload all data files or specific file to Anthropic workspace
\`!uploaddata toggle on/off\` - Toggle between context passing and file usage
\`!uploaddata status\` - Show current mode and uploaded files
\`!uploaddata list\` - List all files in Anthropic workspace
\`!uploaddata delete <file_id>\` - Delete a specific file from workspace
\`!uploaddata deleteall\` - Delete ALL files from workspace
\`!uploaddata clear\` - Clear uploaded files cache

**Examples:**
\`!uploaddata upload\` - Upload all files
\`!uploaddata upload aoa-halfling-willowbrook.txt\` - Upload specific file

**Current Mode:** ${anthropicClient.isContextPassing() ? 'Context Passing' : 'File Usage'} (with ${anthropicClient.isContextPassing() ? 'File Usage' : 'Context Passing'} fallback)`);
      }
    } catch (error) {
      console.error('Upload data command error:', error);
      await message.reply(`❌ Command failed: ${error.message}`);
    }
  },

  async handleUpload(message, filename) {
    if (filename) {
      // Upload specific file
      await message.reply(`🚀 Starting upload of specific file: ${filename}...`);
      
      try {
        const uploadResult = await anthropicClient.uploadSpecificFile(filename);
        
        if (uploadResult.success) {
          monitor.trackUpload(filename, true, uploadResult.fileId);
          let statusMessage = `📤 **File Upload Complete!**\n\n✅ **Successfully uploaded:** ${filename}\n`;
          statusMessage += `• File ID: ${uploadResult.fileId}\n`;
          statusMessage += `• Size: ${uploadResult.size} characters\n\n`;
          statusMessage += `**Current Mode:** ${anthropicClient.isContextPassing() ? 'Context Passing' : 'File Usage'} (with ${anthropicClient.isContextPassing() ? 'File Usage' : 'Context Passing'} fallback)`;
          statusMessage += '\n\n💡 Use `!uploaddata toggle on/off` to switch modes';
          
          await message.reply(statusMessage);
        } else {
          monitor.trackUpload(filename, false);
          await message.reply(`❌ Upload failed: ${uploadResult.error}`);
        }
      } catch (error) {
        console.error('Upload failed:', error);
        await message.reply(`❌ Upload failed: ${error.message}`);
      }
    } else {
      // Upload all files (existing behavior)
      await message.reply('🚀 Starting upload of all data files to Anthropic workspace...');
      
      try {
        const uploadResults = await anthropicClient.uploadAllDataFiles();
        const successCount = uploadResults.filter(r => r.success).length;
        const totalFiles = uploadResults.length;
        
        // Track upload results
        uploadResults.forEach(result => {
          monitor.trackUpload(result.file, result.success, result.fileId);
        });
        
        let statusMessage = `📤 **Upload Complete!**\n\n✅ **Successfully uploaded:** ${successCount}/${totalFiles} files\n\n`;
        
        if (successCount > 0) {
          statusMessage += '**Uploaded Files:**\n';
          uploadResults.filter(r => r.success).forEach(result => {
            statusMessage += `• ${result.file} (ID: ${result.fileId})\n`;
          });
        }
        
        if (successCount < totalFiles) {
          statusMessage += '\n❌ **Failed Uploads:**\n';
          uploadResults.filter(r => !r.success).forEach(result => {
            statusMessage += `• ${result.file}: ${result.error}\n`;
          });
        }
        
        statusMessage += `\n**Current Mode:** ${anthropicClient.isContextPassing() ? 'Context Passing' : 'File Usage'} (with ${anthropicClient.isContextPassing() ? 'File Usage' : 'Context Passing'} fallback)`;
        statusMessage += '\n\n💡 Use `!uploaddata toggle on/off` to switch modes';
        
        await message.reply(statusMessage);
      } catch (error) {
        console.error('Upload failed:', error);
        await message.reply(`❌ Upload failed: ${error.message}`);
      }
    }
  },

  async handleToggle(message, mode) {
    if (!mode || !['on', 'off', 'true', 'false'].includes(mode.toLowerCase())) {
      return message.reply('Usage: `!uploaddata toggle on/off`\n\n`on` or `true` = Context passing mode (current behavior)\n`off` or `false` = File usage mode (uses uploaded files)');
    }
    
    const enableContextPassing = ['on', 'true'].includes(mode.toLowerCase());
    anthropicClient.setContextPassing(enableContextPassing);
    
    const modeText = enableContextPassing ? 'Context Passing' : 'File Usage';
    const fallbackText = enableContextPassing ? 'File Usage' : 'Context Passing';
    const description = enableContextPassing 
      ? 'Bot will pass context in prompts (with File Usage fallback)'
      : 'Bot will use uploaded files from Anthropic workspace (with Context Passing fallback)';
    
    await message.reply(`🔄 **Mode Changed to: ${modeText} (with ${fallbackText} fallback)**\n\n${description}\n\n${enableContextPassing ? '💡 Use `!uploaddata upload` to upload files, then `!uploaddata toggle off` to use them' : '🤖 Bot will now use uploaded files for better quality answers'}`);
  },

  async handleStatus(message) {
    const isContextPassing = anthropicClient.isContextPassing();
    const dataDir = path.join(__dirname, '..', 'data');
    const localFiles = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
    
    let statusMessage = `📊 **Current Status:**\n\n**Mode:** ${isContextPassing ? 'Context Passing' : 'File Usage'} (with ${isContextPassing ? 'File Usage' : 'Context Passing'} fallback)\n\n`;
    
    statusMessage += `**Local Data Files:** ${localFiles.length}\n`;
    localFiles.forEach(file => {
      const filePath = path.join(dataDir, file);
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      statusMessage += `• ${file} (${sizeKB}KB)\n`;
    });
    
    if (!isContextPassing) {
      statusMessage += '\n**Uploaded Files:** Use `!uploaddata upload` to see uploaded files';
    }
    
    statusMessage += '\n\n💡 Use `!uploaddata toggle on/off` to switch modes';
    
    await message.reply(statusMessage);
  },

  async handleClear(message) {
    anthropicClient.clearFileCache();
    await message.reply('🗑️ **Uploaded files cache cleared!**\n\nYou can re-upload files with `!uploaddata upload`');
  },

  async handleList(message) {
    try {
      const files = await anthropicClient.listWorkspaceFiles();
      if (files.length === 0) {
        await message.reply('📁 **No files found in Anthropic workspace**');
        return;
      }

      let response = '📁 **Files in Anthropic Workspace:**\n\n';
      files.forEach((file, index) => {
        // Use the correct field names from the API response
        const filename = file.filename || 'Unknown';
        const fileId = file.id;
        const bytes = file.size_bytes || 0;
        const createdAt = file.created_at;
        
        const sizeKB = bytes ? Math.round(bytes / 1024) : 'Unknown';
        const created = createdAt ? new Date(createdAt).toLocaleDateString() : 'Unknown';
        
        response += `${index + 1}. **${filename}**\n`;
        response += `   ID: \`${fileId}\`\n`;
        response += `   Size: ${sizeKB}KB | Created: ${created}\n\n`;
      });

      await message.reply(response);
    } catch (error) {
      console.error('List files error:', error);
      await message.reply(`❌ Failed to list files: ${error.message}`);
    }
  },

  async handleDelete(message, fileId) {
    if (!fileId) {
      await message.reply('Usage: `!uploaddata delete <file_id>`\n\nUse `!uploaddata list` to see available files');
      return;
    }

    try {
      await anthropicClient.deleteFile(fileId);
      await message.reply(`🗑️ **File deleted successfully!**\n\nFile ID: \`${fileId}\``);
    } catch (error) {
      console.error('Delete file error:', error);
      await message.reply(`❌ Failed to delete file: ${error.message}`);
    }
  },

  async handleDeleteAll(message) {
    try {
      const files = await anthropicClient.listWorkspaceFiles();
      if (files.length === 0) {
        await message.reply('📁 **No files found in Anthropic workspace**');
        return;
      }

      let deletedCount = 0;
      let failedCount = 0;
      const errors = [];

      for (const file of files) {
        try {
          await anthropicClient.deleteFile(file.id);
          deletedCount++;
          console.log(`🗑️ Deleted file: ${file.filename} (${file.id})`);
        } catch (error) {
          failedCount++;
          errors.push(`${file.filename}: ${error.message}`);
          console.error(`Failed to delete ${file.filename}:`, error.message);
        }
      }

      let response = `🗑️ **Bulk Delete Complete!**\n\n`;
      response += `✅ **Successfully deleted:** ${deletedCount} files\n`;
      
      if (failedCount > 0) {
        response += `❌ **Failed to delete:** ${failedCount} files\n`;
        response += `\n**Errors:**\n`;
        errors.forEach(error => response += `• ${error}\n`);
      }

      await message.reply(response);
    } catch (error) {
      console.error('Delete all files error:', error);
      await message.reply(`❌ Failed to delete all files: ${error.message}`);
    }
  }
};
