/**
 * emuls.js
 */
const util = require('util');

// const plugin = require('ih-plugin-api')();
const app = require('./app');

(async () => {
  let plugin;
  try {
    const opt = getOptFromArgs();
    const pluginapi = opt && opt.pluginapi ? opt.pluginapi : 'ih-plugin-api';
    plugin = require(pluginapi+'/index.js')();

    plugin.log('Emulator has started.', 0);
  
    plugin.params = await plugin.params.get();
    plugin.log('Received params...');

    plugin.channels = await plugin.channels.get();
    plugin.log('Received channels...');

    app(plugin);
  } catch (err) {
    plugin.exit(8, `Error! Message: ${util.inspect(err)}`);
  }
})();

function getOptFromArgs() {
  let opt;
  try {
    opt = JSON.parse(process.argv[2]); //
  } catch (e) {
    opt = {};
  }
  return opt;
}
