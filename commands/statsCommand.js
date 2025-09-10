const rateLimiter = require('../lib/rateLimiter');

module.exports = {
  async execute(message) {
    // Check if user is admin (you can customize this)
    const isAdmin = message.member?.permissions.has('ADMINISTRATOR') || 
                   message.author.id === 'YOUR_DISCORD_ID_HERE'; // Replace with your actual Discord ID (numeric)
    
    if (!isAdmin) {
      return message.reply('❌ This command is only available to administrators.');
    }

    try {
      const allUsers = rateLimiter.getAllUsers();
      const totalRequests = allUsers.reduce((sum, user) => sum + user.requests, 0);
      
      // Calculate estimated costs
      const estimatedCost = totalRequests * 0.01; // Rough estimate
      
      const stats = `📊 **Bot Usage Statistics** 📊
      
**Total Requests Today:** ${totalRequests}
**Estimated Cost:** ~$${estimatedCost.toFixed(2)}
**Active Users:** ${allUsers.length}

**Top Users:**
${allUsers
  .sort((a, b) => b.requests - a.requests)
  .slice(0, 5)
  .map((user, i) => `${i + 1}. <@${user.userId}>: ${user.requests} requests`)
  .join('\n')}

**Rate Limit Settings:**
- Daily limit: 20 requests per user
- Cooldown: 30s (simple), 2m (heavy context)
- Cost per request: ~$0.003 (simple), ~$0.01 (complex)`;

      await message.reply(stats);
      
    } catch (error) {
      console.error('Stats command error:', error);
      await message.reply('❌ Error retrieving statistics.');
    }
  }
};
