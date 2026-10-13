const fs = require('fs');
const path = require('path');
const configLoader = require('./configLoader');

const PERMISSIONS_PATH = path.join(__dirname, '..', 'config', 'permissions.json');

let cachedConfig = null;

function loadConfig() {
  try {
    const raw = fs.readFileSync(PERMISSIONS_PATH, 'utf8');
    cachedConfig = JSON.parse(raw);
    return cachedConfig;
  } catch (error) {
    console.error('⚠️ permissions.json not found or invalid, falling back to open access:', error.message);
    cachedConfig = {
      defaults: { allowIfNoRule: true, allowDM: true, allowedChannels: [] },
      commands: {}
    };
    return cachedConfig;
  }
}

function getConfig() {
  if (!cachedConfig) {
    loadConfig();
  }
  return cachedConfig;
}

function normalizeChannelName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/^#/, '');
}

function channelMatches(channel, allowedChannels = []) {
  if (!channel || allowedChannels.length === 0) return true;

  const normalized = allowedChannels.map(normalizeChannelName);
  const channelName = normalizeChannelName(channel.name);

  // Match by ID or by name
  if (channel.id && normalized.includes(channel.id)) return true;
  if (channelName && normalized.includes(channelName)) return true;

  return false;
}

function memberHasRole(member, roles = []) {
  if (!member || !member.roles || roles.length === 0) return false;
  return member.roles.cache.some(role => roles.includes(role.name));
}

function isDMChannel(channel) {
  if (!channel) return false;
  if (typeof channel.isDMBased === 'function') return channel.isDMBased();
  return channel.type === 1; // ChannelType.DM
}

function isAdmin(userId, member) {
  return configLoader.isAdmin(userId, member) || process.env.ADMIN_USER_ID === userId;
}

function canRun(commandName, context = {}) {
  const { message, userId, member, channel } = context;
  const effectiveUserId = userId || message?.author?.id;
  const effectiveMember = member || message?.member;
  const effectiveChannel = channel || message?.channel;

  const config = getConfig();
  const defaults = config.defaults || {};
  const rule = config.commands?.[commandName];

  if (!rule) {
    const allowed = defaults.allowIfNoRule ?? true;
    return {
      allowed,
      reason: allowed ? null : `❌ ${commandName} is not enabled in this server.`
    };
  }

  const allowDM = rule.allowDM ?? defaults.allowDM ?? true;
  if (isDMChannel(effectiveChannel) && !allowDM) {
    return { allowed: false, reason: '❌ This command cannot be used in DMs.' };
  }

  // Admin override if marked adminOnly
  if (rule.adminOnly && isAdmin(effectiveUserId, effectiveMember)) {
    return { allowed: true };
  }

  // Channels
  const allowedChannels = rule.channels ?? defaults.allowedChannels ?? [];
  if (!isDMChannel(effectiveChannel) && !channelMatches(effectiveChannel, allowedChannels)) {
    return {
      allowed: false,
      reason: `❌ ${commandName} is not allowed in this channel.`
    };
  }

  // Users / roles
  const allowedUsers = rule.users || [];
  const allowedRoles = rule.roles || [];

  const userAllowed = allowedUsers.length === 0 || (effectiveUserId && allowedUsers.includes(effectiveUserId));
  const roleAllowed = allowedRoles.length === 0 || memberHasRole(effectiveMember, allowedRoles);

  if (!userAllowed && !roleAllowed) {
    return {
      allowed: false,
      reason: rule.reason || '❌ You do not have permission to use this command.'
    };
  }

  return { allowed: true };
}

function reload() {
  cachedConfig = null;
  loadConfig();
}

module.exports = {
  canRun,
  reload
};

