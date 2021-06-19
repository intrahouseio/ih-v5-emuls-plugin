/**
 * app.js
 * Эмулятор
 */

const util = require('util');

module.exports = async function(plugin) {
  let interval = 0;
  let reqarr = [];
  let timers = [];
  run();

  function run() {
    if (interval) clearInterval(interval);

    formReq();
    formTimers();

    interval = setInterval(() => {
      const toSendIdx = [];
      let item = getNextFromTimers();
      while (item) {
        if (item && item.index != undefined && item.index < reqarr.length) {
          toSendIdx.push(item.index);
          item = getNextFromTimers();
        } else {
          item = '';
        }
      }
      if (toSendIdx.length) {
        const arr = toSendIdx.map(idx => gen(idx)[0]);
        plugin.sendData(arr);
      }
    }, 100);
  }

  // Сформировать массив запросов с ненулевым периодом, установить начальное значение
  function formReq() {
    if (!plugin.channels || !plugin.channels.length) {
      plugin.log('No channels!');
      return;
    }
    reqarr = plugin.channels.filter(item => item.period > 0).map(formItem);
  }

  // Сформировать заново очередь на генерацию
  function formTimers() {
    const curtime = Date.now();

    timers = [];
    for (var i = 0; i < reqarr.length; i++) {
      if (i == 0) {
        timers.push({ index: 0, qtime: curtime + reqarr[i].tick });
      } else {
        insertTimer({ index: i, qtime: 0 }, curtime);
      }
    }
  }

  // Включить запрос в очередь на генерацию
  function insertTimer(item, curtime) {
    let i = 0;
    if (item && item.index < reqarr.length && reqarr[item.index].tick > 0) {
      item.qtime = curtime + reqarr[item.index].tick;
      while (i < timers.length) {
        if (timers[i].qtime > item.qtime) {
          timers.splice(i, 0, item);
          return;
        }
        i++;
      }
      timers.push(item);
    }
  }

  function removeTimer(index) {
    let i = 0;
    while (i < timers.length) {
      if (timers[i].index == index) {
        timers.splice(i, 1);
        return;
      }
      i++;
    }
  }

  // Получить элемент из очереди на генерацию. Очередь упорядочена по qtime
  function getNextFromTimers() {
    if (timers.length > 0) {
      const curtime = Date.now();
      if (timers[0].qtime <= curtime) {
        let item = timers.shift();
        insertTimer(item, curtime);
        return item;
      }
    }
  }

  // Генерировать данные канала
  function gen(index) {
    const item = reqarr[index];
    if (item.desc == 'AI') {
      if (item.random) {
        item.value = genRandom(item);
      } else {
        if (item.min >= item.value) {
          item.dir = 'up';
        } else if (item.max <= item.value) {
          item.dir = 'dn';
        }
        item.value += item.dir == 'dn' ? -Number(item.delta) : Number(item.delta);
      }
    } else if (item.desc == 'Meter') {
      item.value += 1 * item.weight;
    } else {
      item.value = item.value == 1 ? 0 : 1;
    }
    return [{ id: item.id, value: item.value }];
  }

  function addChannel(item) {
    if (!item || !item.id || !item.period) return;

    reqarr.push(formItem(item));
    const index = reqarr.length - 1;
    insertTimer({ index, qtime: 0 }, Date.now());
  }

  function updateChannel(item) {
    const { oldid, id } = item;
    if (!oldid || !id) return;

    deleteChannel({ oldid });
    addChannel(item);
  }

  function deleteChannel({ oldid }) {
    const index = findItemById(oldid);
    if (index < 0) return;
    removeTimer(index);
    reqarr.splice(index, 1);
  }

  function findItemById(id) {
    for (let i = 0; i < reqarr.length; i++) {
      if (reqarr[i].id == id) return i;
    }
    return -1;
  }

  function genRandom(item) {
    return item.min + Math.floor((item.max - item.min) * Math.random());
  }

  function formItem(item) {
    item.value = item.desc == 'DI' ? 1 : Number(item.min);
    item.random = item.random || 0;
    item.min = Number(item.min);
    item.max = Number(item.max);
    item.tick = Number(item.period) * 1000;
    return item;
  }

  // --- События плагина ---
  /**  act
  * Получил от сервера команду(ы) для устройства 
  * @param {Array of Objects} - data - массив команд
  */
  plugin.on('act', data => {
    if (!data) return;

    const result = [];
    data.forEach(item => {
      if (item.setchan != undefined) result.push({ id: item.setchan, value: item.setval || 0 });
    });
    plugin.log('ACT: ' + util.inspect(data) + ' RESULT: ' + util.inspect(result), 1);
    plugin.sendData(result);
  });

  // События при изменении каналов
  plugin.onAdd('channels', recs => {
    recs.forEach(rec => addChannel(rec));
  });

  plugin.onUpdate('channels', recs => {
    recs.forEach(rec =>  updateChannel(rec));
  });

  plugin.onDelete('channels', recs => {
    recs.forEach(rec => deleteChannel(rec));
  });
};
