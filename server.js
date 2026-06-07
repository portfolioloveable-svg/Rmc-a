const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const FormData = require('form-data');
const cookieSession = require('cookie-session');
const https = require('https');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

puppeteer.use(StealthPlugin());

// ==========================================
// HOST ENVIRONMENT DETECTION
// ==========================================
const IS_RAILWAY = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID ? true : false;
const IS_TERMUX = process.env.PREFIX && process.env.PREFIX.includes('com.termux') ? true : false;
const HOST_ENV = IS_RAILWAY ? 'Railway' : (IS_TERMUX ? 'Termux' : 'Local/Other');
console.log(`[System Engine] Running on Host: ${HOST_ENV}`);

// ==========================================
// CONFIGURATIONS
// ==========================================
const SUPABASE_URL = 'https://nebwfonyhfgxnfkiisvs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lYndmb255aGZneG5ma2lpc3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNjc0MjMsImV4cCI6MjA5MDk0MzQyM30.me-P_mhC3droVGrHSlD_G3h9-ZgGgR3hy8VyDLFTp58';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let ADMIN_PASSWORD = '@ROMEOPROXY789';

// TELEGRAM CONFIGURATION
const TG_BOT_TOKEN = '6349510394:AAFZNXCdU6glkXiXlg42_y58DNpYHEM-8Aw'; 
const TG_CHAT_ID = '6383817850';

const TG_LIVE_STICKER_ID = 'CAACAgIAAxkBAAE...'; 

const TG_API_ENDPOINTS = [
    "https://api.telegram.org",
    "https://teleapi.vercel.app",
    "https://tg-proxy.romania.workers.dev", 
    "https://api.telegram.org.bot.vercel.app"
];
let stickyProxy = null; 

// HTTPS Agent
const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });

const activeTimers = {}; 
const lastActivationData = {}; 
const systemLogs = []; 
const networkLogs = [];
const licenseStepScreenshots = {}; 
const engineStatus = {}; 
global.watchingUID = null; 
let resetOTP = null;

// ==========================================
// PAKISTAN TIME HELPER
// ==========================================
function getPKTTime() {
    return new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi', hour12: true });
}

// ==========================================
// GLOBAL QUEUE SYSTEM FOR ACTIVATION
// ==========================================
const executionQueue = [];
let currentRunningUid = null;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.set('trust proxy', true); 
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieSession({
    name: 'romeo_auth',
    keys: ['super_secret_uchiha_key_2026'],
    maxAge: 24 * 60 * 60 * 1000 
}));

// ==========================================
// DYNAMIC CORS SYSTEM
// ==========================================
let ALLOW_ALL_CORS = true;
const CORS_FILE = 'cors_urls.txt';
if(!fs.existsSync(CORS_FILE)) fs.writeFileSync(CORS_FILE, '', 'utf8');

