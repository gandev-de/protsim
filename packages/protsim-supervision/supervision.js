var dgram = Npm.require('dgram');
var util = Npm.require('util');
var net = Npm.require('net');
var events = Npm.require('events');
var util = Npm.require('util');

var supervisions = {};

ActiveSupervisions = {
  get: function(protocol) {
    var supervision;
    if(protocol instanceof Protocol) {
      supervision = supervisions[protocol._id];
      if(!supervision) {
        supervision = new ProtocolSupervision(protocol);
        supervisions[protocol._id] = supervision;
      }
    } else {
      supervision = supervisions[protocol];
    }

    if(!supervision) {
      throw new Error("supervision with id: " + protocol + "  not found");
    }

    return supervision;
  }
};

ProtocolSupervision = function(protocol) {
  var self = this;
  self.protocol = protocol;
  self.send_iface_content = {active: false, count: 0};
  self.recv_iface_content = {active: false, count: 0};
  self.conversation_state = {};
};

ProtocolSupervision.prototype = Object.create(events.EventEmitter.prototype);

ProtocolSupervision.prototype._newTelegram = function(msg, direction) {
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

ProtocolSupervision.prototype._assignConnection = function(conn, direction) {
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

ProtocolSupervision.prototype.createConnection = function(iface, direction_send) {
  var self = this;
  var transport = iface.transport;
  var direction_recv = direction_send == "pi" ? "ip" : "rp";
  Log.info("create connection type: " + transport.type);
  var conn;
  switch (transport.type) {
    case "udp":
      var udp = dgram.createSocket("udp4");
      udp.bind(transport.local_port, transport.local_ip);
      udp.on("message", function(msg, rinfo) {
        Log.info("udp message received: " + msg.toString());
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
          Log.info('client connected');
          conn = tcp;
          self._assignConnection(conn, direction_send);
        });

        tcp.on('end', function() {
          Log.info('client disconnected');
        });

        tcp.on("data", function(msg) {
          Log.info("tcp message received: " + msg.toString());
          self._newTelegram(msg, direction_recv);
        });
      } else if(transport.mode == "server") {
        tcp = net.createServer(function(c) {
          //'connection' listener
          Log.info('server connected');

          c.on('end', function() {
            Log.info('server disconnected');
          });

          c.on('data', function(msg) {
            Log.info("tcp message received: " + msg.toString());
            self._newTelegram(msg, direction_recv);
          });
          conn = c;
          self._assignConnection(conn, direction_send);
        });

        tcp.listen(transport.local_port, function() {
          //'listening' listener
          Log.info('server bound');
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

ProtocolSupervision.prototype.closeConnection = function(direction) {
  var self = this;
  var transport = direction == "pi" ? self.protocol.recv_interface.transport: self.protocol.send_interface.transport;
  var conn = direction == "pi" ? self.recv_connection: self.send_connection;
  Log.info("close connection type: " + transport.type);
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

ProtocolSupervision.prototype.startWatch = function(direction) {
  var self = this;
  var iface = direction == "pi" ? self.protocol.recv_interface : self.protocol.send_interface;
  //TODO check for existing connections
  self.createConnection(iface, direction);
  Log.info("start watch..id: ", self.protocol._id);
};

ProtocolSupervision.prototype.stopWatch = function(direction) {
  var self = this;

  self.closeConnection(direction);
  Log.info("stop watch..protocol: ", self.protocol._id);
};

ProtocolSupervision.prototype.startConversation = function(conversation) {
  var self = this;
  self.current_conversation = conversation;
  var sequence = conversation.sequence;

  self.conversation_state = {
    name: self.current_conversation.name,
    state: Conversation.ACTIVE,
    sequence_idx: 0
  };
  Log.info("start conversation: ", conversation.name);

  self._conversationProgress();
};

ProtocolSupervision.prototype._conversationProgress = function(telegram_received, direction_received) {
  var self = this;
  var sequence = self.current_conversation.sequence;
  var telegram_obj_in_sequence = sequence[self.conversation_state.sequence_idx];

  //Skip progress if conversation not running
  if(self.conversation_state.state != Conversation.ACTIVE) {
    return;
  }

  Log.info("update active conversation..");

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

ProtocolSupervision.prototype.sendMessage = function(msg, direction, telegram) {
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

      Log.info("message sended: " + msg.toString());
      break;
    case "tcp":
      conn.write(msg.toString());

      if(self.logging_active && addLogEntry) {
        addLogEntry(self.protocol._id, telegram, msg.toString(), direction);
      }

      Log.info("message sended: " + msg.toString());
      break;
    default:
      //TODO
  }
};