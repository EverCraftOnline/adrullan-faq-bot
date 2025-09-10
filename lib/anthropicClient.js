const Anthropic = require('@anthropic-ai/sdk');
const { toFile } = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// Polyfill File for Node < 20
if (typeof globalThis.File === 'undefined') {
  globalThis.File = require('node:buffer').File;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Configuration for context passing vs file usage
let useContextPassing = false; // Default to File Usage mode
let uploadedFiles = new Map(); // Cache of uploaded file IDs

// Load cached file IDs on startup
function loadCachedFiles() {
  try {
    const cacheFile = path.join(__dirname, '..', 'file_cache.json');
    if (fs.existsSync(cacheFile)) {
      const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      Object.entries(cacheData).forEach(([key, value]) => {
        uploadedFiles.set(key, value);
      });
      console.log(`📁 Loaded ${uploadedFiles.size} cached file IDs`);
    }
  } catch (error) {
    console.log('📁 No cached files found or error loading cache');
  }
}

// Save cached file IDs
function saveCachedFiles() {
  try {
    const cacheFile = path.join(__dirname, '..', 'file_cache.json');
    const cacheData = Object.fromEntries(uploadedFiles);
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
    console.log(`💾 Saved ${uploadedFiles.size} file IDs to cache`);
  } catch (error) {
    console.error('❌ Failed to save file cache:', error.message);
  }
}

// Load cache on startup
loadCachedFiles();
console.log('🤖 Anthropic client initialized - Default mode: File Usage (with Context Passing fallback)');

module.exports = {
  // Toggle between context passing and file usage
  setContextPassing(enabled) {
    useContextPassing = enabled;
    console.log(`🔄 Mode changed to: ${enabled ? 'Context Passing' : 'File Usage'} (with ${enabled ? 'File Usage' : 'Context Passing'} fallback)`);
  },

  isContextPassing() {
    return useContextPassing;
  },

  // Convert JSON to text files and upload them
  async uploadFile(filePath, purpose = 'knowledge_base') {
    try {
      console.log(`📤 Processing file: ${path.basename(filePath)}`);
      
      const fileName = path.basename(filePath);
      const baseName = fileName.replace('.json', '');
      
      // Create text files directory
      const textDir = path.join(__dirname, '..', 'text_files');
      if (!fs.existsSync(textDir)) {
        fs.mkdirSync(textDir, { recursive: true });
      }
      
      // Convert JSON to text
      const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const textContent = this.convertJsonToText(jsonData, baseName);
      
      // Write to text file
      const textFilePath = path.join(textDir, `${baseName}.txt`);
      fs.writeFileSync(textFilePath, textContent, 'utf8');
      
      console.log(`📝 Created text file: ${baseName}.txt`);
      
      // Upload the text file
      const fileBuffer = fs.readFileSync(textFilePath, 'utf8');
      console.log(`📤 Uploading text file: ${textFilePath} (${fileBuffer.length} chars)`);
      console.log(`📄 First 200 chars: ${fileBuffer.substring(0, 200)}...`);
      
      const form = new FormData();
      form.append('file', fileBuffer, {
        filename: `${chunkFileName}.txt`,
        contentType: 'text/plain'
      });
      form.append('purpose', 'file-extraction');

      const uploadResponse = await anthropic.beta.files.upload(form, {
        betas: ['files-api-2025-04-14']
      });

      console.log(`✅ Successfully uploaded ${baseName}.txt - ID: ${uploadResponse.id}`);
      uploadedFiles.set(fileName, uploadResponse.id);
      return uploadResponse.id;
    } catch (error) {
      console.error(`❌ Failed to upload ${filePath}:`, error.message);
      console.error(`Full error response:`, JSON.stringify(error, null, 2));
      throw error;
    }
  },

  // Convert JSON data to plain text format
  convertJsonToText(jsonData, baseName) {
    let text = `Knowledge base content for ${baseName} `;
    
    if (Array.isArray(jsonData)) {
      jsonData.forEach((item, index) => {
        // Strip all formatting and field-like patterns from title
        let title = (item.title || item.id || 'Untitled').toString();
        title = title.replace(/[#*`_~\[\]():]/g, '').replace(/\s+/g, ' ').trim();
        
        // Strip all formatting and field-like patterns from content
        let content = (item.content || 'No content available').toString();
        content = content.replace(/[#*`_~\[\]():]/g, '').replace(/\s+/g, ' ').trim();
        
        text += `${title} ${content} `;
        
        if (item.source_url) {
          // Strip colons from URLs too
          let url = item.source_url.replace(/:/g, '');
          text += `${url} `;
        }
        text += ` `;
      });
    } else {
      text += `${JSON.stringify(jsonData, null, 2)}`;
    }
    
    return text;
  },

  // Upload all data files to Anthropic
  async uploadAllDataFiles() {
    const dataDir = path.join(__dirname, '..', 'data');
    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
    
    console.log(`🚀 Starting upload of ${files.length} data files to Anthropic...`);
    
    const uploadResults = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(dataDir, file);
        const fileId = await this.uploadFileInChunks(filePath);
        uploadResults.push({ file, fileId, success: true });
      } catch (error) {
        uploadResults.push({ file, error: error.message, success: false });
      }
    }
    
    const successCount = uploadResults.filter(r => r.success).length;
    console.log(`📊 Upload complete: ${successCount}/${files.length} files uploaded successfully`);
    
    return uploadResults;
  },

  // Upload file in smaller chunks to avoid field limit
  async uploadFileInChunks(filePath) {
    const fileName = path.basename(filePath, '.json');
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!Array.isArray(jsonData)) {
      // Single object, upload as is
      return await this.uploadFile(filePath);
    }
    
    // Convert to plain text
    const textContent = this.convertJsonToText(jsonData, fileName);
    
    const textDir = path.join(__dirname, '..', 'text_files');
    if (!fs.existsSync(textDir)) {
      fs.mkdirSync(textDir, { recursive: true });
    }
    
    const textFilePath = path.join(textDir, `${fileName}.txt`);
    fs.writeFileSync(textFilePath, textContent, 'utf8');
    
    console.log(`📝 Created text file: ${fileName}.txt`);
    console.log(`📄 Content length: ${textContent.length} chars`);
    
    try {
      const fileContent = fs.readFileSync(textFilePath, 'utf8');
      console.log(`📤 Uploading text file: ${textFilePath} (${fileContent.length} chars)`);
      console.log(`📄 File content type: ${typeof fileContent}`);
      console.log(`📄 File content preview: ${fileContent.substring(0, 100)}...`);
      
      if (!fileContent) {
        throw new Error('File content is empty or null');
      }
      
      const file = await toFile(fileContent, `${fileName}.txt`, { type: 'text/plain' });
      
      const uploadResponse = await anthropic.beta.files.upload({
        file: file
      }, {
        betas: ['files-api-2025-04-14']
      });

      console.log(`✅ Successfully uploaded ${fileName}.txt - ID: ${uploadResponse.id}`);
      uploadedFiles.set(fileName, [uploadResponse.id]);
      saveCachedFiles(); // Save to persistent cache
      return [uploadResponse.id];
    } catch (uploadError) {
      console.error(`❌ Failed to upload ${fileName}:`, uploadError.message);
      console.error(`Full error response:`, JSON.stringify(uploadError, null, 2));
      throw uploadError;
    }
  },

  // Get uploaded file ID by name
  getFileId(fileName) {
    return uploadedFiles.get(fileName);
  },

  // Clear uploaded files cache
  clearFileCache() {
    uploadedFiles.clear();
    // Also delete the cache file
    try {
      const cacheFile = path.join(__dirname, '..', 'file_cache.json');
      if (fs.existsSync(cacheFile)) {
        fs.unlinkSync(cacheFile);
      }
    } catch (error) {
      console.error('Failed to delete cache file:', error.message);
    }
    console.log('🗑️ Cleared uploaded files cache');
  },

  // List all files in Anthropic workspace
  async listWorkspaceFiles() {
    try {
      const response = await anthropic.beta.files.list({
        betas: ['files-api-2025-04-14']
      });
      console.log('📁 Files API response:', JSON.stringify(response, null, 2));
      return response.data || [];
    } catch (error) {
      console.error('Failed to list workspace files:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  },

  // Delete a file from Anthropic workspace
  async deleteFile(fileId) {
    try {
      await anthropic.beta.files.delete(fileId, {
        betas: ['files-api-2025-04-14']
      });
      console.log(`🗑️ Deleted file: ${fileId}`);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  },

  // Ask with context passing (original method)
  async askWithContext(systemPrompt, context, question) {
    const userPrompt = `KNOWLEDGE BASE CONTEXT:
${context}

USER QUESTION: ${question}

Respond using only the provided context. If the answer isn't in the context, say "I don't have official information about that in our current FAQ." Be helpful, accurate, and cite your sources.`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      });
      
      return response.content[0].text;
    } catch (error) {
      console.error('Anthropic API error:', error);
      if (error.status === 503) {
        throw new Error('Anthropic API is temporarily unavailable (503 error). Please try again in a few minutes.');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before making another request.');
      } else {
        throw new Error(`Failed to get AI response: ${error.message}`);
      }
    }
  },

  // Ask using uploaded files
  async askWithFiles(systemPrompt, question, fileIds = []) {
    try {
      // If no specific files provided, use all uploaded files
      let filesToUse = fileIds.length > 0 ? fileIds : [];
      
      if (filesToUse.length === 0) {
        // Flatten all uploaded file IDs (they might be arrays from chunked uploads)
        filesToUse = Array.from(uploadedFiles.values()).flat();
      }
      
      if (filesToUse.length === 0) {
        throw new Error('No files uploaded to Anthropic workspace');
      }

      console.log(`🤖 Using Files API with ${filesToUse.length} uploaded files`);

      // Use the Files API with the correct format
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: question
              },
              ...filesToUse.map(fileId => ({
                type: 'document',
                source: {
                  type: 'file',
                  file_id: fileId
                }
              }))
            ]
          }
        ]
      }, {
        headers: {
          'anthropic-beta': 'files-api-2025-04-14'
        }
      });

      console.log(`✅ Files API success! Using uploaded files as context`);
      return response.content[0].text;
    } catch (error) {
      console.error('Files API failed, falling back to local files:', error.message);
      
      // Fallback to local files
      let fileContent = '';
      const textDir = path.join(__dirname, '..', 'text_files');
      
      if (fs.existsSync(textDir)) {
        const textFiles = fs.readdirSync(textDir).filter(file => file.endsWith('.txt'));
        
        for (const textFile of textFiles) {
          try {
            const filePath = path.join(textDir, textFile);
            const content = fs.readFileSync(filePath, 'utf8');
            fileContent += `\n\n--- ${textFile} ---\n${content}`;
            console.log(`📄 Loaded ${textFile}: ${content.length} chars`);
          } catch (error) {
            console.error(`Failed to read ${textFile}:`, error.message);
          }
        }
      }
      
      if (!fileContent.trim()) {
        throw new Error('No file content could be loaded from text files');
      }
      
      console.log(`📄 Total context length: ${fileContent.length} characters`);
      
      // Use the file content as context
      const userPrompt = `KNOWLEDGE BASE CONTEXT:
${fileContent}

QUESTION: ${question}`;

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      return response.content[0].text;
    }
  },

  // Main ask method that chooses between context passing and file usage
  async ask(systemPrompt, context, question) {
    if (useContextPassing) {
      return this.askWithContext(systemPrompt, context, question);
    } else {
      return this.askWithFiles(systemPrompt, question);
    }
  }
};
