#!/usr/bin/env node

'use strict';

const Info = require('../package');
const DIR_SERVER = '../server/';

const {promisify} = require('util');
const wraptile = require('wraptile');

const exit = require(DIR_SERVER + 'exit');
const config = require(DIR_SERVER + 'config');
const env = require(DIR_SERVER + 'env');
const prefixer = require(DIR_SERVER + '/prefixer');

const noop = () => {};

const choose = (a, b) => {
    if (a === undefined)
        return b;
    
    return a;
};

const argv = process.argv;
const args = require('minimist')(argv.slice(2), {
    string: [
        'name',
        'port',
        'password',
        'username',
        'config',
        'editor',
        'packer',
        'root',
        'prefix',
        'terminal-path',
        'terminal-command',
        'columns',
        'import-url',
        'import-token',
        'export-token',
    ],
    boolean: [
        'auth',
        'repl',
        'save',
        'server',
        'online',
        'open',
        'progress',
        'config-dialog',
        'console',
        'sync-console-path',
        'contact',
        'terminal',
        'terminal-auto-restart',
        'one-file-panel',
        'confirm-copy',
        'confirm-move',
        'show-config',
        'show-file-name',
        'vim',
        'keys-panel',
        'color',
        'export',
        'import',
        'import-listen',
        'log',
    ],
    default: {
        server      : true,
        name        : choose(env('name'), config('name')),
        auth        : choose(env.bool('auth'), config('auth')),
        port        : config('port'),
        online      : config('online'),
        open        : config('open'),
        editor      : env('editor') || config('editor'),
        packer      : config('packer') || 'tar',
        zip         : config('zip'),
        username    : env('username') || config('username'),
        root        : choose(env('root'), config('root')),
        prefix      : config('prefix'),
        progress    : config('progress'),
        console     : choose(env.bool('console'), config('console')),
        contact     : choose(env.bool('contact'), config('contact')),
        terminal    : choose(env.bool('terminal'), config('terminal')),
        columns     : env('columns') || config('columns') || '',
        vim         : choose(env.bool('vim'), config('vim')),
        log         : config('log'),
        
        'import-url': env('import_url') || config('importUrl'),
        'import-listen': choose(env.bool('import_listen'), config('importListen')),
        import      : choose(env.bool('import'), config('import')),
        export      : choose(env.bool('export'), config('export')),
        
        'show-file-name': choose(env.bool('show_file_name'), config('showFileName')),
        'sync-console-path': choose(env.bool('sync_console_path'), config('syncConsolePath')),
        'config-dialog': choose(env.bool('config_dialog'), config('configDialog')),
        'terminal-path': env('terminal_path') || config('terminalPath'),
        'terminal-command': env('terminal_command') || config('terminalCommand'),
        'terminal-auto-restart': choose(env.bool('terminal_auto_restart'), config('terminalAutoRestart')),
        'one-file-panel': choose(env.bool('one_file_panel'), config('oneFilePanel')),
        'confirm-copy': choose(env.bool('confirm_copy'), config('confirmCopy')),
        'confirm-move': choose(env.bool('confirm_move'), config('confirmMove')),
        'keys-panel': env.bool('keys_panel') || config('keysPanel'),
        'import-token': env('import_token') || config('importToken'),
        'export-token': env('export_token') || config('exportToken'),
    },
    alias: {
        v: 'version',
        h: 'help',
        p: 'password',
        o: 'online',
        u: 'username',
        s: 'save',
        a: 'auth',
        c: 'config'
    },
    unknown: (cmd) => {
        exit('\'%s\' is not a cloudcmd option. See \'cloudcmd --help\'.', cmd);
    }
});

if (args.version)
    version();
else if (args.help)
    help();
else
    main();

