Protocol = function(options) {
  options = options || {};
  this._id = options._id;
  this.name = options.name || "udp1";
  this.interface = options.interface || new Interface();
  this.telegrams = options.telegrams || [new Telegram()];
  this.conversations = options.conversations || [{
    name: "default-conversation",
    conversation: [
    // {
    //     type: "send",
    //     telegram: new Telegram(),
    //     idx: 0
    //   },{
    //     type: "receive",
    //     telegram: new Telegram(),
    //     idx: 1
    // }
    ]
  }];
};

Protocol.fromJSONValue = function(value) {
  return new Protocol({
    _id: value._id,
    name: value.name,
    interface: EJSON.fromJSONValue(value.interface),
    telegrams: EJSON.fromJSONValue(value.telegrams),
    conversations: value.conversations
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
    return conversation;
  },

  findConversationTelegramByIdx: function(conversation_name, idx) {
    if(!conversation_name) return;

    var protocol = this;
    var conversations = protocol.conversations;
    var conversation = _.find(conversations, function(conv) {
      return conv.name === conversation_name;
    });

    if(!conversation) return;

    var telegram_obj = _.find(conversation.conversation, function(tel) {
      return tel.idx === idx;
    });

    if(!telegram_obj) return;

    return telegram_obj.telegram;
  },

  typeName: function() {
    return "Protocol";
  },

  equals: function(other) {
    return this._id == other._id &&
      this.name == other.name &&
      this.interface.equals(other.interface) &&
      _.isEqual(this.telegrams, other.telegrams) &&
      _.isEqual(this.conversations, other.conversations);
  },

  clone: function() {
    return new Protocol({
      _id: this._id,
      name: this.name,
      interface: this.interface,
      telegrams: this.telegrams,
      conversations: this.conversations
    });
  },

  toJSONValue: function() {
    return {
      _id: this._id,
      name: this.name,
      interface: EJSON.toJSONValue(this.interface),
      telegrams: EJSON.toJSONValue(this.telegrams),
      conversations: this.conversations
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