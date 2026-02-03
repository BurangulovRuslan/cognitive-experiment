// nic2-sync-server.js
// Сервер-мост для синхронизации веб-приложения с NIC2 через TCP

const express = require('express');
const cors = require('cors');
const net = require('net');

const app = express();
const PORT = 3000; // Порт для веб-приложения
const NIC2_HOST = '127.0.0.1'; // IP адрес NIC2 (обычно localhost)
const NIC2_PORT = 1234; // Порт NIC2 (по умолчанию 1234, проверьте в настройках NIC2)

// Middleware
app.use(cors()); // Разрешить запросы от браузера
app.use(express.json());

// Логирование всех маркеров
const markerLog = [];

// Функция отправки триггера в NIC2
function sendTriggerToNIC2(markerCode, markerName) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();

    // Формат команды для NIC2: <TRIGGER>CODE</TRIGGER>
    const triggerMessage = `<TRIGGER>${markerCode}</TRIGGER>`;

    client.connect(NIC2_PORT, NIC2_HOST, () => {
      console.log(`[${new Date().toISOString()}] Подключено к NIC2`);
      client.write(triggerMessage);
      console.log(`✓ Отправлен маркер: ${markerCode} (${markerName})`);

      // Логируем маркер
      markerLog.push({
        timestamp: Date.now(),
        time: new Date().toISOString(),
        code: markerCode,
        name: markerName
      });

      client.destroy(); // Закрываем соединение
      resolve();
    });

    client.on('error', (err) => {
      console.error(`✗ Ошибка подключения к NIC2: ${err.message}`);
      console.error(`  Проверьте: NIC2 запущен? IP: ${NIC2_HOST}, PORT: ${NIC2_PORT}`);
      reject(err);
    });

    client.on('close', () => {
      console.log('  Соединение с NIC2 закрыто');
    });
  });
}

// API endpoint для отправки маркеров
app.post('/send-marker', async (req, res) => {
  const { code, name, details } = req.body;

  if (!code || !name) {
    return res.status(400).json({ 
      success: false, 
      error: 'Требуются поля: code и name' 
    });
  }

  try {
    await sendTriggerToNIC2(code, name);
    res.json({ 
      success: true, 
      message: `Маркер ${code} (${name}) отправлен в NIC2`,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      hint: 'Проверьте, что NIC2 запущен и принимает TCP соединения'
    });
  }
});

// Endpoint для получения логов (для отладки)
app.get('/markers', (req, res) => {
  res.json({
    total: markerLog.length,
    markers: markerLog
  });
});

// Проверка здоровья сервера
app.get('/health', (req, res) => {
  res.json({ 
    status: 'running',
    nic2: {
      host: NIC2_HOST,
      port: NIC2_PORT
    },
    server: {
      port: PORT
    }
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🚀 NIC2 Sync Server запущен');
  console.log('═══════════════════════════════════════════════════');
  console.log(`📡 Сервер слушает:        http://localhost:${PORT}`);
  console.log(`🔗 NIC2 адрес:            ${NIC2_HOST}:${NIC2_PORT}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('✓ Готов принимать маркеры от веб-приложения');
  console.log('✓ Веб-приложение: http://localhost:4200');
  console.log('\nℹ️  Убедитесь, что NIC2 запущен и принимает TCP соединения!\n');
});

// Обработка выхода
process.on('SIGINT', () => {
  console.log('\n\n📊 Статистика сессии:');
  console.log(`   Всего отправлено маркеров: ${markerLog.length}`);
  console.log('\n👋 Сервер остановлен\n');
  process.exit(0);
});