function main() {
    if (args.repl)
        repl();
    
    checkUpdate();
    port(args.port);
    
    config('name', args.name);
    config('auth', args.auth);
    config('online', args.online);
    config('open', args.open);
    config('username', args.username);
    config('progress', args.progress);
    config('console', args.console);
    config('syncConsolePath', args['sync-console-path']);
    config('showFileName', args['show-file-name']);
    config('contact', args.contact);
    config('terminal', args.terminal);
    config('terminalPath', args['terminal-path']);
    config('terminalCommand', args['terminal-command']);
    config('terminalAutoRestart', args['terminal-auto-restart']);
    config('editor', args.editor);
    config('prefix', prefixer(args.prefix));
    config('root', args.root);
    config('vim', args.vim);
    config('columns', args.columns);
    config('log', args.log);
    config('confirmCopy', args['confirm-copy']);
    config('confirmMove', args['confirm-move']);
    config('oneFilePanel', args['one-file-panel']);
    config('configDialog', args['config-dialog']);
    config('keysPanel', args['keys-panel']);
    config('export', args.export);
    config('exportToken', args['export-token']);
    config('import', args.import);
    config('importToken', args['import-token']);
    config('importListen', args['import-listen']);
    config('importUrl', args['import-url']);
    
    readConfig(args.config);
    
    const options = {
        root: args.root || '/', /* --no-root */
        editor: args.editor,
        packer: args.packer,
        prefix: args.prefix || '', /* --no-prefix */
        columns: args.columns,
    };
    
    const password = env('password') || args.password;
    
    if (password)
        config('password', getPassword(password));
    
    validateRoot(options.root);
    
    if (args['show-config'])
        showConfig();
    
    const startWraped = wraptile(start, options);
    const distribute = require('../server/distribute');
    const importConfig = promisify(distribute.import);
    const caller = (fn) => fn();
    
    importConfig()
        .then(args.save ? caller(config.save) : noop)
        .then(startWraped(options));
}

function validateRoot(root) {
    const validate = require(DIR_SERVER + 'validate');
    validate.root(root, console.log);
}

function getPassword(password) {
    const criton = require('criton');
    return criton(password, config('algo'));
}

function version() {
    console.log('v' + Info.version);
}

function start(config) {
    const SERVER = DIR_SERVER + 'server';
    
    if (args.server)
        require(SERVER)(config);
}

function port(arg) {
    const number = parseInt(arg, 10);
    
    if (!isNaN(number))
        return config('port', number);
    
    exit('cloudcmd --port: should be a number');
}

function showConfig() {
    const show = require('../server/show-config');
    const data = show(config('*'));
    
    console.log(data);
}

function readConfig(name) {
    if (!name)
        return;
    
    const fs = require('fs');
    const tryCatch = require('try-catch');
    const jju = require('jju');
    const forEachKey = require('for-each-key');
    
    const readjsonSync = (name) => jju.parse(fs.readFileSync(name, 'utf8'), {
        mode: 'json'
    });
    
    const [error, data] = tryCatch(readjsonSync, name);
    
    if (error)
        return exit(error.message);
    
    forEachKey(config, data);
}

function help() {
    const bin = require('../json/help');
    const forEachKey = require('for-each-key');
    const currify = require('currify');
    const usage = 'Usage: cloudcmd [options]';
    const url = Info.homepage;
    const log = currify((a, b, c) => console.log(a, b, c));
    
    console.log(usage);
    console.log('Options:');
    forEachKey(log('  %s %s'), bin);
    console.log('\nGeneral help using Cloud Commander: <%s>', url);
}

function repl() {
    console.log('REPL mode enabled (telnet localhost 1337)');
    require(DIR_SERVER + 'repl');
}

function checkUpdate() {
    const load = require('package-json');
    
    load(Info.name, 'latest')
        .then(showUpdateInfo)
        .catch(noop);
}

function showUpdateInfo(data) {
    const version = data.version;
    
    if (version === Info.version)
        return;
    
    const chalk = require('chalk');
    
    const latestVersion = chalk.green.bold('v' + version);
    const latest = `update available: ${latestVersion}`;
    const current = chalk.dim(`(current: v${Info.version})`);
    
    console.log('%s %s', latest, current);
}

