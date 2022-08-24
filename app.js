/**
 * app.js
 * Эмулятор
 */

const util = require('util');

module.exports = async function(plugin) {
  let reqarr = [];
  let timers = [];
  const commonperiod =
    plugin.params.usecommonperiod && plugin.params.commonperiod > 0 ? plugin.params.commonperiod * 1000 : 0;

  if (plugin.channels && plugin.channels.length) {
    if (commonperiod) {
      reqarr = plugin.channels.map(formItemWithCommonPeriod);
      const qtime = Date.now() + commonperiod;
      timers = reqarr.map((item, index) => ({index, qtime}));
    } else {
      reqarr = plugin.channels.filter(item => item.period > 0).map(formItem);
      formTimers();
    }
  
    run();
  } else {
    plugin.log('No channels!');
  }

  function run() {
    setInterval(() => {
      const toSendIdx = [];
      const curtime = Date.now();
      let item = getNextFromTimers(curtime);
      while (item) {
        if (item && item.index != undefined && item.index < reqarr.length) {
          toSendIdx.push(item.index);
          item = getNextFromTimers(curtime);
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

  // Сформировать очередь на генерацию
  function formTimers() {
    const curtime = Date.now();
    timers = [];
    timers.push({ index: 1, qtime: curtime + reqarr[0].tick });
    for (var i = 0; i < reqarr.length; i++) {
      insertTimer({ index: i, qtime: 0 }, curtime);
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

  // Получить элемент из очереди на генерацию. Очередь упорядочена по qtime
  function getNextFromTimers(curtime) {
    if (timers.length > 0) {
      // const curtime = Date.now();
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

  function formItemWithCommonPeriod(item) {
    item.value = item.desc == 'DI' ? 1 : Number(item.min);
    item.random = item.random || 0;
    item.min = Number(item.min);
    item.max = Number(item.max);
    item.tick = commonperiod;
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

  plugin.onChange('channels', () => {
    plugin.log('Channels has been updated. Restart');
    plugin.exit(0);
  });
};
