Package.describe({
	summary: "Protsim server implementation"
});

Package.on_use(function(api) {
	api.use(['logging', 'underscore', 'protsim-ejson'], ['client', 'server']);

	api.add_files(['supervision.js'], 'server');

	api.export(['ProtocolSupervision', 'ActiveSupervisions'], 'server');
});