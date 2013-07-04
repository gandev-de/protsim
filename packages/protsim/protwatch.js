if (Meteor.isClient) {
  Protwatch = new Meteor.Collection("protwatch");

  //Deps.autorun(function() {
  Meteor.subscribe("protwatch");
  //});
}

if (Meteor.isServer) {
  var dgram = Npm.require("dgram");
  var util = Npm.require('util');
  var net = Npm.require('net');

  Protwatchs = {
    pub: undefined
  };

  ProtocolWatch = function(pub, protocol, watch_id) {
    var self = this;
    self.pub = pub;
    self.protocol = protocol;

    //observe protdef changes
    self.protdef_handle = Protocols.find({_id: protocol._id}).observeChanges({
      changed: function(id, fields) {
        if(fields.telegrams) {
          for (var i = 0; i < fields.telegrams.length; i++) {
            var telegram_json = fields.telegrams[i];
            var telegram = Telegram.fromJSONValue(telegram_json);
            self.protocol.telegrams[i] = telegram;
          }
        }
        //TODO update send_interface
        console.log("update watched protocol:", id);
      }
    });

    self.watch_id = watch_id || protocol._id;
    self.telegram_counter = 0;
  };

  ProtocolWatch.prototype.new_telegram = function(msg, direction) {
    var self = this;
    //identify telegram type
    var telegram = self.protocol.findTelegramByMessage(msg);
    if (telegram instanceof Telegram) {
      telegram.values = telegram.convertFromBuffer(msg);
      console.log("change..sub: ", self.pub._session.id);
      var msg_raw = msg.toString();
      //change subscription
      var new_content = {
        count: ++self.telegram_counter,
        raw: msg_raw,
        value: telegram,
        direction: direction
      };

      if(self.logging_active && addLogEntry) {
        addLogEntry(self.watch_id, telegram, msg_raw, direction);
      }

      self.pub.changed("protwatch", self.watch_id, new_content);
      //save last telegram for new subscriptions
      if(direction == "pi") {
        self.last_recv_content = new_content;
      } else {
        self.last_send_content = new_content;
      }
    }
  };

  ProtocolWatch.prototype.createConnection = function(iface, direction) {
    var self = this;
    var transport = iface.transport;
    console.log("create connection type: " + transport.type);
    var conn;
    switch (transport.type) {
      case "udp":
        var udp = dgram.createSocket("udp4");
        udp.bind(transport.local_port, transport.local_ip);
        udp.on("message", function(msg, rinfo) {
          console.log("udp message received: " + msg.toString());
          self.new_telegram(msg);
        });
        conn = udp;
        break;
      case "tcp":
        var tcp;
        if (transport.mode == "client") {
          tcp = net.connect({port: transport.remote_port,
            host: transport.remote_ip}, function() {
            //'connect' listener TODO
            console.log('client connected');
            conn = tcp;
          });

          tcp.on('end', function() {
            console.log('client disconnected');
          });

          tcp.on("data", function(msg) {
            console.log("tcp message received: " + msg.toString());
            self.new_telegram(msg, direction);
          });
        } else if(transport.mode == "server") {
          tcp = net.createServer(function(c) {
            //'connection' listener
            console.log('server connected');

            c.on('end', function() {
              console.log('server disconnected');
            });

            c.on('data', function(msg) {
              console.log("tcp message received: " + msg.toString());
              self.new_telegram(msg, direction);
            });
            conn = c;
          });

          tcp.listen(transport.local_port, function() {
            //'listening' listener
            console.log('server bound');
          });

          if(direction == "pi") {
            self.recv_server = tcp;
          } else {
            self.send_server = tcp;
          }
        }
        break;
      default:
        //TODO
    }

    if(direction == "pi") {
      self.recv_connection = conn;
    } else {
      self.send_connection = conn;
    }
  };

  ProtocolWatch.prototype.closeConnection = function(direction) {
    var self = this;
    var transport = direction == "pi" ? self.protocol.recv_interface.transport: self.protocol.send_interface.transport;
    var conn = direction == "pi" ? self.recv_connection: self.send_connection;
    console.log("close connection type: " + transport.type);
    switch (transport.type) {
      case "udp":
        if (conn && conn._bound) conn.close();
        break;
      case "tcp":
        if (transport.mode == "server" && conn) {
          conn.end();
          if(direction == "pi") {
            self.recv_server.close();
          } else {
            self.send_server.close();
          }
        } else if (transport.mode == "client" && conn) {
          conn.end();
        }
        break;
      default:
        //TODO
    }
  };

  ProtocolWatch.prototype.publish = function() {
    var self = this;
    console.log("initial publish..sub: ", self.pub._session.id);

    //add new watch to subscription //TODO !!! send receive data
    self.pub.added("protwatch", self.watch_id, self.last_recv_content);
    self.pub.added("protwatch", self.watch_id, self.last_send_content);

    self.pub.ready();
  };

  ProtocolWatch.prototype.stopWatch = function(direction) {
    var self = this;
    self.protdef_handle.stop(); //stop observing protdef changes

    console.log("stop watch..sub: ", self.pub._session.id);

    self.closeConnection(direction);
    //remove watch from subscription //TODO direction specific
    self.pub.removed("protwatch", self.watch_id);
  };

  //**********************************************************************************

  //Receive

  //watch_id currently always should be the protocol id
  var start_watch = function(watch_id, protocol, direction) {
    console.log("start watch..id: ", watch_id, "..sub:", Protwatchs.pub._session.id);
    var iface = direction == "pi" ? protocol.recv_interface : protocol.send_interface;

    var new_watch = true;
    var watch;
    if (Protwatchs[watch_id]) {
      new_watch = false;
      watch = Protwatchs[watch_id];
    }

    var init_watch = function() {
      watch = new ProtocolWatch(Protwatchs.pub, protocol, watch_id);
      watch.createConnection(iface, direction);
    };

    if (new_watch) {
      init_watch();
      watch.publish();
    } else {
      watch.createConnection(iface, direction);
    }

    Protwatchs[watch_id] = watch;
  };

  var end_watch = function(watch_id, direction) {
    if (Protwatchs[watch_id] instanceof ProtocolWatch) {
      Protwatchs[watch_id].stopWatch(direction);
    }
    delete Protwatchs[watch_id];
  };

  //publish watch changes
  Meteor.publish("protwatch", function() {
    var self = this;

    if (Protwatchs.pub) {
      Protwatchs.pub.stop();
    }
    Protwatchs.pub = self;

    for (var watch in Protwatchs) {
      if (Protwatchs[watch] instanceof ProtocolWatch) {
        Protwatchs[watch].pub = self;
        Protwatchs[watch].publish();
      }
    }

    self.onStop(function() {
      console.log("subscription stopped..sub: ", self._session.id);
    });
    console.log("subscription started..sub: ", self._session.id);
  });

  //**********************************************************************************

  //Send

  var sendMessage = function(watch_id, msg, telegram, direction) {
    var watch = Protwatchs[watch_id];
    var iface = direction == "pi" ? watch.protocol.recv_interface : watch.protocol.send_interface;
    if (watch.protocol && iface && watch.connection) {
      var conn = watch.connection;

      var transport = iface.transport;
      switch (transport.type) {
        case "udp":
          conn.send(msg, 0, msg.length, transport.remote_port, transport.remote_ip);

          if(watch.logging_active && addLogEntry) {
            addLogEntry(watch_id, telegram, msg.toString());
          }

          console.log("message sended: " + msg.toString());
          break;
        case "tcp":
          conn.write(msg.toString());

          if(watch.logging_active && addLogEntry) {
            addLogEntry(watch_id, telegram, msg.toString());
          }

          console.log("message sended: " + msg.toString());
          break;
        default:
          //TODO
      }
    }
  };

  Meteor.methods({
    sendTelegram: function(watch_id, telegram, options) {
      options = options || {};
      var count = options.count || 1;
      if (telegram instanceof Telegram) {
        sendMessage(watch_id, telegram.convertToBuffer(), telegram);
      } else {
        if (count > 0 && count <= 1000) {
          for (var i = 0; i < count; i++) {
            sendMessage(watch_id, new Buffer(telegram));
          }
        }
      }
    },

    startWatch: function(watch_id, protocol, direction) {
      if (protocol instanceof Protocol) {
        start_watch(watch_id, protocol, direction);
      }
    },

    endWatch: function(watch_id) {
      end_watch(watch_id);
    },

    updateTelegramValueHistory: function(protocol_id, telegram_id, value_history) {
      Protocols.update({
        _id: protocol_id,
        'telegrams._id': telegram_id
      }, {
        '$set': {
          'telegrams.$.value_history': value_history
        }
      });
      console.log("telegram history updated: ", telegram_id);
    },

    updateProtocolConversation: function(protocol_id, conversation) {
      conversation.conversation = Protocol.updateConversationIdx(conversation.conversation);
      Protocols.update({
        _id: protocol_id,
        'conversations.name': conversation.name
      }, {
        '$set': {
          'conversations.$.conversation': conversation.conversation
        }
      });
      console.log("conversation updated: ", conversation.name);
    }
  });
}
