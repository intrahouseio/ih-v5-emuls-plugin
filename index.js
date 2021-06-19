/**
 * emuls.js
 */
const util = require('util');

const plugin = require('ih-plugin-api')();
const app = require('./app');

(async () => {
  plugin.log('Emulator has started.', 0);

  try {
    plugin.params = await plugin.params.get();
    plugin.log('Received params...');

    plugin.channels = await plugin.channels.get();
    plugin.log('Received channels...');

    app(plugin);
  } catch (err) {
    plugin.exit(8, `Error! Message: ${util.inspect(err)}`);
  }
})();
