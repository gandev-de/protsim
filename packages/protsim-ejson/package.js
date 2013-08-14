Package.describe({
  summary: 'protsim custom ejson types'
});

Package.on_use(function(api) {
	api.use([
		'ejson',
		'underscore'
	], ['client', 'server']);

	api.add_files([
		'interface.js',
		'telegram.js',
		'conversation.js',
		'protocol.js']);

	api.export([
		'Interface',
		'Telegram',
		'Conversation',
		'Protocol'
	], ['client', 'server']);
});