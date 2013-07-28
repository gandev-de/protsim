Protwatch = new Meteor.Collection("protwatch", {
  transform: function(coll) {
    if(Match.test(coll.send, String)) {
      coll.send = EJSON.parse(coll.send);
    }
    if(Match.test(coll.recv, String)) {
      coll.recv = EJSON.parse(coll.recv);
    }
    if(Match.test(coll.conversation_state, String)) {
      coll.conversation_state = EJSON.parse(coll.conversation_state);
    }
    return coll;
  }
});

if (Meteor.isClient) {
  Deps.autorun(function() {
    var protocol = Protdef.findOne({_id: Session.get("protocol_selected")});
    if(protocol) {
      Meteor.subscribe("protwatch", protocol);
    }
  });
}

if (Meteor.isServer) {
  var dgram = Npm.require("dgram");
  var util = Npm.require('util');
  var net = Npm.require('net');
  var events = Npm.require('events');
  var util = Npm.require('util');

  Protwatchs = {};

  ProtocolWatch = function(protocol) {
    var self = this;
    self.protocol = protocol;
    //observe protdef changes
    self.protdef_handle = Protdef.find({_id: protocol._id}).observeChanges({
      changed: function(id, fields) {
        if(fields.telegrams) {
          for (var i = 0; i < fields.telegrams.length; i++) {
            var telegram_json = fields.telegrams[i];
            var telegram = Telegram.fromJSONValue(telegram_json);
            self.protocol.telegrams[i] = telegram;
          }
        }
        //TODO update interfaces

        //TODO why is changed periodically called with identically conversations

        console.log("update watched protocol:", id);
      }
    });
    self.send_iface_content = {active: false, count: 0};
    self.recv_iface_content = {active: false, count: 0};
    self.conversation_state = {};
  };

  ProtocolWatch.prototype = new events.EventEmitter();

  ProtocolWatch.prototype._newTelegram = function(msg, direction) {
    var self = this;
    //identify telegram type
    var telegram = self.protocol.findTelegramByMessage(msg);
    if (telegram instanceof Telegram) {
      telegram.values = telegram.convertFromBuffer(msg);
      var msg_raw = msg.toString();

      self.send_iface_content.count = direction == "rp" ? ++self.send_iface_content.count: self.send_iface_content.count;
      self.send_iface_content.raw = direction == "rp" ? msg_raw: self.send_iface_content.raw;
      self.send_iface_content.value = direction == "rp" ? telegram: self.send_iface_content.value;

      self.recv_iface_content.count = direction == "ip" ? ++self.recv_iface_content.count: self.recv_iface_content.count;
      self.recv_iface_content.raw = direction == "ip" ? msg_raw: self.recv_iface_content.raw;
      self.recv_iface_content.value = direction == "ip" ? telegram: self.recv_iface_content.value;

      //write log entry if logging active
      if(self.logging_active && addLogEntry) {
        addLogEntry(self.protocol._id, telegram, msg_raw, direction, self.conversation_state);
      }

      //update conversation progress if any
      if(self.current_conversation) {
        self._conversationProgress(telegram, direction);
      }

      self.emit('change');
    }
  };

  ProtocolWatch.prototype._assignConnection = function(conn, direction) {
    var self = this;
    if(direction == "pi") {
      self.recv_connection = conn;
      self.recv_iface_content.active = true;
    } else {
      self.send_connection = conn;
      self.send_iface_content.active = true;
    }

    self.emit('change');
  };

  ProtocolWatch.prototype.createConnection = function(iface, direction_send) {
    var self = this;
    var transport = iface.transport;
    var direction_recv = direction_send == "pi" ? "ip" : "rp";
    console.log("create connection type: " + transport.type);
    var conn;
    switch (transport.type) {
      case "udp":
        var udp = dgram.createSocket("udp4");
        udp.bind(transport.local_port, transport.local_ip);
        udp.on("message", function(msg, rinfo) {
          console.log("udp message received: " + msg.toString());
          self._newTelegram(msg, direction_recv);
        });
        conn = udp;
        self._assignConnection(conn, direction_send);
        break;
      case "tcp":
        var tcp;
        if (transport.mode == "client") {
          tcp = net.connect({port: transport.remote_port,
            host: transport.remote_ip}, function() {
            //'connect' listener TODO
            console.log('client connected');
            conn = tcp;
            self._assignConnection(conn, direction_send);
          });

          tcp.on('end', function() {
            console.log('client disconnected');
          });

          tcp.on("data", function(msg) {
            console.log("tcp message received: " + msg.toString());
            self._newTelegram(msg, direction_recv);
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
              self._newTelegram(msg, direction_recv);
            });
            conn = c;
            self._assignConnection(conn, direction_send);
          });

          tcp.listen(transport.local_port, function() {
            //'listening' listener
            console.log('server bound');
          });

          if(direction_send == "pi") {
            self.recv_server = tcp;
          } else {
            self.send_server = tcp;
          }
        }
        break;
      default:
        //TODO
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

    if(direction === "pi") {
      self.recv_iface_content.active = false;
    } else {
      self.send_iface_content.active = false;
    }

    self.emit("change");
  };

  ProtocolWatch.prototype.startWatch = function(direction) {
    var self = this;
    var iface = direction == "pi" ? self.protocol.recv_interface : self.protocol.send_interface;
    //TODO check for existing connections
    self.createConnection(iface, direction);
    console.log("start watch..id: ", self.protocol._id);
  };

  ProtocolWatch.prototype.stopWatch = function(direction) {
    var self = this;
    //self.protdef_handle.stop(); //TODO stop observing protdef changes

    self.closeConnection(direction);
    console.log("stop watch..protocol: ", self.protocol._id);
  };

  ProtocolWatch.prototype.startConversation = function(conversation) {
    var self = this;
    self.current_conversation = conversation;
    var sequence = conversation.sequence;

    self.conversation_state = {
      name: self.current_conversation.name,
      state: Conversation.ACTIVE,
      sequence_idx: 0
    };
    console.log("start conversation: ", conversation.name);

    self._conversationProgress();
  };

  ProtocolWatch.prototype._conversationProgress = function(telegram_received, direction_received) {
    var self = this;
    var sequence = self.current_conversation.sequence;
    var telegram_obj_in_sequence = sequence[self.conversation_state.sequence_idx];

    //Skip progress if conversation not running
    if(self.conversation_state.state != Conversation.ACTIVE) {
      return;
    }

    console.log("update active conversation..");

    if(!telegram_received ||
      telegram_received.equals(telegram_obj_in_sequence.telegram) &&
      telegram_received.direction == direction_received) {

      //progress conversation by sending messages if configured and 
      //conversation just started or received message equals expected message
      for(var i = self.conversation_state.sequence_idx; i < sequence.length; i++) {
        if(telegram_obj_in_sequence.direction.substr(0, 1) == "p") {
            self.sendMessage(telegram_obj_in_sequence.telegram.convertToBuffer(),
              telegram_obj_in_sequence.direction,
              telegram_obj_in_sequence.telegram);

            if(self.conversation_state.sequence_idx + 1 >= sequence.length) {
              self.conversation_state.state = Conversation.ENDED;
            } else {
              self.conversation_state.sequence_idx++;
            }

            self.emit("change");
        } else {
          //exit sending loop if next message is to receive
          break;
        }
      }
    }
  };

  ProtocolWatch.prototype.sendMessage = function(msg, direction, telegram) {
    var self = this;
    var iface = direction == "pi" ? self.protocol.recv_interface : self.protocol.send_interface;
    var conn = direction == "pi" ? self.recv_connection : self.send_connection;
    var transport = iface.transport;
    switch (transport.type) {
      case "udp":
        conn.send(msg, 0, msg.length, transport.remote_port, transport.remote_ip);

        if(self.logging_active && addLogEntry) {
          addLogEntry(self.protocol._id, telegram, msg.toString(), direction);
        }

        console.log("message sended: " + msg.toString());
        break;
      case "tcp":
        conn.write(msg.toString());

        if(self.logging_active && addLogEntry) {
          addLogEntry(self.protocol._id, telegram, msg.toString(), direction);
        }

        console.log("message sended: " + msg.toString());
        break;
      default:
        //TODO
    }
  };

  //**********************************************************************************

  //publish watch changes
  Meteor.publish("protwatch", function(protocol) {
    var pub = this;

    if(!protocol instanceof Protocol) return;

    var watch = Protwatchs[protocol._id];
    if(!watch) {
      watch = new ProtocolWatch(protocol);
      Protwatchs[protocol._id] = watch;
    }

    var content = function() {
      return {
        send: EJSON.stringify(watch.send_iface_content),
        recv: EJSON.stringify(watch.recv_iface_content),
        conversation_state: EJSON.stringify(watch.conversation_state)
      };
    };

    pub.added("protwatch", watch.protocol._id, content());
    pub.ready();
    console.log("initial publish..sub: ", pub._session.id);

    var watch_listener = function() {
      pub.changed("protwatch", watch.protocol._id, content());
      console.log("change publish..sub: ", pub._session.id);
    };
    watch.on('change', watch_listener);

    pub.onStop(function() {
      console.log("subscription stopped..sub: ", pub._session.id);
      watch.removeListener("change", watch_listener);
    });
    console.log("subscription started..sub: ", pub._session.id);
  });

  Meteor.methods({
    sendTelegram: function(protocol_id, telegram, options) {
      options = options || {};
      var direction = options.direction || "pr";
      var count = options.count || 1;
      var watch = Protwatchs[protocol_id];
      if (watch && telegram instanceof Telegram) {
        watch.sendMessage(telegram.convertToBuffer(), direction, telegram);
      } else if(watch) {
        if (count > 0 && count <= 1000) {
          for (var i = 0; i < count; i++) {
            watch.sendMessage(new Buffer(telegram), direction);
          }
        }
      }
    },

    startWatch: function(protocol, direction) {
      var watch = Protwatchs[protocol._id];
      if (watch) {
        watch.startWatch(direction);
      }
    },

    endWatch: function(protocol_id, direction) {
      if (Protwatchs[protocol_id] instanceof ProtocolWatch) {
        Protwatchs[protocol_id].stopWatch(direction);
      }
      //TODO delete Protwatchs[protocol_id]; if no connection active?
    },

    //TODO just conversation name as parameter?
    startConversation: function(protocol_id, conversation) {
      var watch = Protwatchs[protocol_id];
      if (watch && conversation instanceof Conversation && conversation.sequence.length > 0) {
        watch.startConversation(conversation);
        return true;
      }
      return false;
    },

    cancelConversation: function(protocol_id) {
      //TODO just conversation name?
      var watch = Protwatchs[protocol_id];
      if (watch && watch.current_conversation) {
        watch.current_conversation = Conversation.CANCELED;
      }
    },

    updateTelegramValueHistory: function(protocol_id, telegram_id, value_history) {
      Protdef.update({
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
      conversation.updateSequenceIdx();
      Protdef.update({
        _id: protocol_id,
        'conversations.name': conversation.name
      }, {
        '$set': {
          'conversations.$.sequence': conversation.sequence
        }
      });
      console.log("conversation updated: ", conversation.name);
    }
  });
}