app.use((req, res, next) => {
    if (ALLOW_ALL_CORS) {
        res.header('Access-Control-Allow-Origin', '*');
    } else {
        const allowedOrigins = fs.readFileSync(CORS_FILE, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
        const origin = req.headers.origin;
        if (allowedOrigins.includes(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
        }
    }
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// ==========================================
// API REQUEST/RESPONSE LOGGER
// ==========================================
const backendApiLogs = [];
app.use((req, res, next) => {
    const isApiRoute = req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/ping') || req.originalUrl.startsWith('/step') || req.originalUrl.startsWith('/ch_uid');
    
    if (isApiRoute && !req.originalUrl.includes('api_logs_fetch')) {
        const start = Date.now();
        const oldJson = res.json;
        res.json = function(data) {
            const duration = Date.now() - start;
            let safeReqBody = req.body ? {...req.body} : {};
            if(safeReqBody.password) safeReqBody.password = "***";
            if(safeReqBody.payload) safeReqBody.payload = "[ENCRYPTED_PAYLOAD]";
            
            let safeData = typeof data === 'object' ? {...data} : data;
            if(safeData && safeData.payload) safeData.payload = "[ENCRYPTED_RESPONSE]";
            
            backendApiLogs.unshift({
                time: getPKTTime(),
                method: req.method,
                url: req.originalUrl,
                reqBody: safeReqBody,
                resBody: safeData,
                status: res.statusCode,
                timeTaken: duration + 'ms'
            });
            
            if(backendApiLogs.length > 200) backendApiLogs.pop();
            return oldJson.call(this, data);
        };
    }
    next();
});

process.on('uncaughtException', (err) => console.log(`[Shield] ${err.message}`));
process.on('unhandledRejection', () => console.log(`[Shield] Rejection Prevented.`));

setTimeout(async () => {
    try {
        const { data } = await supabase.from('settings').select('*').in('key', ['admin_pass']);
        if(data) data.forEach(d => { if(d.key === 'admin_pass') ADMIN_PASSWORD = d.value; });
    } catch(e) {}
}, 2000);

// ==========================================
// AES-256-CBC ENCRYPTION SYSTEM
// ==========================================
const ENCRYPTION_PASSPHRASE = "ROMEO_KING_2026"; 
const ENCRYPTION_KEY = crypto.createHash('sha256').update(ENCRYPTION_PASSPHRASE).digest();

function encryptData(dataObj, customKey = ENCRYPTION_KEY) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', customKey, iv);
    let encrypted = cipher.update(JSON.stringify(dataObj), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decryptData(encryptedStr, customKey = ENCRYPTION_KEY) {
    try {
        const parts = encryptedStr.split(':');
        const iv = Buffer.from(parts.shift(), 'hex');
        const encryptedText = Buffer.from(parts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', customKey, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    } catch (e) { return null; }
}

const secureMiddleware = (req, res, next) => {
    if (req.body && req.body.payload) {
        const decrypted = decryptData(req.body.payload);
        if (!decrypted) return res.status(400).json({ error: "Invalid Encryption Payload" });
        req.body = decrypted;
    }
    const originalJson = res.json;
    res.json = function(data) {
        if(data.error || data.raw) return originalJson.call(this, data);
        return originalJson.call(this, { payload: encryptData(data) });
    };
    next();
};

const STRICT_KEY = crypto.createHash('sha256').update('@ROmEo<890>').digest();

const strictSecureMiddleware = (req, res, next) => {
    const ua = req.headers['user-agent'] || '';
    if (ua.includes('HeadlessChrome') || ua.includes('Puppeteer')) return res.status(403).json({ error: "Bots Blocked" });

    if (req.body && req.body.payload) {
        const decrypted = decryptData(req.body.payload, STRICT_KEY);
        if (!decrypted) return res.status(400).json({ error: "Strict Decryption Failed." });
        
        const strBody = JSON.stringify(decrypted);
        if(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b)|(--\s*')/gi.test(strBody)) {
            return res.status(403).json({ error: "SQL Injection Blocked." });
        }
        req.body = decrypted;
    } else if(req.method === 'POST') {
        return res.status(400).json({ error: "Plaintext body completely denied." });
    }

    const originalJson = res.json;
    res.json = function(data) {
        if(data.error || data.raw) return originalJson.call(this, data);
        return originalJson.call(this, { raw: true, payload: encryptData(data, STRICT_KEY) });
    };
    next();
};

// ==========================================
// TELEGRAM CORE
// ==========================================
async function sendTgRequest(method, payload, fileData = null) {
    let endpointsToTry = stickyProxy ? [stickyProxy, ...TG_API_ENDPOINTS.filter(e => e !== stickyProxy)] : TG_API_ENDPOINTS;
    let lastErr = "";

    for (let endpoint of endpointsToTry) {
        try {
            let url = `${endpoint}/bot${TG_BOT_TOKEN}/${method}`;
            let res;
            if (fileData) {
                const form = new FormData();
                if (payload) for (let k in payload) form.append(k, payload[k]);
                form.append(fileData.fieldName, fileData.buffer, fileData.filename);
                res = await axios.post(url, form, { headers: form.getHeaders(), timeout: 35000, httpsAgent });
            } else {
                res = await axios.post(url, payload, { headers: {'Content-Type': 'application/json'}, timeout: 15000, httpsAgent });
            }
            if (res.status === 200) { stickyProxy = endpoint; return true; }
        } catch (e) {
            lastErr = e.code === 'ECONNRESET' ? 'Connection Reset' : (e.response ? `HTTP ${e.response.status}` : e.message);
        }
    }
    appendLog(`<span class="text-red-500 font-bold">⚠️ TG Communications Failed: ${lastErr}</span>`);
    return false;
}

async function sendTelegramScreenshot(base64Image, uid, name, isError = false) {
    if(!base64Image) return;
    const buffer = Buffer.from(base64Image, 'base64');
    let caption = `✅ Target Activated!\n\n👤 Name: ${name}\n🆔 UID: ${uid}\n⏱️ Time (PKT): ${getPKTTime()}`;
    if (isError) caption = `❌ Activation Error/Block!\n\n👤 Name: ${name}\n🆔 UID: ${uid}\n⏱️ Time (PKT): ${getPKTTime()}`;
    
    const sent = await sendTgRequest("sendPhoto", { chat_id: TG_CHAT_ID, caption }, { fieldName: 'photo', buffer, filename: 'ss.jpg' });
    if(sent) appendLog(`<span class="${isError ? 'text-red-500' : 'text-blue-500'}">📲 Screenshot delivered securely.</span>`);
}

async function sendTelegramText(text) {
    await sendTgRequest("sendMessage", { chat_id: TG_CHAT_ID, text, parse_mode: "Markdown" });
}

// ==========================================
// VERCEL EXTERNAL API ROUTES
// ==========================================
app.post('/api/auth/register', secureMiddleware, async (req, res) => {
    try {
        const { full_name, email, password, uid } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const { data: user, error } = await supabase.from('romeo_users').insert([{ full_name, email, password: hashedPassword }]).select().single();
        if (error) return res.json({ success: false, msg: "Email already exists!" });

        const { data: sub } = await supabase.from('romeo_subs').insert([{ user_id: user.id, uid: uid || null, plan_type: 'free' }]).select().single();
        res.json({ success: true, user_id: user.id, role: user.role });
    } catch(e) { res.status(500).json({ success: false, msg: "Server Error" }); }
});

app.post('/api/auth/login', secureMiddleware, async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data: user } = await supabase.from('romeo_users').select('*').eq('email', email).single();
        if (!user) return res.json({ success: false, msg: "User not found!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.json({ success: false, msg: "Invalid Credentials!" });

        const { data: sub } = await supabase.from('romeo_subs').select('*').eq('user_id', user.id).single();
        res.json({ success: true, user_id: user.id, role: user.role, plan: sub.plan_type, uid: sub.uid, expires_at: sub.expires_at });
    } catch(e) { res.status(500).json({ success: false, msg: "Server Error" }); }
});

app.post('/api/user/update_uid', secureMiddleware, async (req, res) => {
    try {
        const { user_id, new_uid } = req.body;
        const { data: sub } = await supabase.from('romeo_subs').update({ uid: new_uid }).eq('user_id', user_id).select().single();
        
        if(sub.plan_type !== 'free') {
            for (let oldUid in activeTimers) {
                if(activeTimers[oldUid].isSub && activeTimers[oldUid].user_id === user_id) {
                    clearTimeout(activeTimers[oldUid].timer);
                    delete activeTimers[oldUid];
                }
            }
            startPremiumCycle(sub.user_id, new_uid, "Premium Pro", sub.expires_at);
        }
        res.json({ success: true, msg: "UID Updated Successfully!" });
    } catch(e) { res.status(500).json({ success: false, msg: "Server Error" }); }
});

app.post('/api/engine/manual_start', secureMiddleware, async (req, res) => {
    try {
        const { user_id, uid } = req.body;
        const { data: sub } = await supabase.from('romeo_subs').select('*, romeo_users(full_name)').eq('user_id', user_id).single();
        if (sub.plan_type !== 'free') return res.json({ success: false, msg: "Pro users auto-activate!" });
        
        if(!executionQueue.includes(uid)) executionQueue.push(uid);
        processQueue();
        res.json({ success: true, msg: "Manual Cycle Started!" });
    } catch(e) { res.status(500).json({ success: false, msg: "Server Error" }); }
});

app.post('/api/admin/upgrade_sub', secureMiddleware, async (req, res) => {
    try {
        const { admin_id, user_id, plan_type, days } = req.body; 
        const { data: admin } = await supabase.from('romeo_users').select('role').eq('id', admin_id).single();
        if(admin.role !== 'admin') return res.json({ success: false, msg: "Unauthorized" });

        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + parseInt(days));

        const { data: sub } = await supabase.from('romeo_subs').update({ plan_type, expires_at: expires_at.toISOString() }).eq('user_id', user_id).select().single();
        if(sub.uid) startPremiumCycle(sub.user_id, sub.uid, "Premium User", sub.expires_at);
        res.json({ success: true, msg: "User Upgraded Successfully!" });
    } catch(e) { res.status(500).json({ success: false, msg: "Server Error" }); }
});

// ==========================================
// ENGINE QUEUE PROCESSOR
// ==========================================
async function processQueue() {
    if(currentRunningUid || executionQueue.length === 0) return;
    currentRunningUid = executionQueue.shift();
    try {
        let name = "Website User";
        if (activeTimers[currentRunningUid]) name = activeTimers[currentRunningUid].name;
        await executeEngineWithRetry(currentRunningUid, name);
    } finally {
        currentRunningUid = null;
        processQueue(); // Call next in queue
    }
}

// ==========================================
// NEW STRICT API ENDPOINTS (Website Client)
// ==========================================
app.post('/ping', strictSecureMiddleware, async (req, res) => {
    try {
        const { license_key, device_fingerprint } = req.body;
        const clientIp = req.ip || req.connection.remoteAddress;

        const { data: license } = await supabase.from('licenses').select('*').eq('license_key', license_key).single();
        if (!license) return res.json({ valid: false, msg: "License key is invalid" });

        if (new Date(license.expires_at).getTime() < Date.now()) {
            return res.json({ valid: false, msg: "License timeline has expired" });
        }

        if (license.device_fingerprint && license.device_fingerprint !== device_fingerprint) {
            return res.json({ valid: false, msg: "License key is locked to another device!" });
        }

        if (!license.device_fingerprint) {
            await supabase.from('licenses').update({ device_fingerprint, ip_address: clientIp }).eq('license_key', license_key);
        } else if (license.ip_address !== clientIp) {
            await supabase.from('licenses').update({ ip_address: clientIp }).eq('license_key', license_key);
        }

        const remainingMs = new Date(license.expires_at).getTime() - Date.now();
        return res.json({ valid: true, plan_type: license.plan_type, allowed_uids: license.allowed_uids, uids: license.uids, time_remaining: remainingMs });
    } catch(e) { res.status(500).json({ error: "Ping Processing Error" }) }
});

app.post('/ch_uid', strictSecureMiddleware, async (req, res) => {
    try {
        const { license_key, device_fingerprint, old_uid, new_uid } = req.body;
        const { data: license } = await supabase.from('licenses').select('*').eq('license_key', license_key).single();

        if (!license || license.device_fingerprint !== device_fingerprint) {
            return res.json({ success: false, msg: "Device/Key Mismatch Unauthorized" });
        }

        let updatedUids = [...license.uids || []];
        const idx = updatedUids.indexOf(old_uid);
        if (idx > -1) updatedUids[idx] = new_uid;
        else if (updatedUids.length < license.allowed_uids) updatedUids.push(new_uid);
        else return res.json({ success: false, msg: "Super User limit reached" });

        await supabase.from('licenses').update({ uids: updatedUids }).eq('license_key', license_key);
        
        if (activeTimers[old_uid]) { clearTimeout(activeTimers[old_uid].timer); delete activeTimers[old_uid]; }
        startPremiumCycle(license_key, new_uid, license.plan_type, license.expires_at, true); 
        
        return res.json({ success: true, msg: "UID Swapped Successfully" });
    } catch(e) { res.status(500).json({ error: "UID Change Processing Error" }) }
});

app.post('/api/uid_status', strictSecureMiddleware, async (req, res) => {
    try {
        const { uid } = req.body;
        if(activeTimers[uid]) {
            const t = activeTimers[uid];
            if(t.isSub) {
                const diff = t.expires_at - Date.now();
                return res.json({ 
                    active: true, plan: "Premium", time_left: diff, 
                    msg: "Premium Plan Active. System will auto-renew before expiry."
                });
            } else if(t.isFree) {
                const timeLeft = t.freeExpiry - Date.now();
                if(timeLeft <= 0) return res.json({ active: false, msg: "Free limit reached." });
                return res.json({ 
                    active: true, plan: "Free User", time_left: timeLeft, 
                    msg: `Free User: 3 Ghante ke liye activate hui hai, automatic ${Math.floor(timeLeft/60000)} mins tak khud active rakhega.` 
                });
            } else {
                return res.json({ 
                    active: true, plan: "VIP Node", time_left: 999999999, 
                    msg: "Dashboard Node: Hamesha activate rahega. Jab time khatam hone wala hoga, us se pehle hi khud-ba-khud renew ho jayega." 
                });
            }
        }
        return res.json({ active: false });
    } catch(e) { res.status(500).json({ error: "Status Error" }) }
});

['/step1', '/step2', '/step3', '/step4', '/step5'].forEach((path, idx) => {
    app.post(path, strictSecureMiddleware, async (req, res) => {
        try {
            const { uid, cookies_valid } = req.body;
            if(!cookies_valid) return res.json({ success: false, msg: "Cookies/Headers verification failed." });
            
            if (path === '/step1') {
                const { data: freeUser } = await supabase.from('free_users_track').select('*').eq('uid', uid).single();
                if (freeUser) {
                    if (freeUser.activation_count >= 2) return res.json({ success: false, msg: "Free quota reached. Purchase Premium." });
                    await supabase.from('free_users_track').update({ activation_count: freeUser.activation_count + 1, last_activated: new Date().toISOString() }).eq('uid', uid);
                } else {
                    await supabase.from('free_users_track').insert([{ uid, activation_count: 1, last_activated: new Date().toISOString() }]);
                }

                if (currentRunningUid === uid || engineStatus[uid]) {
                    return res.json({ success: true, step: idx + 2, msg: "Engine already running for you." });
                }

                if(!activeTimers[uid]) {
                    startUIDCycle(uid, "Free Website User", 40, true, false, true);
                }
                
                if (currentRunningUid && currentRunningUid !== uid) {
                    if(!executionQueue.includes(uid)) executionQueue.push(uid);
                    const pos = executionQueue.indexOf(uid) + 1;
                    return res.json({ success: false, waiting: true, msg: `System Busy! Target currently active. You are #${pos} in queue. Please wait.` });
                }
                
                if(!executionQueue.includes(uid)) {
                    executionQueue.push(uid);
                    processQueue();
                }
            }

            return res.json({ success: true, step: idx + 2, msg: "Engine Sequence processing." });
        } catch(e) { res.status(500).json({ error: "Step Processor Failed" }) }
    });
});

app.post('/api/auth/destroy', (req, res) => {
    req.session = null;
    res.json({ success: true });
});

function startPremiumCycle(user_id_or_key, uid, name, expires_at, isNewLicenseSys = false) {
    if(!uid) return;
    const expiryDate = new Date(expires_at).getTime();
    if (Date.now() > expiryDate) {
        if (activeTimers[uid]) delete activeTimers[uid];
        return;
    }
    if (activeTimers[uid]) clearTimeout(activeTimers[uid].timer);
    activeTimers[uid] = { isSub: true, user_id: user_id_or_key, name, expires_at: expiryDate, timer: null, autoActivate: true, intervalMins: 40, nextRun: Date.now(), isNewLicenseSys };
    
    if(!executionQueue.includes(uid)) executionQueue.push(uid);
    processQueue();
}

// ==========================================
// iOS LIQUID GLASS UI (THEME OVERHAUL)
// ==========================================
const uiHead = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
    <style>
        :root { 
            --bg-color: #000000; 
            --text-color: #ffffff; 
            --glass-bg: rgba(25, 25, 25, 0.6); 
            --panel-glow: rgba(0, 0, 0, 0.4); 
            --input-bg: rgba(255, 255, 255, 0.08); 
            --input-border: rgba(255, 255, 255, 0.15); 
            --primary: #0a84ff; /* iOS Dark Blue */
            --secondary: #5e5ce6; /* iOS Indigo */
        }
        body.light-mode { 
            --bg-color: #f2f2f7; 
            --text-color: #000000; 
            --glass-bg: rgba(255, 255, 255, 0.75); 
            --panel-glow: rgba(0, 0, 0, 0.05); 
            --input-bg: rgba(0, 0, 0, 0.04); 
            --input-border: rgba(0, 0, 0, 0.1); 
            --primary: #007aff; /* iOS Blue */
            --secondary: #5856d6; /* iOS Indigo */
        }
        body { 
            background-color: var(--bg-color); 
            color: var(--text-color); 
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            overflow-x: hidden; 
            transition: background 0.4s, color 0.4s; 
            -webkit-font-smoothing: antialiased;
        }
        
        .orb { position: fixed; border-radius: 50%; filter: blur(120px); opacity: 0.4; z-index: -1; pointer-events: none; }
        .orb-blue { width: 50vw; height: 50vw; background: var(--primary); top: -10%; left: -10%; }
        .orb-purple { width: 40vw; height: 40vw; background: var(--secondary); bottom: -10%; right: -10%; }
        
        .glass-panel { 
            background: var(--glass-bg); 
            backdrop-filter: blur(40px); 
            -webkit-backdrop-filter: blur(40px); 
            border: 1px solid var(--input-border); 
            box-shadow: 0 8px 32px var(--panel-glow); 
            border-radius: 28px; 
            transition: transform 0.3s ease, box-shadow 0.3s ease; 
        }
        
        .text-gradient { 
            background: linear-gradient(135deg, var(--primary), var(--secondary)); 
            -webkit-background-clip: text; 
            -webkit-text-fill-color: transparent; 
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.3); border-radius: 10px; }
        
        input, select { 
            background: var(--input-bg); 
            border: 1px solid var(--input-border); 
            color: var(--text-color); 
            transition: 0.3s; 
            border-radius: 16px; 
            font-weight: 500;
        }
        input:focus, select:focus { 
            border-color: var(--primary); 
            outline: none; 
            box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.3); 
        }
        
        .menu-open { transform: translateX(0) scale(1) !important; opacity: 1 !important; pointer-events: auto !important; }
        .btn-hover { transition: all 0.2s ease-in-out; border-radius: 20px; font-weight: 600; }
        .btn-hover:hover { transform: scale(1.03); opacity: 0.9; }
    </style>
    <script>
        document.addEventListener("DOMContentLoaded", () => {
            gsap.registerPlugin(ScrollTrigger);
            gsap.to(".orb-blue", { x: 80, y: 40, duration: 10, repeat: -1, yoyo: true, ease: "sine.inOut" });
            gsap.to(".orb-purple", { x: -80, y: -40, duration: 8, repeat: -1, yoyo: true, ease: "sine.inOut" });
            gsap.from(".animate-box", { y: 20, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" });
            
            if(localStorage.getItem('theme') === 'light') toggleTheme(true);
            const cachedAvatar = localStorage.getItem('avatar_cache');
            if(cachedAvatar && document.getElementById('admin-avatar')) document.getElementById('admin-avatar').src = cachedAvatar;
            loadAvatar();
        });

        function toggleTheme(forceLight = false) {
            const isLight = forceLight || !document.body.classList.contains('light-mode');
            if(isLight) {
                document.body.classList.add('light-mode');
                document.getElementById('theme-icon')?.classList.replace('fa-moon', 'fa-sun');
                localStorage.setItem('theme', 'light');
            } else {
                document.body.classList.remove('light-mode');
                document.getElementById('theme-icon')?.classList.replace('fa-sun', 'fa-moon');
                localStorage.setItem('theme', 'dark');
            }
        }

        async function loadAvatar() {
            try {
                const res = await fetch('/api/avatar'); 
                const data = await res.json();
                if(data.url) {
                    localStorage.setItem('avatar_cache', data.url);
                    if(document.getElementById('admin-avatar')) document.getElementById('admin-avatar').src = data.url;
                }
            } catch(e) {}
        }
        
        function showSysModal(opts) {
            const m = document.getElementById('sys-modal');
            const b = document.getElementById('sys-modal-box');
            document.getElementById('sys-modal-title').innerText = opts.title || 'Notice';
            document.getElementById('sys-modal-msg').innerHTML = opts.msg || '';
            
            const inp = document.getElementById('sys-modal-input');
            if(opts.type === 'prompt') { inp.classList.remove('hidden'); inp.value = opts.default || ''; inp.focus(); } 
            else { inp.classList.add('hidden'); }
            
            const btnContainer = document.getElementById('sys-modal-btns');
            btnContainer.innerHTML = '';
            
            if(opts.type === 'confirm') {
                btnContainer.innerHTML = \`<button class="px-6 py-2.5 rounded-xl bg-gray-500/20 text-gray-500 hover:bg-gray-500/40 transition font-semibold" onclick="closeSysModal(false)">Cancel</button>
                                          <button class="px-6 py-2.5 rounded-xl bg-blue-500 text-white transition font-semibold shadow-md" onclick="closeSysModal(true)">Confirm</button>\`;
            } else if(opts.type === 'prompt') {
                btnContainer.innerHTML = \`<button class="px-6 py-2.5 rounded-xl bg-gray-500/20 text-gray-500 hover:bg-gray-500/40 transition font-semibold" onclick="closeSysModal(null)">Cancel</button>
                                          <button class="px-6 py-2.5 rounded-xl bg-blue-500 text-white transition font-semibold shadow-md" onclick="closeSysModal(document.getElementById('sys-modal-input').value)">Save</button>\`;
            } else {
                btnContainer.innerHTML = \`<button class="px-8 py-2.5 rounded-xl bg-blue-500 text-white transition font-semibold shadow-md w-full" onclick="closeSysModal('ok')">OK</button>\`;
            }
            
            window.sysModalCallback = opts.cb || function(){};
            m.classList.remove('hidden');
            setTimeout(() => { m.classList.remove('opacity-0'); b.classList.remove('scale-95'); }, 10);
        }
        function closeSysModal(val) {
            const m = document.getElementById('sys-modal');
            const b = document.getElementById('sys-modal-box');
            m.classList.add('opacity-0'); b.classList.add('scale-95');
            setTimeout(() => { m.classList.add('hidden'); if(window.sysModalCallback) window.sysModalCallback(val); }, 300);
        }
    </script>
    
    <div id="sys-modal" class="fixed inset-0 bg-black/40 z-[300] hidden flex items-center justify-center backdrop-blur-md opacity-0 transition-opacity duration-300">
        <div class="glass-panel p-8 max-w-sm w-[90%] text-center transform scale-95 transition-transform duration-300 shadow-2xl" id="sys-modal-box">
            <h3 id="sys-modal-title" class="text-xl font-bold mb-2 text-gradient"></h3>
            <p id="sys-modal-msg" class="text-sm opacity-80 mb-6 leading-relaxed"></p>
            <input type="text" id="sys-modal-input" class="hidden w-full p-4 mb-6 text-center border focus:border-blue-500 transition rounded-xl" autocomplete="off" />
            <div class="flex gap-3 justify-center" id="sys-modal-btns"></div>
        </div>
    </div>
`;

const getOrbs = () => `<div class="orb orb-blue"></div><div class="orb orb-purple"></div>`;

const getFloatingHeader = (title, isAdmin) => `
    <div class="fixed top-4 w-full flex justify-center z-[110] px-4 pointer-events-none">
        <div class="flex justify-between items-center w-full max-w-5xl gap-2 md:gap-4 pointer-events-auto">
            
            <button ${isAdmin ? `onclick="document.getElementById('avatar-upload').click()"` : ''} class="w-12 h-12 md:w-14 md:h-14 flex-shrink-0 rounded-[22px] glass-panel overflow-hidden flex items-center justify-center relative group shadow-sm border border-white/10">
                <img id="admin-avatar" src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" class="w-full h-full object-cover">
                ${isAdmin ? `<div class="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center backdrop-blur-sm"><i class="fa-solid fa-camera text-white"></i></div>` : ''}
            </button>
            ${isAdmin ? `<input type="file" id="avatar-upload" class="hidden" accept="image/*" onchange="uploadAvatar(this)">` : ''}
            
            <div class="flex-1 max-w-md glass-panel h-12 md:h-14 flex items-center justify-center overflow-hidden px-4 shadow-sm border border-white/10">
                <span class="font-bold text-sm md:text-lg tracking-wide text-gradient uppercase truncate">${title}</span>
            </div>

            <button onclick="document.getElementById('overlay-menu').classList.toggle('menu-open')" class="w-12 h-12 md:w-14 md:h-14 flex-shrink-0 rounded-[22px] glass-panel flex items-center justify-center hover:opacity-80 transition shadow-sm border border-white/10 cursor-pointer z-50">
                <i class="fa-solid fa-bars-staggered text-lg md:text-xl opacity-80"></i>
            </button>
        </div>
    </div>
    
    <div id="overlay-menu" class="fixed top-24 right-4 md:right-[10%] w-64 glass-panel z-[100] transform scale-95 opacity-0 pointer-events-none transition-all duration-300 ease-out flex flex-col p-4 border border-white/10 shadow-2xl">
        <button onclick="document.getElementById('overlay-menu').classList.remove('menu-open')" class="absolute top-4 right-4 text-xl opacity-50 hover:opacity-100 transition"><i class="fa-solid fa-xmark"></i></button>
        <h4 class="font-bold text-xs mb-3 border-b border-white/10 pb-2 uppercase tracking-wider opacity-60">Menu</h4>
        
        <div class="flex flex-col gap-1 text-sm font-medium">
            <a href="/" class="p-3 rounded-xl hover:bg-white/10 flex items-center gap-3 transition"><i class="fa-solid fa-network-wired w-5 text-blue-500"></i> Network</a>
            
            ${isAdmin ? `
            <a href="/admin" class="p-3 rounded-xl hover:bg-white/10 flex items-center gap-3 transition"><i class="fa-solid fa-terminal w-5 text-indigo-500"></i> Dashboard</a>
            <a href="/logs" class="p-3 rounded-xl hover:bg-white/10 flex items-center gap-3 transition"><i class="fa-solid fa-microchip w-5 text-purple-500"></i> Logs</a>
            <a href="/server_settings" class="p-3 rounded-xl hover:bg-white/10 flex items-center gap-3 transition"><i class="fa-solid fa-shield-halved w-5 text-cyan-500"></i> Firewall</a>
            <a href="/stats" class="p-3 rounded-xl hover:bg-white/10 flex items-center gap-3 transition"><i class="fa-solid fa-chart-pie w-5 text-teal-500"></i> Stats</a>
            ` : `
            <a href="/login" class="p-3 rounded-xl hover:bg-white/10 flex items-center gap-3 transition"><i class="fa-solid fa-right-to-bracket w-5 text-blue-500"></i> Admin Login</a>
            `}
            
            <div class="p-3 rounded-xl hover:bg-white/10 flex items-center gap-3 transition cursor-pointer" onclick="toggleTheme()"><i class="fa-solid fa-moon w-5 opacity-80" id="theme-icon"></i> Theme</div>
            
            ${isAdmin ? `<a href="/logout" class="p-3 rounded-xl text-red-500 hover:bg-red-500/10 flex items-center gap-3 mt-2 transition"><i class="fa-solid fa-power-off w-5"></i> Logout</a>` : ''}
        </div>
    </div>
    
    <script>
        async function uploadAvatar(input) {
            if(input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const base64 = e.target.result;
                    document.getElementById('admin-avatar').src = base64;
                    localStorage.setItem('avatar_cache', base64);
                    await fetch('/api/avatar', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ image: base64 }) });
                };
                reader.readAsDataURL(input.files[0]);
            }
        }
    </script>
`;

// ==========================================
// NEW ROUTE: SYSTEM STATS (UPTIME, CPU, RAM, STORAGE)
// ==========================================
app.get('/api/system/stats_data', (req, res) => {
    if(!req.session.isAdmin) return res.status(403).json({});
    
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = ((usedMem / totalMem) * 100).toFixed(1);

    const uptime = os.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown CPU';
    
    let storage = 'N/A';
    try {
        if(IS_TERMUX) storage = execSync('df -h /data | awk "NR==2 {print \\$3 \\" / \\" \\$2}"').toString().trim();
        else storage = execSync('df -h / | awk "NR==2 {print \\$3 \\" / \\" \\$2}"').toString().trim();
    } catch(e) {}
    
    let gpu = 'Integrated / N/A';
    if(IS_TERMUX) {
        try {
            const glinfo = execSync('getprop ro.hardware.egl || echo "Mali/Adreno"').toString().trim();
            gpu = glinfo || 'Mali/Adreno';
        } catch(e){}
    } else {
        gpu = "Server Node";
    }

    res.json({
        uptime: `${hours}h ${minutes}m`,
        cpu: `${cpuModel} (${cpus.length} Cores)`,
        ram: `${(usedMem / 1e9).toFixed(2)}GB / ${(totalMem / 1e9).toFixed(2)}GB (${memUsage}%)`,
        storage: storage,
        gpu: gpu
    });
});

app.get('/stats', (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/login');
    res.send(`
        <!DOCTYPE html>
        <html lang="en"><head><title>System Stats</title>${uiHead}</head>
        <body class="min-h-screen pt-28 p-4 flex flex-col items-center">
            ${getOrbs()}
            ${getFloatingHeader('System Resources', true)}
            <div class="w-full max-w-5xl mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 animate-box">
                <div class="glass-panel p-8 flex flex-col items-center text-center">
                    <i class="fa-solid fa-microchip text-4xl text-blue-500 mb-4 opacity-90"></i>
                    <h3 class="font-semibold text-lg mb-2 opacity-80 uppercase tracking-wide">CPU Usage</h3>
                    <p id="cpu-stat" class="font-mono text-base opacity-70 animate-pulse">Loading...</p>
                </div>
                <div class="glass-panel p-8 flex flex-col items-center text-center">
                    <i class="fa-solid fa-memory text-4xl text-indigo-500 mb-4 opacity-90"></i>
                    <h3 class="font-semibold text-lg mb-2 opacity-80 uppercase tracking-wide">RAM Usage</h3>
                    <p id="ram-stat" class="font-mono text-base opacity-70 animate-pulse">Loading...</p>
                </div>
                <div class="glass-panel p-8 flex flex-col items-center text-center">
                    <i class="fa-solid fa-hard-drive text-4xl text-purple-500 mb-4 opacity-90"></i>
                    <h3 class="font-semibold text-lg mb-2 opacity-80 uppercase tracking-wide">Storage</h3>
                    <p id="storage-stat" class="font-mono text-base opacity-70 animate-pulse">Loading...</p>
                </div>
                <div class="glass-panel p-8 flex flex-col items-center text-center">
                    <i class="fa-solid fa-gamepad text-4xl text-cyan-500 mb-4 opacity-90"></i>
                    <h3 class="font-semibold text-lg mb-2 opacity-80 uppercase tracking-wide">GPU / Renderer</h3>
                    <p id="gpu-stat" class="font-mono text-base opacity-70 animate-pulse">Loading...</p>
                </div>
                <div class="glass-panel p-8 flex flex-col items-center text-center md:col-span-2">
                    <i class="fa-solid fa-clock text-4xl text-teal-500 mb-4 opacity-90"></i>
                    <h3 class="font-semibold text-lg mb-2 opacity-80 uppercase tracking-wide">System Uptime</h3>
                    <p id="uptime-stat" class="font-mono text-base opacity-70 animate-pulse">Loading...</p>
                </div>
            </div>
            <script>
                async function loadStats() {
                    const res = await fetch('/api/system/stats_data');
                    const data = await res.json();
                    document.getElementById('cpu-stat').innerText = data.cpu;
                    document.getElementById('ram-stat').innerText = data.ram;
                    document.getElementById('storage-stat').innerText = data.storage;
                    document.getElementById('gpu-stat').innerText = data.gpu;
                    document.getElementById('uptime-stat').innerText = data.uptime;
                    
                    document.querySelectorAll('.animate-pulse').forEach(el => el.classList.remove('animate-pulse'));
                }
                loadStats();
                setInterval(loadStats, 5000);
            </script>
        </body></html>
    `);
});

// ==========================================
// ADMIN DASHBOARD ROUTES
// ==========================================
app.get('/', (req, res) => {
    const isAdmin = req.session.isAdmin;
    res.send(`
        <!DOCTYPE html>
        <html lang="en"><head><title>Network Live</title>${uiHead}</head>
        <body class="min-h-screen pt-28 p-4 flex flex-col items-center">
            ${getOrbs()}
            ${getFloatingHeader('Network Live', isAdmin)}
            
            <div class="w-full max-w-5xl glass-panel animate-box p-6 md:p-8 mt-4 border-white/10">
                <h3 class="font-bold mb-6 flex items-center text-lg tracking-wide opacity-90 uppercase">
                    <span class="w-2.5 h-2.5 rounded-full bg-blue-500 mr-3 animate-pulse shadow-[0_0_10px_rgba(10,132,255,0.8)]"></span> Active Nodes
                </h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead><tr class="opacity-50 text-xs uppercase tracking-wider border-b border-white/10"><th class="pb-3 pl-2">Node ID</th><th class="pb-3">Execution Time</th><th class="pb-3 text-center">Action</th></tr></thead>
                        <tbody id="status-body"><tr><td colspan="3" class="text-center py-10 opacity-50"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Pinging Network...</td></tr></tbody>
                    </table>
                </div>
            </div>

            ${isAdmin ? `
            <div id="preview-modal" class="fixed inset-0 bg-black/80 z-[200] hidden flex flex-col items-center justify-center opacity-0 transition-opacity duration-300 backdrop-blur-xl">
                <div class="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
                    <div class="flex items-center gap-3 bg-white/10 px-5 py-2.5 rounded-full border border-white/20 backdrop-blur-md">
                        <span class="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></span>
                        <span class="text-sm font-semibold tracking-wide">Live Feed: <span id="modal-uid" class="text-blue-400 ml-1"></span></span>
                    </div>
                    <button onclick="closePreview()" class="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-xl transition-all z-50 border border-white/10">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="relative w-full max-w-[360px] h-[640px] max-h-[85vh] rounded-[32px] overflow-hidden border-4 border-black shadow-2xl bg-black flex items-center justify-center">
                    <img id="live-screen" src="" class="absolute inset-0 w-full h-full object-cover hidden" />
                    <div id="no-signal" class="opacity-50 flex flex-col items-center z-10">
                        <i class="fa-solid fa-satellite-dish text-5xl mb-4 animate-pulse"></i>
                        <span class="tracking-widest text-sm font-semibold uppercase">Connecting...</span>
                    </div>
                </div>
            </div>` : ''}

            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                const isAdmin = ${isAdmin ? 'true' : 'false'};
                let currentWatch = null;

                socket.on('update_ui', function(data) {
                    const tbody = document.getElementById('status-body');
                    const keys = Object.keys(data);
                    if(keys.length === 0) return tbody.innerHTML = '<tr><td colspan="3" class="text-center py-10 opacity-40"><i class="fa-solid fa-inbox text-2xl mb-3 block"></i>No active nodes.</td></tr>';
                    
                    let html = '';
                    for (let uid in data) {
                        let info = data[uid];
                        
                        let previewBtn = '<button class="bg-white/5 border border-white/10 opacity-50 w-10 h-10 rounded-full flex items-center justify-center mx-auto cursor-not-allowed" title="Root Access Required"><i class="fa-solid fa-lock text-xs"></i></button>';
                        
                        if (isAdmin) {
                            previewBtn = info.isRunning 
                                ? \`<button onclick="openPreview('\${uid}')" class="bg-blue-500/20 text-blue-500 border border-blue-500/30 w-10 h-10 rounded-full transition-all flex items-center justify-center mx-auto shadow-sm animate-pulse btn-hover"><i class="fa-solid fa-eye text-xs"></i></button>\`
                                : \`<button class="bg-white/5 border border-white/10 opacity-50 w-10 h-10 rounded-full flex items-center justify-center mx-auto cursor-not-allowed"><i class="fa-solid fa-eye-slash text-xs"></i></button>\`;
                        }

                        let statusBadge = !info.autoActivate ? '<span class="text-red-500 text-[9px] ml-2 font-bold px-2 py-0.5 bg-red-500/10 border border-red-500/30 rounded-full uppercase">Halted</span>' : '';

                        html += '<tr class="border-b border-white/5 hover:bg-white/5 transition-colors">' +
                            '<td class="py-4 pl-2 font-semibold text-base opacity-90">' + info.name + statusBadge + '<br><span class="text-[11px] opacity-60 bg-white/5 px-2.5 py-0.5 rounded-md mt-1 inline-block font-mono">' + uid + '</span></td>' +
                            '<td class="py-4 font-mono font-medium text-sm opacity-80">' + info.remaining + '</td>' +
                            '<td class="py-4">' + previewBtn + '</td>' +
                        '</tr>';
                    }
                    tbody.innerHTML = html;
                });

                ${isAdmin ? `
                socket.on('live_frame', function(data) {
                    if(currentWatch === data.uid) {
                        document.getElementById('no-signal').classList.add('hidden');
                        const img = document.getElementById('live-screen');
                        img.classList.remove('hidden');
                        img.src = 'data:image/jpeg;base64,' + data.frame;
                    }
                });

                function openPreview(uid) {
                    currentWatch = uid;
                    document.getElementById('modal-uid').innerText = uid;
                    const modal = document.getElementById('preview-modal');
                    modal.classList.remove('hidden');
                    setTimeout(() => modal.classList.remove('opacity-0'), 10);
                    socket.emit('start_watch', {uid: uid, token: 'session'});
                }

                function closePreview() {
                    const modal = document.getElementById('preview-modal');
                    modal.classList.add('opacity-0');
                    setTimeout(() => modal.classList.add('hidden'), 300);
                    socket.emit('stop_watch');
                    currentWatch = null;
                }
                ` : ''}
            </script>
        </body></html>
    `);
});

app.get('/login', (req, res) => {
    if(req.session.isAdmin) return res.redirect('/admin');
    res.send(`
        <!DOCTYPE html>
        <html lang="en"><head><title>Secure Login</title>${uiHead}</head>
        <body class="flex items-center justify-center min-h-screen relative">
            ${getOrbs()}
            <div id="auth-panel" class="glass-panel animate-box p-10 w-[90%] max-w-md text-center z-10 border border-white/20 shadow-xl">
                <div class="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                    <i class="fa-solid fa-fingerprint text-4xl text-white"></i>
                </div>
                <h2 class="text-2xl font-bold mb-8 tracking-wide uppercase opacity-90">Authentication</h2>
                <form action="/login" method="POST" class="flex flex-col gap-4">
                    <input type="password" name="password" placeholder="Passphrase" required class="w-full p-4 text-center tracking-widest bg-white/5 border-white/10"/>
                    <button type="submit" class="btn-hover w-full p-4 font-bold uppercase tracking-wide bg-blue-500 text-white shadow-md">Unlock <i class="fa-solid fa-arrow-right ml-1"></i></button>
                </form>
                <div class="mt-6 text-xs font-semibold opacity-60 cursor-pointer hover:opacity-100 transition uppercase tracking-wider" onclick="showForgot()">Recover Access</div>
            </div>

            <div id="forgot-panel" class="glass-panel p-10 w-[90%] max-w-md text-center z-10 hidden absolute border border-white/20 shadow-xl">
                <h2 class="text-xl font-bold mb-4 tracking-wide uppercase opacity-90">Recovery Mode</h2>
                <p class="text-xs opacity-60 mb-6">OTP will be routed to Master Comms.</p>
                <button onclick="sendOTP()" id="otp-btn" class="w-full p-4 mb-4 rounded-xl font-bold uppercase tracking-wide bg-white/10 hover:bg-white/20 transition">Send Code</button>
                <form id="reset-form" class="hidden flex flex-col gap-4" onsubmit="event.preventDefault(); resetPass();">
                    <input type="text" id="otp-code" placeholder="Enter OTP" required class="w-full p-4 text-center tracking-widest font-mono bg-white/5 border-white/10"/>
                    <input type="password" id="new-pass" placeholder="New Passphrase" required class="w-full p-4 text-center tracking-widest bg-white/5 border-white/10"/>
                    <button type="submit" class="btn-hover w-full p-4 font-bold uppercase tracking-wide bg-indigo-500 text-white shadow-md">Update Key</button>
                </form>
                <div class="mt-6 text-xs font-semibold opacity-60 cursor-pointer hover:text-red-400 hover:opacity-100 transition uppercase tracking-wider" onclick="hideForgot()"><i class="fa-solid fa-arrow-left"></i> Back</div>
            </div>
            
            <script>
                if(localStorage.getItem('authErr')) {
                    showSysModal({title: "Access Denied", msg: "Invalid passphrase provided.", type: "alert"});
                    localStorage.removeItem('authErr');
                }
                function showForgot() { document.getElementById('auth-panel').classList.add('hidden'); document.getElementById('forgot-panel').classList.remove('hidden'); }
                function hideForgot() { document.getElementById('forgot-panel').classList.add('hidden'); document.getElementById('auth-panel').classList.remove('hidden'); }
                
                async function sendOTP() {
                    document.getElementById('otp-btn').innerText = "Sending...";
                    await fetch('/api/auth/forgot', {method: 'POST'});
                    document.getElementById('otp-btn').classList.add('hidden');
                    document.getElementById('reset-form').classList.remove('hidden');
                }
                
                async function resetPass() {
                    const otp = document.getElementById('otp-code').value;
                    const pass = document.getElementById('new-pass').value;
                    const res = await fetch('/api/auth/reset', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({otp, pass})});
                    const data = await res.json();
                    if(data.success) { 
                        showSysModal({title:"Success", msg:"Key updated successfully.", cb: () => window.location.reload() });
                    } else { 
                        showSysModal({title:"Error", msg:"Invalid OTP."}); 
                    }
                }
            </script>
        </body></html>
    `);
});

app.post('/login', (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) { req.session.isAdmin = true; res.redirect('/admin'); } 
    else { res.send(`<script>localStorage.setItem('authErr', '1'); window.location.href='/login';</script>`); }
});

app.get('/logout', (req, res) => { req.session = null; res.redirect('/'); });

app.post('/api/auth/forgot', async (req, res) => {
    resetOTP = Math.floor(1000 + Math.random() * 9000).toString();
    await sendTgRequest("sendMessage", { chat_id: TG_CHAT_ID, text: `🔐 *ROMEO ADMIN SECURITY*\n\nYour Password Reset OTP is: \`${resetOTP}\``, parse_mode: "Markdown" });
    res.json({success: true});
});

app.post('/api/auth/reset', async (req, res) => {
    if(req.body.otp === resetOTP && resetOTP !== null) {
        ADMIN_PASSWORD = req.body.pass;
        await supabase.from('settings').upsert({ key: 'admin_pass', value: ADMIN_PASSWORD });
        resetOTP = null;
        res.json({success: true});
    } else res.json({success: false});
});

app.get('/admin', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/login');

    const { data: users } = await supabase.from('targets').select('*');
    const { data: licenses } = await supabase.from('licenses').select('*');
    
    let usersHtml = '';
    if (users && users.length > 0) {
        users.forEach(u => {
            let activeColor = u.auto_activate ? 'text-blue-500 border-blue-500/30 bg-blue-500/10' : 'text-red-500 border-red-500/30 bg-red-500/5';
            let activeIcon = u.auto_activate ? 'fa-toggle-on' : 'fa-toggle-off';

            usersHtml += `<div class="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 mb-3 transition hover:bg-white/10">
                <div class="text-center md:text-left text-inherit">
                    <b class="text-base font-semibold opacity-90"><i class="fa-solid fa-server opacity-50 mr-2 text-sm"></i>${u.name}</b> <br> 
                    <div class="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1.5">
                        <span class="text-[10px] font-mono opacity-70 bg-black/20 px-2 py-1 rounded border border-white/5"><i class="fa-solid fa-hashtag mr-1"></i>${u.uid}</span>
                        <span class="text-[10px] font-medium opacity-80 bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded border border-indigo-500/20 cursor-pointer hover:bg-indigo-500/40 transition flex items-center" onclick="editTime('${u.uid}', ${u.interval_mins})">
                            <i class="fa-regular fa-clock mr-1"></i>${u.interval_mins}m <i class="fa-solid fa-pen ml-1.5 opacity-50"></i>
                        </span>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button class="border ${activeColor} px-4 py-2.5 rounded-xl transition font-semibold text-xs flex items-center btn-hover hover:opacity-80" onclick="toggleAuto('${u.uid}', ${!u.auto_activate})"><i class="fa-solid ${activeIcon} mr-1.5 text-lg"></i> Auto</button>
                    <button class="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded-xl transition btn-hover" onclick="delUser('${u.id}', '${u.uid}')"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>`;
        });
    }

    let licensesHtml = '';
    if (licenses && licenses.length > 0) {
        licenses.forEach(l => {
            const timeDiff = new Date(l.expires_at).getTime() - Date.now();
            const daysLeft = timeDiff > 0 ? (timeDiff / (1000 * 60 * 60 * 24)).toFixed(1) + 'd' : '<span class="text-red-500">Exp</span>';
            const bindInfo = l.ip_address ? `<span class="opacity-80 font-mono text-[10px] text-blue-400" title="${l.device_fingerprint}">${l.ip_address}</span>` : '<span class="opacity-50 text-[10px]">Unbound</span>';
            licensesHtml += `<div class="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col gap-2 mb-3 hover:bg-white/10 transition">
                <div class="flex justify-between items-center"><b class="font-mono text-sm opacity-90">${l.license_key}</b> <span class="uppercase text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded-full border border-white/20 opacity-80">${l.plan_type}</span></div>
                <div class="flex justify-between text-[11px] opacity-60"><span>Remaining: ${daysLeft}</span> <span>IP: ${bindInfo}</span></div>
                <div class="flex gap-2 mt-2 justify-end">
                    <button onclick="flushDevice('${l.license_key}')" class="bg-white/5 border border-white/10 opacity-70 px-3 py-1.5 rounded-lg text-xs hover:bg-white/20 hover:opacity-100 transition" title="Logout Device"><i class="fa-solid fa-unlock text-[10px]"></i> Flush</button>
                    <button onclick="delLicense('${l.license_key}')" class="bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-1.5 rounded-lg text-xs hover:bg-red-500 hover:text-white transition"><i class="fa-solid fa-trash text-[10px]"></i></button>
                </div>
            </div>`;
        });
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="en"><head><title>Dashboard</title>${uiHead}</head>
        <body class="min-h-screen pt-28 p-4 flex flex-col items-center">
            ${getOrbs()}
            ${getFloatingHeader('Control Center', true)}
            
            <div class="w-full max-w-7xl mt-4">
                <div class="flex justify-start items-center mb-6 pl-2 animate-box">
                    <button onclick="changeAdminPass()" class="bg-white/10 border border-white/20 hover:bg-white/20 px-5 py-2.5 rounded-full font-semibold shadow-sm transition text-xs flex items-center">
                        <i class="fa-solid fa-key mr-2 opacity-70"></i> Update Passphrase
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="flex flex-col gap-6">
                        <div class="glass-panel animate-box p-6 h-fit">
                            <h3 class="text-sm font-bold mb-4 uppercase tracking-wider opacity-80 border-b border-white/10 pb-2"><i class="fa-solid fa-plus-circle mr-2 opacity-50"></i>Inject Node</h3>
                            <input type="text" id="name" placeholder="Alias Name" class="w-full p-3 mb-3 text-center outline-none bg-white/5 border border-white/10 text-sm" />
                            <input type="text" id="uid" placeholder="Target UID" class="w-full p-3 mb-3 font-mono text-center outline-none bg-white/5 border border-white/10 text-sm" />
                            <input type="number" id="interval" placeholder="Interval (Mins) Def: 40" class="w-full p-3 mb-4 font-mono text-center outline-none bg-white/5 border border-white/10 text-sm" />
                            <button onclick="addUser()" class="btn-hover w-full p-3 font-semibold uppercase tracking-wide bg-blue-500 text-white shadow-md text-sm"><i class="fa-solid fa-bolt mr-2"></i> Deploy</button>
                        </div>
                        
                        <div class="glass-panel animate-box p-6 h-fit">
                            <h3 class="text-sm font-bold mb-4 uppercase tracking-wider opacity-80 border-b border-white/10 pb-2"><i class="fa-solid fa-key mr-2 opacity-50"></i>Gen License</h3>
                            <select id="plan_type" class="w-full p-3 mb-3 text-center font-medium outline-none border border-white/10 bg-white/5 text-sm">
                                <option value="trial" class="text-black">Trial (1 Day)</option>
                                <option value="weekly" class="text-black">Weekly (7 Days)</option>
                                <option value="monthly" class="text-black">Monthly (30 Days)</option>
                                <option value="superuser" class="text-black">Super User (10 UIDs)</option>
                            </select>
                            <input type="number" step="0.1" id="plan_days" placeholder="Custom Days Override" class="w-full p-3 mb-4 font-mono text-center outline-none border border-white/10 bg-white/5 text-sm" />
                            <button onclick="genLicense()" class="btn-hover w-full p-3 font-semibold uppercase tracking-wide bg-indigo-500 text-white shadow-md text-sm"><i class="fa-solid fa-certificate mr-2"></i> Issue Key</button>
                        </div>
                    </div>

                    <div class="glass-panel animate-box p-6 md:col-span-1 border-white/10">
                        <h3 class="text-sm font-bold mb-4 uppercase tracking-wider opacity-80 border-b border-white/10 pb-2"><i class="fa-solid fa-server mr-2 opacity-50"></i>Active Nodes</h3>
                        <div class="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">${usersHtml || '<div class="text-center py-10 opacity-40"><i class="fa-solid fa-box-open text-3xl mb-3 block"></i>No nodes deployed.</div>'}</div>
                    </div>

                    <div class="glass-panel animate-box p-6 md:col-span-1 border-white/10">
                        <h3 class="text-sm font-bold mb-4 uppercase tracking-wider opacity-80 border-b border-white/10 pb-2"><i class="fa-solid fa-users mr-2 opacity-50"></i>License DB</h3>
                        <div class="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">${licensesHtml || '<div class="text-center py-10 opacity-40"><i class="fa-solid fa-id-card text-3xl mb-3 block"></i>No licenses found.</div>'}</div>
                    </div>
                </div>
            </div>
            <script>
                async function addUser() {
                    const name = document.getElementById('name').value;
                    const uid = document.getElementById('uid').value;
                    const interval = document.getElementById('interval').value || 40;
                    if(!name || !uid) return showSysModal({msg: "Parameters missing!"});
                    await fetch('/api/target/add', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name, uid, interval}) });
                    window.location.reload();
                }
                function delUser(id, uid) {
                    showSysModal({title: "Warning", msg: "Purge this node from system?", type: "confirm", cb: async (res) => {
                        if(res) {
                            await fetch('/api/target/del', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id, uid}) });
                            window.location.reload();
                        }
                    }});
                }
                async function toggleAuto(uid, status) {
                    await fetch('/api/target/toggle', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({uid, status}) });
                    window.location.reload();
                }
                function editTime(uid, oldTime) {
                    showSysModal({title: "Override Timing", msg: "Enter new interval (mins):", type: "prompt", default: oldTime, cb: async (newTime) => {
                        if(newTime && !isNaN(newTime) && newTime != oldTime) {
                            await fetch('/api/target/edit_time', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({uid, interval: parseInt(newTime)}) });
                            window.location.reload();
                        }
                    }});
                }
                function changeAdminPass() {
                    showSysModal({title: "Security", msg: "Enter New Encryption Key:", type: "prompt", cb: async (newPass) => {
                        if(newPass && newPass.length >= 6) {
                            await fetch('/api/auth/change_pass', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({newPass}) });
                            showSysModal({title: "Success", msg: "Key updated successfully."});
                        } else if (newPass) showSysModal({title: "Error", msg: "Key complexity too low."});
                    }});
                }
                
                async function genLicense() {
                    const plan = document.getElementById('plan_type').value;
                    const days = document.getElementById('plan_days').value;
                    await fetch('/api/admin/issue_key', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({plan, days}) });
                    window.location.reload();
                }
                async function flushDevice(key) {
                    await fetch('/api/admin/flush_device', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({key}) });
                    window.location.reload();
                }
                async function delLicense(key) {
                    showSysModal({title: "Warning", msg: "Purge license from DB?", type: "confirm", cb: async (res) => {
                        if(res) {
                            await fetch('/api/admin/purge_key', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({key}) });
                            window.location.reload();
                        }
                    }});
                }
            </script>
        </body></html>
    `);
});

app.post('/api/auth/change_pass', async (req, res) => {
    if(!req.session.isAdmin) return res.json({success:false});
    ADMIN_PASSWORD = req.body.newPass;
    await supabase.from('settings').upsert({ key: 'admin_pass', value: ADMIN_PASSWORD });
    res.json({success:true});
});

app.post('/api/target/edit_time', async (req, res) => {
    if(!req.session.isAdmin) return res.json({success:false});
    const { uid, interval } = req.body;
    await supabase.from('targets').update({ interval_mins: interval }).eq('uid', uid);
    if(activeTimers[uid]) {
        const t = activeTimers[uid];
        t.intervalMins = interval;
        if(t.autoActivate) scheduleNextRun(uid); 
    }
    res.json({ success: true });
});

app.post('/api/admin/issue_key', async (req, res) => {
    if(!req.session.isAdmin) return res.json({success:false});
    const { plan, days } = req.body;
    
    let finalDays = plan === 'trial' ? 1 : (plan === 'weekly' ? 7 : 30);
    if(days && !isNaN(parseFloat(days))) finalDays = parseFloat(days);

    const generatedKey = 'ROMEO-' + crypto.randomBytes(3).toString('hex').toUpperCase().substring(0,5) + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
    const expiry = new Date(); 
    expiry.setHours(expiry.getHours() + (finalDays * 24)); 

    const slots = plan === 'superuser' ? 10 : 1;

    await supabase.from('licenses').insert([{ license_key: generatedKey, plan_type: plan, expires_at: expiry.toISOString(), allowed_uids: slots }]);
    res.json({ success: true });
});
app.post('/api/admin/flush_device', async (req, res) => {
    if(!req.session.isAdmin) return res.json({success:false});
    await supabase.from('licenses').update({ device_fingerprint: null, ip_address: null }).eq('license_key', req.body.key);
    res.json({ success: true });
});
app.post('/api/admin/purge_key', async (req, res) => {
    if(!req.session.isAdmin) return res.json({success:false});
    await supabase.from('licenses').delete().eq('license_key', req.body.key);
    res.json({ success: true });
});

app.get('/server_settings', (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/login');
    res.send(`
        <!DOCTYPE html>
        <html lang="en"><head><title>Firewall</title>${uiHead}</head>
        <body class="min-h-screen pt-28 p-4 flex flex-col items-center">
            ${getOrbs()}
            ${getFloatingHeader('Firewall Config', true)}
            
            <div class="w-full max-w-7xl mt-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="glass-panel animate-box p-6 flex flex-col">
                    <h3 class="font-bold uppercase tracking-wider opacity-80 text-sm mb-4 border-b border-white/10 pb-2"><i class="fa-solid fa-shield-halved mr-2 opacity-50"></i>CORS Rules</h3>
                    
                    <div class="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl mb-4">
                        <div>
                            <div class="font-semibold text-sm">Allow All Origins (*)</div>
                            <div class="text-[10px] opacity-60">Warning: Opens API to external networks.</div>
                        </div>
                        <button id="cors-toggle" onclick="toggleCors()" class="px-5 py-2 rounded-xl font-semibold text-xs transition ${ALLOW_ALL_CORS ? 'bg-blue-500 text-white' : 'bg-white/10 opacity-70'}">
                            ${ALLOW_ALL_CORS ? 'Active' : 'Blocked'}
                        </button>
                    </div>

                    <div class="flex gap-2 mb-4">
                        <input type="text" id="new-cors-url" placeholder="https://domain.com" class="flex-1 p-3.5 rounded-xl font-mono text-xs outline-none bg-white/5 border border-white/10" />
                        <button onclick="addCorsUrl()" class="px-5 bg-white/10 hover:bg-white/20 font-semibold rounded-xl text-xs transition"><i class="fa-solid fa-plus"></i> Inject</button>
                    </div>

                    <div id="cors-list" class="flex-1 overflow-y-auto space-y-2 max-h-[300px] custom-scrollbar"></div>
                </div>

                <div class="glass-panel animate-box p-6 flex flex-col h-[60vh]">
                    <div class="flex justify-between items-center border-b border-white/10 pb-2 mb-4">
                        <h3 class="font-bold uppercase tracking-wider opacity-80 text-sm"><i class="fa-solid fa-route mr-2 opacity-50"></i>Traffic Logs</h3>
                        <button onclick="fetchApiLogs()" class="text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition font-medium"><i class="fa-solid fa-rotate-right mr-1"></i> Sync</button>
                    </div>
                    <div id="api-logs-container" class="flex-1 overflow-y-auto space-y-3 custom-scrollbar text-xs"></div>
                </div>
            </div>

            <script>
                async function fetchSettings() {
                    const res = await fetch('/api/system/settings_fetch');
                    const data = await res.json();
                    renderCorsList(data.urls);
                }
                
                function renderCorsList(urls) {
                    const list = document.getElementById('cors-list');
                    if(urls.length === 0) return list.innerHTML = '<div class="text-center opacity-50 py-4 text-xs">No specific domains whitelisted.</div>';
                    list.innerHTML = urls.map(u => \`<div class="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition">
                        <span class="font-mono text-xs opacity-90">\${u}</span>
                        <button onclick="removeCorsUrl('\${u}')" class="text-red-400 hover:text-red-500 opacity-80 hover:opacity-100 transition"><i class="fa-solid fa-trash"></i></button>
                    </div>\`).join('');
                }

                async function toggleCors() {
                    const btn = document.getElementById('cors-toggle');
                    const isCurrentlyOn = btn.innerText.includes('Active');
                    const res = await fetch('/api/system/cors_toggle', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status: !isCurrentlyOn}) });
                    const data = await res.json();
                    if(data.success) window.location.reload();
                }

                async function addCorsUrl() {
                    const url = document.getElementById('new-cors-url').value;
                    if(!url) return;
                    await fetch('/api/system/cors_add', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({url}) });
                    document.getElementById('new-cors-url').value = '';
                    fetchSettings();
                }

                async function removeCorsUrl(url) {
                    await fetch('/api/system/cors_remove', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({url}) });
                    fetchSettings();
                }

                async function fetchApiLogs() {
                    const res = await fetch('/api/system/api_logs_fetch');
                    const data = await res.json();
                    const container = document.getElementById('api-logs-container');
                    if(data.logs.length === 0) return container.innerHTML = '<div class="text-center opacity-40 py-10">No traffic detected.</div>';
                    
                    container.innerHTML = data.logs.map(log => {
                        const statusColor = log.status >= 400 ? 'text-red-400' : 'text-blue-400';
                        return \`<div class="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div class="flex justify-between mb-2">
                                <span class="font-bold opacity-90">\${log.method} <span class="opacity-70 font-mono ml-2 font-normal">\${log.url}</span></span>
                                <span class="font-mono opacity-60 text-[10px]">\${log.timeTaken} | <span class="\${statusColor} font-bold">\${log.status}</span></span>
                            </div>
                            <div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10">
                                <div><div class="text-[9px] opacity-50 mb-1 uppercase tracking-wider">Payload In</div><pre class="text-[10px] opacity-80 overflow-x-auto font-mono">\${JSON.stringify(log.reqBody, null, 2)}</pre></div>
                                <div><div class="text-[9px] opacity-50 mb-1 uppercase tracking-wider">Payload Out</div><pre class="text-[10px] opacity-80 overflow-x-auto font-mono">\${JSON.stringify(log.resBody, null, 2)}</pre></div>
                            </div>
                        </div>\`;
                    }).join('');
                }

                fetchSettings();
                fetchApiLogs();
                setInterval(fetchApiLogs, 5000);
            </script>
        </body></html>
    `);
});

