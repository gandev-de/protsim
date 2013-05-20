Package.describe({
	summary: "configurable protocol simulation"
});

Package.on_use(function (api) {
	api.use(["ejson", "underscore"], ["client", "server"]);
  api.use(["bootstrap", "templating"], ["client"]);

  api.add_files(["interface.js", "protocol.js", "telegram.js"], ["client", "server"]);
  api.add_files(["protwatch.js", "protdef.js"], ["client", "server"]);

  api.add_files(["client/protsim.css"], ["client"]);
  api.add_files(["client/protdef_client.html", "client/protdef_client.js"], ["client"]);
  api.add_files(["client/protwatch_client.html", "client/protwatch_client.js"], ["client"]);
});

Package.on_test(function (api) {
  api.use('tinytest');
  api.use(["ejson", "underscore"], ["client", "server"]);

  api.add_files(["interface.js", "protocol.js", "telegram.js"], ["client", "server"]);
  api.add_files(["protwatch.js", "protdef.js"], ["client", "server"]);

  api.add_files('protdef_server_test.js', ['server']);
  api.add_files('protdef_client_test.js', ['client']);
});