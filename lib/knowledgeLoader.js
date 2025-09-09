const fs = require('fs');
const path = require('path');

module.exports = {
  async loadAll() {
    const dataDir = path.join(__dirname, '..', 'data');
    
    if (!fs.existsSync(dataDir)) {
      console.log('Data directory not found, creating it...');
      fs.mkdirSync(dataDir, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(dataDir);
    const allData = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const filePath = path.join(dataDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (Array.isArray(data)) {
          allData.push(...data);
        } else {
          console.warn(`File ${file} does not contain a JSON array`);
        }
      } catch (error) {
        console.error(`Error loading ${file}:`, error.message);
      }
    }

    console.log(`Loaded ${allData.length} knowledge entries from ${files.length} files`);
    return allData;
  },

  async loadByCategory(category) {
    const allData = await this.loadAll();
    return allData.filter(item => item.category === category);
  },

  async loadByPriority(priority) {
    const allData = await this.loadAll();
    return allData.filter(item => item.priority === priority);
  }
};
