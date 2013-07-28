Protocol = function(options) {
  options = options || {};
  this._id = options._id;
  this.name = options.name || "udp1";
  this.send_interface = options.send_interface || new Interface();
  this.recv_interface = options.recv_interface || new Interface();
  this.telegrams = options.telegrams || [new Telegram()];
  this.conversations = options.conversations || [new Conversation()];
};

Protocol.fromJSONValue = function(value) {
  var telegrams = [];
  _.each(value.telegrams, function(telegram_json) {
    telegrams.push(Telegram.fromJSONValue(telegram_json));
  });

  var conversations = [];
  _.each(value.conversations, function(conversation_json) {
    conversations.push(Conversation.fromJSONValue(conversation_json));
  });

  return new Protocol({
    _id: value._id,
    name: value.name,
    send_interface: Interface.fromJSONValue(value.send_interface),
    recv_interface: Interface.fromJSONValue(value.recv_interface),
    telegrams: telegrams,
    conversations: conversations
  });
};

Protocol.prototype = {
  constructor: Protocol,

  findTelegramById: function(telegram_id) {
    var protocol = this;
    var telegrams = protocol.telegrams;
    var telegram = _.find(telegrams, function(tel) {
      return tel._id === telegram_id;
    });
    return telegram || new Telegram();
  },

  findConversationByName: function(conversation_name) {
    var protocol = this;
    var conversations = protocol.conversations;
    var conversation = _.find(conversations, function(conv) {
      return conv.name === conversation_name;
    });
    return conversation || new Conversation();
  },

  typeName: function() {
    return "Protocol";
  },

  equals: function(other) {
    return this._id == other._id &&
      this.name == other.name &&
      this.send_interface.equals(other.send_interface) &&
      this.recv_interface.equals(other.recv_interface) &&
      _.isEqual(this.telegrams, other.telegrams) &&
      _.isEqual(this.conversations, other.conversations);
  },

  clone: function() {
    return new Protocol({
      _id: this._id,
      name: this.name,
      send_interface: this.send_interface,
      recv_interface: this.recv_interface,
      telegrams: this.telegrams,
      conversations: this.conversations
    });
  },

  toJSONValue: function() {
    var telegrams_json = [];
    _.each(this.telegrams, function(telegram) {
      var telegram_json = telegram.toJSONValue();
      telegrams_json.push(telegram_json);
    });

    var conversations_json = [];
    _.each(this.conversations, function(conversation) {
      var conversation_json = conversation.toJSONValue();
      conversations_json.push(conversation_json);
    });

    return {
      _id: this._id,
      name: this.name,
      send_interface: this.send_interface.toJSONValue(),
      recv_interface: this.recv_interface.toJSONValue(),
      telegrams: telegrams_json,
      conversations: conversations_json
    };
  }
};

EJSON.addType("Protocol", Protocol.fromJSONValue);

if(Meteor.isServer) {
  _.extend(Protocol.prototype, {
      findTelegramByMessage: function(msg) {
        var protocol = this;
        var telegrams = protocol.telegrams;
        var telegram = _.find(telegrams, function(telegram) {
          var telegram_identifier = [];
          var values_expected = {};
          _.each(telegram.values, function(value) {
            if(value.ident_val && value.identifier) {
              telegram_identifier.push(value);
              values_expected[value.offset] = value.identifier;
            }
          });
          if(telegram_identifier.length === 0) return false;

          var values_received = {};
          _.each(telegram_identifier, function(value) {
            values_received[value.offset] = telegram.valueFromBuffer(msg, value);
          });

          return _.isEqual(values_expected, values_received);
        });
        return telegram || new Telegram();
      }
  });
}