app.get('/api/system/settings_fetch', (req, res) => {
    if(!req.session.isAdmin) return res.json({error: "Unauthorized"});
    const urls = fs.readFileSync(CORS_FILE, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
    res.json({ allowAllCors: ALLOW_ALL_CORS, urls, hostEnv: HOST_ENV });
});
app.post('/api/system/cors_toggle', (req, res) => {
    if(!req.session.isAdmin) return res.json({error: "Unauthorized"});
    ALLOW_ALL_CORS = req.body.status;
    res.json({success: true});
});
app.post('/api/system/cors_add', (req, res) => {
    if(!req.session.isAdmin) return res.json({error: "Unauthorized"});
    const urls = fs.readFileSync(CORS_FILE, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
    if(!urls.includes(req.body.url)) { urls.push(req.body.url); fs.writeFileSync(CORS_FILE, urls.join('\n'), 'utf8'); }
    res.json({success: true});
});
app.post('/api/system/cors_remove', (req, res) => {
    if(!req.session.isAdmin) return res.json({error: "Unauthorized"});
    let urls = fs.readFileSync(CORS_FILE, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
    urls = urls.filter(u => u !== req.body.url);
    fs.writeFileSync(CORS_FILE, urls.join('\n'), 'utf8');
    res.json({success: true});
});
app.get('/api/system/api_logs_fetch', (req, res) => {
    if(!req.session.isAdmin) return res.json({error: "Unauthorized"});
    res.json({ logs: backendApiLogs });
});

app.get('/logs', (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/login');

    res.send(`
        <!DOCTYPE html>
        <html lang="en"><head><title>System Logs</title>${uiHead}</head>
        <body class="min-h-screen pt-28 p-4 flex flex-col items-center">
            ${getOrbs()}
            ${getFloatingHeader('System Logs', true)}
            
            <div class="w-full max-w-7xl mt-4">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div class="glass-panel animate-box flex flex-col h-[50vh] overflow-hidden">
                        <div class="flex justify-between items-center p-5 border-b border-white/10">
                            <h3 class="font-bold uppercase tracking-wider opacity-80 text-sm"><i class="fa-solid fa-microchip mr-2 opacity-50"></i>Engine Stdout</h3>
                            <button onclick="copyContent('sys-logs')" class="text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition"><i class="fa-regular fa-copy mr-1"></i> Dump</button>
                        </div>
                        <div class="text-[11px] md:text-xs flex-1 overflow-y-auto p-5 opacity-90 space-y-1.5 font-mono" id="sys-logs"></div>
                    </div>
                    
                    <div class="glass-panel animate-box flex flex-col h-[50vh] overflow-hidden">
                        <div class="flex justify-between items-center p-5 border-b border-white/10">
                            <h3 class="font-bold uppercase tracking-wider opacity-80 text-sm"><i class="fa-solid fa-network-wired mr-2 opacity-50"></i>Net Stdout</h3>
                            <button onclick="copyContent('net-logs')" class="text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition"><i class="fa-regular fa-copy mr-1"></i> Dump</button>
                        </div>
                        <div class="text-[10px] md:text-[11px] flex-1 overflow-y-auto p-5 opacity-80 break-all leading-relaxed space-y-1.5 font-mono" id="net-logs"></div>
                    </div>
                </div>

                <div class="glass-panel animate-box p-6">
                     <h3 class="font-bold uppercase tracking-wider opacity-80 text-sm mb-4 border-b border-white/10 pb-2"><i class="fa-solid fa-camera mr-2 opacity-50"></i>Matrix Snapshots</h3>
                     <div id="matrix-grid" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"></div>
                </div>
            </div>
            
            <div id="img-modal" class="fixed inset-0 bg-black/80 backdrop-blur-xl z-[500] hidden flex-col items-center justify-center p-4">
                <button onclick="document.getElementById('img-modal').classList.add('hidden')" class="absolute top-6 right-6 bg-white/10 border border-white/20 w-12 h-12 flex items-center justify-center rounded-full text-xl hover:bg-white/20 transition"><i class="fa-solid fa-xmark"></i></button>
                <img id="modal-img-src" src="" class="max-w-full max-h-[85vh] object-contain rounded-3xl shadow-2xl border border-white/10" />
            </div>

            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                socket.on('init_logs', function(data) {
                    document.getElementById('sys-logs').innerHTML = data.sys.join('');
                    document.getElementById('net-logs').innerHTML = data.net.join('');
                    renderMatrix(data.matrix);
                });
                socket.on('cron_log', function(data) {
                    const el = document.getElementById(data.type === 'net' ? 'net-logs' : 'sys-logs');
                    el.innerHTML += data.html; el.scrollTop = el.scrollHeight;
                });
                socket.on('step_matrix_update', function(matrix) { renderMatrix(matrix); });

                function renderMatrix(matrix) {
                    const grid = document.getElementById('matrix-grid');
                    grid.innerHTML = '';
                    for(let uid in matrix) {
                        matrix[uid].forEach(snap => {
                            let isErr = snap.isError ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 bg-white/5';
                            let titleCol = snap.isError ? 'text-red-400 font-bold' : 'opacity-80';
                            grid.innerHTML += \`<div class="rounded-2xl p-3 border \${isErr} cursor-pointer transition hover:scale-105" onclick="showImg('data:image/jpeg;base64,\${snap.img}')">
                                <div class="text-[10px] font-semibold truncate mb-1 opacity-90">\${uid}</div>
                                <div class="text-[8px] \${titleCol} truncate mb-2 font-mono">\${snap.step} | \${snap.time}</div>
                                <img src="data:image/jpeg;base64,\${snap.img}" class="w-full aspect-[9/16] object-cover rounded-xl border border-white/10 shadow-sm" />
                            </div>\`;
                        });
                    }
                }
                function showImg(src) {
                    document.getElementById('modal-img-src').src = src;
                    document.getElementById('img-modal').classList.remove('hidden');
                    document.getElementById('img-modal').classList.add('flex');
                }
                function copyContent(id) {
                    navigator.clipboard.writeText(document.getElementById(id).innerText);
                    showSysModal({title: "Dump Copied", msg: "Buffer copied to clipboard."});
                }
            </script>
        </body></html>
    `);
});

// ==========================================
// SOCKET.IO & TIMING LOGIC
// ==========================================
io.on('connection', (socket) => {
    socket.emit('init_logs', { sys: systemLogs, net: networkLogs, matrix: licenseStepScreenshots });
    socket.on('start_watch', (data) => { if(data.token) global.watchingUID = data.uid; });
    socket.on('stop_watch', () => { global.watchingUID = null; });
});

setInterval(() => {
    const uiData = {};
    const now = Date.now();
    for (const uid in activeTimers) {
        const timerObj = activeTimers[uid];
        
        let remainingStr = '';
        let isRunning = engineStatus[uid] || false;

        if(timerObj.isSub) {
            if (isRunning) remainingStr = '<span class="text-blue-400 font-bold tracking-wide flex items-center text-xs"><i class="fa-solid fa-gear fa-spin mr-1.5"></i>Executing</span>';
            else {
                const diff = timerObj.nextRun - now;
                if(diff > 0) remainingStr = '<span class="opacity-80 font-medium text-sm"><i class="fa-regular fa-clock mr-1"></i> ' + Math.floor(diff/60000) + 'm ' + Math.floor((diff%60000)/1000) + 's</span>';
                else remainingStr = '<span class="text-indigo-400 font-medium text-xs">Booting...</span>';
            }
        } else {
            const diff = timerObj.nextRun - now;
            if(!timerObj.autoActivate) remainingStr = '<span class="text-red-400 font-bold text-xs"><i class="fa-solid fa-pause mr-1"></i> Halted</span>';
            else if (isRunning) remainingStr = '<span class="text-blue-400 font-bold tracking-wide flex items-center text-xs"><i class="fa-solid fa-gear fa-spin mr-1.5"></i>Executing</span>';
            else if (diff > 0) remainingStr = '<span class="opacity-80 font-medium text-sm"><i class="fa-regular fa-clock mr-1"></i> ' + Math.floor(diff/60000) + 'm ' + Math.floor((diff%60000)/1000) + 's</span>';
            else remainingStr = '<span class="text-indigo-400 font-medium text-xs">Booting...</span>';
        }
        
        uiData[uid] = { name: timerObj.name, remaining: remainingStr, isRunning, autoActivate: timerObj.autoActivate !== false };
    }
    io.emit('update_ui', uiData);
}, 1000);

function appendLog(html, type = 'sys') {
    const fullLog = `<div class="border-b border-white/10 pb-1.5 mb-1.5 text-[11px]"><span class="opacity-60 bg-white/10 px-2 py-0.5 rounded mr-2 font-mono text-[9px] border border-white/5">[${getPKTTime()}]</span> ${html}</div>`;
    if (type === 'net') { networkLogs.push(fullLog); if(networkLogs.length > 500) networkLogs.shift(); } 
    else { systemLogs.push(fullLog); if(systemLogs.length > 300) systemLogs.shift(); }
    io.emit('cron_log', { html: fullLog, type });
}

app.get('/api/avatar', async (req, res) => {
    try { const { data } = await supabase.from('settings').select('value').eq('key', 'admin_avatar').single(); res.json({ url: data ? data.value : null }); } 
    catch(e) { res.json({ url: null }); }
});

app.post('/api/avatar', async (req, res) => {
    if(!req.session.isAdmin) return res.status(403).json({});
    try { await supabase.from('settings').upsert({ key: 'admin_avatar', value: req.body.image }); res.json({ success: true }); } 
    catch(e) { res.status(500).json({ success: false }); }
});

app.post('/api/target/add', async (req, res) => {
    if(!req.session.isAdmin) return res.status(403).json({});
    const { name, uid, interval } = req.body;
    await supabase.from('targets').insert([{ name, uid, interval_mins: interval || 40 }]);
    startUIDCycle(uid, name, interval || 40, true, true, false);
    res.json({ success: true });
});

app.post('/api/target/del', async (req, res) => {
    if(!req.session.isAdmin) return res.status(403).json({});
    const { uid } = req.body;
    await supabase.from('targets').delete().eq('uid', uid);
    if (activeTimers[uid]) { clearTimeout(activeTimers[uid].timer); delete activeTimers[uid]; engineStatus[uid] = false; }
    res.json({ success: true });
});

app.post('/api/target/toggle', async (req, res) => {
    if(!req.session.isAdmin) return res.status(403).json({});
    const { uid, status } = req.body;
    await supabase.from('targets').update({ auto_activate: status }).eq('uid', uid);
    if(activeTimers[uid]) {
        activeTimers[uid].autoActivate = status;
        if(!status) clearTimeout(activeTimers[uid].timer); else scheduleNextRun(uid);
    }
    res.json({ success: true });
});

function scheduleNextRun(uid) {
    if(!activeTimers[uid] || !activeTimers[uid].autoActivate) return;
    const intervalMs = activeTimers[uid].intervalMins * 60 * 1000;
    activeTimers[uid].nextRun = Date.now() + intervalMs;
    clearTimeout(activeTimers[uid].timer); 
    activeTimers[uid].timer = setTimeout(() => executeEngineWithRetry(uid), intervalMs);
}

// ----------------------------------------------------
// CRASH & RETRY WRAPPER
// ----------------------------------------------------
async function executeEngineWithRetry(uid, forcedName = null) {
    const target = activeTimers[uid];
    if(target && target.isSub && !target.autoActivate) return;
    if(!target && !forcedName) return; 
    
    const name = forcedName || target.name;
    let maxRetries = 3;
    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
        attempt++;
        try {
            if(attempt > 1) appendLog(`<span class="text-indigo-400 font-semibold"><i class="fa-solid fa-rotate-right mr-1"></i> Auto-Restarting execution (Attempt ${attempt}/${maxRetries})...</span>`);
            await runGhostActivator(uid, name);
            success = true; 
        } catch (error) {
            if (attempt < maxRetries) {
                appendLog(`<span class="text-yellow-400 font-semibold"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Execution Failed. Restarting in 5s...</span>`);
                await new Promise(r => setTimeout(r, 5000));
            } else {
                appendLog(`<span class="text-red-500 font-bold"><i class="fa-solid fa-skull mr-1"></i> Task completely failed after ${maxRetries} retries.</span>`);
            }
        }
    }

    if(target && !target.isSub && target.autoActivate) {
        appendLog(`<span class="opacity-80 font-semibold"><i class="fa-solid fa-hourglass-start mr-1"></i> Auto-Resume scheduled after ${target.intervalMins} mins...</span>`);
        scheduleNextRun(uid);
    } else if(target && target.isSub) {
        appendLog(`<span class="opacity-80 font-semibold"><i class="fa-solid fa-hourglass-start mr-1"></i> Sub-Resume scheduled after ${target.intervalMins} mins...</span>`);
        scheduleNextRun(uid);
    }
}

function startUIDCycle(uid, name, intervalMins, autoActivate, runImmediate = false, isFree = false) {
    if (activeTimers[uid]) clearTimeout(activeTimers[uid].timer);
    activeTimers[uid] = { name, intervalMins, autoActivate, totalTime: 0, nextRun: Date.now(), timer: null, isSub: false, isFree: isFree };

    if(isFree) {
        // Free user max exactly 3 hours hard cap.
        activeTimers[uid].freeExpiry = Date.now() + (3 * 60 * 60 * 1000); 
        setTimeout(() => {
            if(activeTimers[uid]) {
                clearTimeout(activeTimers[uid].timer);
                delete activeTimers[uid];
                engineStatus[uid] = false;
                console.log(`[Free Quota] UID ${uid} auto-removed after 3 hours.`);
            }
        }, 3 * 60 * 60 * 1000);
    }

    if(!autoActivate) return;
    if(runImmediate) {
        if(!executionQueue.includes(uid)) executionQueue.push(uid);
        processQueue();
    } else scheduleNextRun(uid);
}

setTimeout(async () => {
    try {
        const { data: users } = await supabase.from('targets').select('*');
        if (users && users.length > 0) {
            appendLog('<span class="text-blue-400 opacity-90"><i class="fa-solid fa-database mr-1"></i> Restoring Database Systems...</span>');
            users.forEach((u, index) => {
                setTimeout(() => startUIDCycle(u.uid, u.name, u.interval_mins, u.auto_activate, u.auto_activate, false), index * 10000);
            });
        }

        const { data: licenses } = await supabase.from('licenses').select('*');
        if (licenses) {
            licenses.forEach(l => {
                if(new Date(l.expires_at).getTime() > Date.now() && l.uids && l.uids.length > 0) {
                    startPremiumCycle(l.license_key, l.uids, l.plan_type, l.expires_at, true);
                }
            });
        }
    } catch(e) {}
}, 4000);

// ==========================================
// CHROMIUM ENGINE (PUPPETEER)
// ==========================================
async function runGhostActivator(uid, name) {
    if(engineStatus[uid]) throw new Error("Engine already running for this UID");
    let browser;
    engineStatus[uid] = true;
    
    const actionLogFile = `actions_${uid}.txt`;
    const netLogFile = `network_${uid}.txt`;
    const dumpLogFile = `dump_${uid}.txt`; // New deep log for cookies & payloads
    
    fs.writeFileSync(actionLogFile, `=== ACTION LOGS FOR ${uid} ===\n`);
    fs.writeFileSync(netLogFile, `=== NETWORK LOGS FOR ${uid} ===\n`);
    fs.writeFileSync(dumpLogFile, `=== DEEP DUMP FOR ${uid} (PAYLOADS & COOKIES) ===\n\n`);

    const sysLog = (msg) => {
        appendLog(`<b class="opacity-90">[${uid}]</b> ${msg}`); 
        fs.appendFileSync(actionLogFile, `[${getPKTTime()}] ${msg.replace(/<[^>]*>?/gm, '')}\n`);
    };
    const netLog = (msg) => {
        appendLog(`<b class="opacity-80 text-blue-300">[${uid}]</b> ${msg}`, 'net');
        fs.appendFileSync(netLogFile, `[${getPKTTime()}] ${msg.replace(/<[^>]*>?/gm, '')}\n`);
    };

    try {
        sysLog('<i class="fa-solid fa-rocket text-blue-400"></i> Engine Booting (Native 90 FPS)...'); 
        
        try {
            await sendTgRequest("sendSticker", { chat_id: TG_CHAT_ID, sticker: TG_LIVE_STICKER_ID });
            await sendTelegramText(`🚀 *[ ${uid} ] ACTIVATION STARTED*\n\n[▓▓▓▓░░░░░░] 40%\n\n⏱️ PKT Time: ${getPKTTime()}`);
        } catch(e) {}

        let execPath = undefined;
        if (IS_TERMUX) {
            execPath = '/data/data/com.termux/files/usr/bin/chromium-browser';
        } else if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            execPath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage', '--window-size=360,640'],
            headless: 'new',
            executablePath: execPath 
        });

        const page = (await browser.pages())[0] || await browser.newPage();
        await page.setViewport({ width: 360, height: 640, isMobile: true, hasTouch: true });

        let lastStreamFrame = null;
        const cdpClient = await page.target().createCDPSession();
        await cdpClient.send('Page.startScreencast', { format: 'jpeg', quality: 40, everyNthFrame: 1 });
        
        cdpClient.on('Page.screencastFrame', async (evt) => {
            lastStreamFrame = evt.data;
            if(global.watchingUID === uid) {
                io.emit('live_frame', { uid, frame: evt.data, timestamp: Date.now() });
            }
            await cdpClient.send('Page.screencastFrameAck', { sessionId: evt.sessionId }).catch(()=>{});
        });

        const saveMatrixScreen = async (stepName, isError = false) => {
            if(!lastStreamFrame) return; 
            if(!licenseStepScreenshots[uid]) licenseStepScreenshots[uid] = [];
            licenseStepScreenshots[uid].push({ step: stepName, img: lastStreamFrame, time: getPKTTime(), isError });
            if(licenseStepScreenshots[uid].length > 8) licenseStepScreenshots[uid].shift(); 
            io.emit('step_matrix_update', licenseStepScreenshots);
        };

        await page.evaluateOnNewDocument(() => { window.open = function() { return null; }; });

        browser.on('targetcreated', async (target) => {
            if (target.type() === 'page') {
                try {
                    const newPage = await target.page();
                    if (newPage && newPage.url() !== 'about:blank') {
                        setTimeout(() => newPage.close().catch(() => {}), 500);
                        sysLog('<i class="fa-solid fa-ban text-red-400"></i> Popup Ad Tab Blocked.');
                    }
                } catch(e) {}
            }
        });
        
        await page.setRequestInterception(true);
        page.on('request', req => {
            const rType = req.resourceType();
            const urlStr = req.url().toLowerCase();
            const method = req.method();
            const postData = req.postData();

            // DEEP LOGGING
            try {
                if (['POST', 'PUT', 'PATCH'].includes(method) || postData) {
                    fs.appendFileSync(dumpLogFile, `[PAYLOAD OUT] ${method} ${urlStr}\nHeaders: ${JSON.stringify(req.headers())}\nPayload: ${postData}\n\n`);
                }
            } catch(e) {}

            if (rType === 'media') return req.abort(); 
            if (req.isNavigationRequest() && req.frame() === page.mainFrame()) {
                if (!urlStr.includes('unlockffbeta.com') && !urlStr.includes('google.com')) {
                    netLog(`<span class="text-red-400 font-medium"><i class="fa-solid fa-shield-halved"></i> Hijack Blocked: ${urlStr.substring(0, 40)}...</span>`);
                    return req.abort('aborted'); 
                }
            }
            req.continue(); 
        });

        page.on('response', async (res) => {
            const rType = res.request().resourceType();
            const urlStr = res.url();
            const status = res.status();

            // DEEP LOGGING
            try {
                if (status >= 400 || urlStr.includes('api')) {
                    fs.appendFileSync(dumpLogFile, `[RESPONSE IN] ${status} ${urlStr}\n\n`);
                }
            } catch(e) {}

            if(rType === 'xhr' || rType === 'fetch' || rType === 'document') {
                if(!['google-analytics', 'doubleclick', 'facebook', 'bing'].some(j => urlStr.includes(j))) {
                    let statusColor = status >= 400 ? 'text-red-400 font-bold' : (status >= 300 ? 'text-yellow-300' : 'text-blue-300');
                    let icon = status >= 400 ? 'fa-xmark' : 'fa-check';
                    netLog(`<div class="bg-white/5 p-1.5 rounded-lg mb-1 border-l-2 border-white/20"><span class="${statusColor} font-mono mr-2"><i class="fa-solid ${icon} text-[10px]"></i> ${status}</span> <span class="opacity-80">${urlStr.substring(0,60)}...</span></div>`);
                }
            }
        });

        await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36');
        page.on('dialog', async dialog => { await dialog.dismiss(); }); 

        await page.goto('https://unlockffbeta.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
        sysLog('<i class="fa-solid fa-globe text-blue-400"></i> Page loaded. Starting sequence...');
        await saveMatrixScreen("INIT_DOM_LOAD");

        let safetyCounter = 0;
        let uidInjected = false;
        
        while (safetyCounter < 45) { 
            safetyCounter++;
            await saveMatrixScreen(`LOOP_STEP_${safetyCounter}`); 
            
            const allPages = await browser.pages();
            if (allPages.length > 1) {
                for (let i = 0; i < allPages.length; i++) {
                    if (allPages[i] !== page) await allPages[i].close().catch(() => {});
                }
                await page.bringToFront();
            }

            const popupDestroyed = await page.evaluate(() => {
                let killed = false;
                document.querySelectorAll('div, iframe, section').forEach(el => {
                    const text = el.innerText ? el.innerText.toLowerCase() : '';
                    const z = window.getComputedStyle(el).zIndex;
                    if(text.includes('bonus available') || text.includes('congratulations') || (parseInt(z) > 999 && (el.id.includes('ad') || el.className.includes('ad')))) {
                        el.remove();
                        killed = true;
                    }
                });
                return killed;
            });
            if(popupDestroyed) { sysLog('<i class="fa-solid fa-bomb text-yellow-400"></i> Spam Overlay Destroyed!'); }

            await page.evaluate(() => {
                const reloadBtn = Array.from(document.querySelectorAll('button, a, div[role="button"]')).find(b => b.innerText && b.innerText.toLowerCase().includes('i fixed it'));
                if(reloadBtn) reloadBtn.click();
            });

            const isInitializing = await page.evaluate(() => {
                const text = document.body.innerText ? document.body.innerText.toLowerCase() : "";
                return (text.includes('please wait') || text.includes('initializing...')) && !text.includes('access granted');
            });

            if (isInitializing) {
                sysLog('<i class="fa-solid fa-spinner fa-spin text-indigo-400"></i> Initializing Spinner Detected... Waiting [▓▓▓▓▓▓▓░░░] 70%');
                await saveMatrixScreen("WAITING_INITIALIZATION");
                await new Promise(r => setTimeout(r, 2000));
                continue; 
            }

            // =====================================
            // ROBUST TIME EXTRACTION BUG FIX
            // =====================================
            const resultData = await page.evaluate(() => {
                const result = { success: false, timeStr: "1h 0m 0s", h: 0, m: 0, s: 0 };
                const text = document.body.innerText ? document.body.innerText.toLowerCase() : "";
                
                if (text.includes('step ') && text.includes(' of ')) return result;
                
                if (text.includes('access granted') || text.includes('successfully') || text.includes('expires in')) {
                    result.success = true;
                    
                    const hMatch = text.match(/(\d+)\s*h/i);
                    const mMatch = text.match(/(\d+)\s*m/i);
                    const sMatch = text.match(/(\d+)\s*s/i);

                    if(hMatch) result.h = parseInt(hMatch[1]);
                    if(mMatch) result.m = parseInt(mMatch[1]);
                    if(sMatch) result.s = parseInt(sMatch[1]);

                    // Fallback search if empty
                    if(result.h === 0 && result.m === 0 && result.s === 0) {
                        const fallback = text.match(/(\d+)\s*min/i);
                        if(fallback) result.m = parseInt(fallback[1]);
                        else result.m = 60; // Ultimate fallback
                    }
                    
                    result.timeStr = `${result.h}h ${result.m}m ${result.s}s`;
                }
                return result;
            });

            if (resultData.success) {
                sysLog('<span class="text-blue-400 font-bold"><i class="fa-solid fa-circle-check"></i> ✅ Activation Successful! [██████████] 100%</span>');
                await saveMatrixScreen("SUCCESS_VERIFIED");

                // Safely calculate MS
                let extractedMs = (resultData.h * 60 * 60 * 1000) + (resultData.m * 60 * 1000) + (resultData.s * 1000);
                if (extractedMs < 60000) extractedMs = 60 * 60 * 1000; // fail-safe if regex completely failed

                // Renew 5 minutes before actual expiry 
                let safeIntervalMs = extractedMs - (5 * 60 * 1000);
                if(safeIntervalMs < 60000) safeIntervalMs = 60000; 

                if (activeTimers[uid]) {
                    if(!activeTimers[uid].totalTime) activeTimers[uid].totalTime = 0;
                    activeTimers[uid].totalTime += extractedMs;
                    activeTimers[uid].intervalMins = Math.floor(safeIntervalMs / 60000);
                    sysLog(`Time granted: ${resultData.timeStr}. System will auto-renew gracefully in ${activeTimers[uid].intervalMins} mins.`);
                }

                try {
                    await sendTelegramScreenshot(lastStreamFrame, uid, `${name} (Time Granted: ${resultData.timeStr})`, false);
                } catch(e) {}
                
                return true; 
            }

            if (!uidInjected) {
                const injected = await page.evaluate((val) => {
                    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"])'));
                    if (inputs.length > 0 && inputs[0].value !== val) {
                        inputs[0].focus(); inputs[0].value = val;
                        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                        inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
                        return true;
                    }
                    return false;
                }, uid);
                if (injected) { 
                    uidInjected = true; 
                    sysLog('<i class="fa-solid fa-keyboard text-indigo-400"></i> UID typed successfully. [▓▓▓▓▓░░░░░] 50%');
                    await saveMatrixScreen("UID_TYPED");
                    await new Promise(r => setTimeout(r, 1000)); 
                }
            }

            const clicked = await page.evaluate(() => {
                const closeWords = ['close', 'x', 'skip ad', 'no thanks'];
                const targets = ['continue without discord', 'continue (an ad will open)', 'continue', 'proceed', 'next', 'submit'];
                const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"], span'));

                for (let btn of buttons) {
                    if (!btn || typeof btn.innerText !== 'string') continue;
                    const text = btn.innerText.toLowerCase().trim();
                    if (btn.offsetHeight > 0 && window.getComputedStyle(btn).display !== 'none') {
                        if (closeWords.includes(text) || (text === 'x' && btn.clientWidth < 50)) {
                            btn.scrollIntoView({ behavior: 'instant', block: 'center' });
                            if (typeof btn.click === 'function') btn.click();
                            return "Closed Ad (" + text + ")";
                        }
                    }
                }
                for (let btn of buttons) {
                    if (!btn || typeof btn.innerText !== 'string') continue;
                    const text = btn.innerText.toLowerCase().trim();
                    if (btn.offsetHeight > 0 && window.getComputedStyle(btn).display !== 'none') {
                        if (targets.some(t => text === t || text.includes(t))) {
                            btn.scrollIntoView({ behavior: 'instant', block: 'center' });
                            if (typeof btn.click === 'function') btn.click();
                            return text;
                        }
                    }
                }
                return null;
            });

            if (clicked) {
                sysLog(`<i class="fa-solid fa-hand-pointer text-indigo-300"></i> Action Performed: "${clicked}"`);
                await saveMatrixScreen("ACTION_CLICKED");
                await new Promise(r => setTimeout(r, 2000));
            } else {
                await new Promise(r => setTimeout(r, 1000)); 
            }
            
            const isBlocked = await page.evaluate(() => {
                const text = document.body.innerText ? document.body.innerText.toLowerCase() : "";
                return text.includes('invalid id');
            });
            if(isBlocked) {
                await saveMatrixScreen("ERROR_INVALID_ID", true);
                throw new Error("Blocked by Target (Invalid ID)");
            }
        }
        await saveMatrixScreen("ERROR_TIMEOUT", true);
        throw new Error("Execution Timeout! Target flow got stuck.");
    } catch (error) {
        sysLog(`<span class="text-red-400 font-bold"><i class="fa-solid fa-triangle-exclamation"></i> ❌ ${error.message}</span>`);
        try {
            await sendTelegramScreenshot(lastStreamFrame, uid, name, true); 
        } catch(e){}
        throw error;
    } finally {
        // FETCH FINAL COOKIES AND LOCAL STORAGE
        try {
            if(page) {
                const cookies = await page.cookies();
                const ls = await page.evaluate(() => JSON.stringify(window.localStorage));
                fs.appendFileSync(dumpLogFile, `\n=== FINAL BROWSER COOKIES ===\n${JSON.stringify(cookies, null, 2)}\n`);
                fs.appendFileSync(dumpLogFile, `\n=== LOCAL STORAGE DATA ===\n${ls}\n`);
            }
        } catch(e) {}

        if (browser) await browser.close();
        engineStatus[uid] = false; 
        sysLog('<i class="fa-solid fa-power-off opacity-50"></i> Engine Closed.');
        
        try {
            if(fs.existsSync(actionLogFile)) {
                await sendTgRequest("sendDocument", { chat_id: TG_CHAT_ID, caption: `📜 *Action Logs* - ${uid}\n⏱️ PKT: ${getPKTTime()}`, parse_mode: "Markdown" }, { fieldName: 'document', buffer: fs.readFileSync(actionLogFile), filename: actionLogFile });
                fs.unlinkSync(actionLogFile);
            }
            if(fs.existsSync(netLogFile)) {
                await sendTgRequest("sendDocument", { chat_id: TG_CHAT_ID, caption: `🌐 *Network Logs* - ${uid}\n⏱️ PKT: ${getPKTTime()}`, parse_mode: "Markdown" }, { fieldName: 'document', buffer: fs.readFileSync(netLogFile), filename: netLogFile });
                fs.unlinkSync(netLogFile); 
            }
            if(fs.existsSync(dumpLogFile)) {
                await sendTgRequest("sendDocument", { chat_id: TG_CHAT_ID, caption: `🗄️ *Deep Payload & Cookies Dump* - ${uid}\n⏱️ PKT: ${getPKTTime()}`, parse_mode: "Markdown" }, { fieldName: 'document', buffer: fs.readFileSync(dumpLogFile), filename: dumpLogFile });
                fs.unlinkSync(dumpLogFile); 
            }
        } catch(e) { console.log(e); }
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('\n=========================================');
    console.log(`⚡ ROMEO ROOT SERVER INITIALIZED`);
    console.log(`📡 ENVIRONMENT: ${HOST_ENV}`);
    console.log(`👉 Front: http://localhost:${PORT}/`);
    console.log('=========================================\n');
});
