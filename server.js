const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data.json');
const PORT = process.env.PORT || 3001;

const DEFAULT_DATA = {
    leftPersonList: ['畅为', '尚哥', '白云', '喆杰', '可欣', '嘉豪', '孜尊', '晟杰', '星宇', '俊鹏', '英祺', '璐燚', '俊杰', '依婷'],
    rightPersonMap: {},
    taskSections: {},
    taskPresets: ['早班巡检', '午间清理', '晚班移交', '周报整理'],
    todoPresets: ['日常巡检', '环境清洁', '设备维护', '文档整理', '客户接待'],
    sectionPresets: ['日常任务', '专项任务', '临时增援', '值班工作'],
    dayStates: {}
};

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('加载数据失败:', error);
    }
    return { ...DEFAULT_DATA };
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('保存数据失败:', error);
        return false;
    }
}

let taskData = loadData();

io.on('connection', (socket) => {
    console.log('新客户端连接:', socket.id);

    socket.emit('init', taskData);

    socket.on('update', (newData) => {
        console.log('收到数据更新');
        taskData = newData;
        if (saveData(taskData)) {
            socket.broadcast.emit('sync', taskData);
        }
    });

    socket.on('disconnect', () => {
        console.log('客户端断开:', socket.id);
    });
});

app.get('/api/data', (req, res) => {
    res.json(taskData);
});

app.post('/api/reset', (req, res) => {
    taskData = { ...DEFAULT_DATA };
    saveData(taskData);
    io.emit('sync', taskData);
    res.json({ success: true });
});

server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`局域网访问: http://47.85.12.207:${PORT}`);
});
