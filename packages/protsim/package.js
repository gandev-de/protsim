Package.describe({
	summary: "configurable protocol simulation"
});

Package.on_use(function (api) {
	api.use(["ejson", "underscore"], ["client", "server"]);

  api.add_files(["interface.js", "protocol.js", "telegram.js", "protdef.js"], ["client", "server"]);
  api.add_files(["protwatch.js"], ["server"]);
});

Package.on_test(function (api) {
  api.use('tinytest');
  api.use(["ejson", "underscore"], ["client", "server"]);

  api.add_files(["interface.js", "protocol.js", "telegram.js", "protdef.js"], ["client", "server"]);
  api.add_files(["protwatch.js"], ["server"]);

  api.add_files('protdef_server_test.js', ['server']);
  api.add_files('protdef_client_test.js', ['client']);
});