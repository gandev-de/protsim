Package.describe({
  summary: "configurable protocol simulation"
});

Package.on_use(function(api) {
  api.use(["ejson", "underscore"], ["client", "server"]);
  api.use(["bootstrap", "templating", "handlebars", "controls"], ["client"]);

  api.add_files(["interface.js", "protocol.js", "telegram.js"], ["client", "server"]);
  api.add_files(["protwatch.js", "protdef.js", "protlog.js"], ["client", "server"]);

  api.add_files(["client/protsim.css", "client/form_enhanced.js"], ["client"]);
  api.add_files(["client/protdef_client.html", "client/protdef_client.js"], ["client"]);
  api.add_files(["client/protwatch_client.html", "client/protwatch_client.js"], ["client"]);
  api.add_files(["client/protlog_client.html", "client/protlog_client.js"], ["client"]);

  //
  api.add_files(["lib/date.js"], ["client", "server"]);

  //sample protocol definitions
  //api.add_files(["protocols/modbus.js"], ["server"]);
});

Package.on_test(function(api) {
  api.use('tinytest');
  api.use(["ejson", "underscore"], ["client", "server"]);

  api.add_files(["interface.js", "protocol.js", "telegram.js"], ["client", "server"]);
  api.add_files(["protwatch.js", "protdef.js"], ["client", "server"]);

  api.add_files('protsim_test.js', ['server']);
});