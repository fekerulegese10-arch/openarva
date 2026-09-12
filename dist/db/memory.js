import fs from 'fs';
import path from 'path';
export class OpenArvaMemory {
    dbPath = path.resolve(process.cwd(), '.openarva_memory.json');
    conversationHistory = [];
    userPreferences = {};
    learningMetrics = {};
    states = {};
    constructor() {
        this.loadMemory();
    }
    loadMemory() {
        if (fs.existsSync(this.dbPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
                this.conversationHistory = data.conversationHistory || [];
                this.userPreferences = data.userPreferences || {};
                this.learningMetrics = data.learningMetrics || {};
                this.states = data.states || {};
            }
            catch (e) {
                console.error('[Memory] Failed to load memory, starting fresh');
            }
        }
    }
    // Save conversation for learning
    saveConversation(role, content) {
        this.conversationHistory.push({
            role,
            content,
            timestamp: new Date().toISOString()
        });
        // Keep only last 500 conversations
        if (this.conversationHistory.length > 500) {
            this.conversationHistory = this.conversationHistory.slice(-500);
        }
        this.persist();
    }
    // Store learning from user feedback
    recordUserPreference(key, value, importance = 5) {
        this.userPreferences[key] = {
            value,
            importance,
            lastUpdated: new Date().toISOString()
        };
        this.persist();
    }
    // Retrieve user preference
    getUserPreference(key) {
        return this.userPreferences[key]?.value || null;
    }
    // Track performance metrics
    recordMetric(metricName, value) {
        this.learningMetrics[metricName] = (this.learningMetrics[metricName] || 0) + value;
        this.persist();
    }
    // Get conversation history for context
    getRecentContext(limit = 10) {
        return this.conversationHistory
            .slice(-limit)
            .map(entry => `${entry.role}: ${entry.content}`)
            .join('\n');
    }
    // Enhanced state management with metadata
    saveState(key, data, importance = 5) {
        this.states[key] = {
            data,
            timestamp: new Date().toISOString(),
            accessCount: (this.states[key]?.accessCount || 0) + 1,
            lastAccessed: new Date().toISOString(),
            importance
        };
        this.persist();
    }
    getState(key) {
        if (!fs.existsSync(this.dbPath))
            return null;
        try {
            const entry = this.states[key];
            return entry?.data || null;
        }
        catch (e) {
            return null;
        }
    }
    // Persist all memory to disk
    persist() {
        try {
            const data = {
                conversationHistory: this.conversationHistory,
                userPreferences: this.userPreferences,
                learningMetrics: this.learningMetrics,
                states: this.states,
                lastSaved: new Date().toISOString()
            };
            fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
        }
        catch (e) {
            console.error('[Memory] Failed to persist memory:', e);
        }
    }
    // Clear old memories to manage storage
    pruneOldMemories(daysOld = 30) {
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
        this.conversationHistory = this.conversationHistory.filter(entry => entry.timestamp > cutoffDate);
        this.persist();
    }
    getMemoryStats() {
        return {
            conversations: this.conversationHistory.length,
            preferences: Object.keys(this.userPreferences).length,
            metrics: Object.keys(this.learningMetrics).length,
            dbSize: fs.existsSync(this.dbPath) ? fs.statSync(this.dbPath).size : 0
        };
    }
}
